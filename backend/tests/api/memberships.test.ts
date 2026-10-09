import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import {
  apiAvailable,
  app,
  closeDb,
  cookieHeader,
  login,
  makePlan,
  makeUser,
  prismaRef,
  resetDb,
} from "./helpers";

const describeApi = apiAvailable ? describe : describe.skip;

describeApi("membership purchase and lifecycle (R1/R2, UC-07/09)", () => {
  let reception: Awaited<ReturnType<typeof makeUser>>;
  let manager: Awaited<ReturnType<typeof makeUser>>;
  let member: Awaited<ReturnType<typeof makeUser>>;
  let plan: Awaited<ReturnType<typeof makePlan>>;
  let receptionCookie: string;
  let managerCookie: string;

  beforeAll(async () => {
    await resetDb();
    reception = await makeUser({ role: Role.RECEPTIONIST });
    manager = await makeUser({ role: Role.MANAGER });
    member = await makeUser({ role: Role.MEMBER, member: true });
    plan = await makePlan({ durationDays: 30, price: 49.99 });
    receptionCookie = await login(reception);
    managerCookie = await login(manager);
  });
  afterAll(async () => {
    await closeDb();
  });

  it("purchase creates a COMPLETED payment, an ACTIVE membership and a notification (R1/R9)", async () => {
    const res = await request(app)
      .post("/api/v1/memberships")
      .set(cookieHeader(receptionCookie))
      .send({ memberId: member.memberId, planId: plan.id, method: "CASH" });

    expect(res.status).toBe(201);
    expect(res.body.data.membership.status).toBe("ACTIVE");
    expect(res.body.data.membership.plan.id).toBe(plan.id);
    expect(res.body.data.payment.status).toBe("COMPLETED");
    expect(Number(res.body.data.payment.amount)).toBe(49.99);
    expect(res.body.data.membership.paymentId).toBe(res.body.data.payment.id);

    const notification = await prismaRef().notification.findFirst({
      where: { userId: member.id, title: "Membership activated" },
    });
    expect(notification).not.toBeNull();
  });

  it("endDate equals startDate + durationDays", async () => {
    const fresh = await makeUser({ role: Role.MEMBER, member: true });
    const res = await request(app)
      .post("/api/v1/memberships")
      .set(cookieHeader(receptionCookie))
      .send({ memberId: fresh.memberId, planId: plan.id, method: "CARD" });
    expect(res.status).toBe(201);
    const start = new Date(res.body.data.membership.startDate);
    const end = new Date(res.body.data.membership.endDate);
    expect(end.getTime() - start.getTime()).toBe(30 * 86_400_000);
  });

  it("a second ACTIVE membership for the same member is rejected", async () => {
    const res = await request(app)
      .post("/api/v1/memberships")
      .set(cookieHeader(receptionCookie))
      .send({ memberId: member.memberId, planId: plan.id, method: "CASH" });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("already has an active membership");
  });

  it("inactive plans cannot be purchased", async () => {
    const retired = await makePlan({ name: "Retired", isActive: false });
    const fresh = await makeUser({ role: Role.MEMBER, member: true });
    const res = await request(app)
      .post("/api/v1/memberships")
      .set(cookieHeader(receptionCookie))
      .send({ memberId: fresh.memberId, planId: retired.id, method: "CASH" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PLAN_INACTIVE");
  });

  it("refundable cancellation (UC-09) is managers/admins only and refunds the payment", async () => {
    const membershipId = (
      await prismaRef().membership.findFirstOrThrow({
        where: { memberId: member.memberId, status: "ACTIVE" },
      })
    ).id;

    const byReception = await request(app)
      .patch(`/api/v1/memberships/${membershipId}`)
      .set(cookieHeader(receptionCookie))
      .send({ refund: true });
    expect(byReception.status).toBe(403);

    const byManager = await request(app)
      .patch(`/api/v1/memberships/${membershipId}`)
      .set(cookieHeader(managerCookie))
      .send({ refund: true, reason: "Changed their mind" });
    expect(byManager.status).toBe(200);
    expect(byManager.body.data.membership.status).toBe("CANCELLED");

    const membership = await prismaRef().membership.findUniqueOrThrow({
      where: { id: membershipId },
    });
    const payment = await prismaRef().payment.findUniqueOrThrow({
      where: { id: membership.paymentId! },
    });
    expect(payment.status).toBe("REFUNDED");

    const again = await request(app)
      .patch(`/api/v1/memberships/${membershipId}`)
      .set(cookieHeader(managerCookie))
      .send({ refund: true });
    expect(again.status).toBe(409);
  });

  it("members can view only their own memberships via /mine", async () => {
    const memberCookie = await login(member);
    const mine = await request(app)
      .get("/api/v1/memberships/mine")
      .set(cookieHeader(memberCookie));
    expect(mine.status).toBe(200);
    expect(Array.isArray(mine.body.data)).toBe(true);
    for (const m of mine.body.data) {
      expect(m.member.user.id).toBe(member.id);
    }
  });
});
