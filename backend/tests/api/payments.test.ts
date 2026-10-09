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

describeApi("payments (R6, UC-16/09)", () => {
  let reception: Awaited<ReturnType<typeof makeUser>>;
  let manager: Awaited<ReturnType<typeof makeUser>>;
  let member: Awaited<ReturnType<typeof makeUser>>;
  let plan: Awaited<ReturnType<typeof makePlan>>;
  let receptionCookie: string;
  let managerCookie: string;
  let memberCookie: string;
  let membershipId: string;
  let membershipPaymentId: string;

  beforeAll(async () => {
    await resetDb();
    reception = await makeUser({ role: Role.RECEPTIONIST });
    manager = await makeUser({ role: Role.MANAGER });
    member = await makeUser({ role: Role.MEMBER, member: true });
    plan = await makePlan({ durationDays: 30, price: 49.99 });
    receptionCookie = await login(reception);
    managerCookie = await login(manager);
    memberCookie = await login(member);

    const purchase = await request(app)
      .post("/api/v1/memberships")
      .set(cookieHeader(receptionCookie))
      .send({ memberId: member.memberId, planId: plan.id, method: "CARD" });
    membershipId = purchase.body.data.membership.id;
    membershipPaymentId = purchase.body.data.payment.id;
  });
  afterAll(async () => {
    await closeDb();
  });

  it("rejects non-positive amounts and unrounded prices", async () => {
    const zero = await request(app)
      .post("/api/v1/payments")
      .set(cookieHeader(receptionCookie))
      .send({ memberId: member.memberId, amount: 0, type: "OTHER", method: "CASH" });
    expect(zero.status).toBe(400);

    const unrounded = await request(app)
      .post("/api/v1/payments")
      .set(cookieHeader(receptionCookie))
      .send({ memberId: member.memberId, amount: 10.999, type: "OTHER", method: "CASH" });
    expect(unrounded.status).toBe(400);
    expect(unrounded.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects the MEMBERSHIP_PURCHASE type on the generic payments endpoint", async () => {
    const res = await request(app)
      .post("/api/v1/payments")
      .set(cookieHeader(receptionCookie))
      .send({
        memberId: member.memberId,
        amount: 49.99,
        type: "MEMBERSHIP_PURCHASE",
        method: "CASH",
      });
    expect(res.status).toBe(400);
  });

  it("records a CLASS_FEE payment as COMPLETED and notifies the member (R9)", async () => {
    const res = await request(app)
      .post("/api/v1/payments")
      .set(cookieHeader(receptionCookie))
      .send({
        memberId: member.memberId,
        amount: 15,
        type: "CLASS_FEE",
        method: "CASH",
        description: "Drop-in class",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.payment.status).toBe("COMPLETED");
    expect(Number(res.body.data.payment.amount)).toBe(15);

    const notification = await prismaRef().notification.findFirst({
      where: { userId: member.id, title: "Payment received" },
    });
    expect(notification).not.toBeNull();
  });

  it("members see only their own payments", async () => {
    const other = await makeUser({ role: Role.MEMBER, member: true });
    await request(app)
      .post("/api/v1/payments")
      .set(cookieHeader(managerCookie))
      .send({ memberId: other.memberId, amount: 5, type: "OTHER", method: "CASH" });

    const res = await request(app)
      .get("/api/v1/payments")
      .set(cookieHeader(memberCookie));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) {
      expect(p.member.user.email).toBe(member.email);
    }
  });

  it("refunds a completed payment via POST /payments/:id/refund (UC-09)", async () => {
    const refund = await request(app)
      .post(`/api/v1/payments/${membershipPaymentId}/refund`)
      .set(cookieHeader(managerCookie))
      .send();
    expect(refund.status).toBe(200);
    expect(refund.body.data.payment.status).toBe("REFUNDED");

    const membership = await prismaRef().membership.findUniqueOrThrow({
      where: { id: membershipId },
    });
    expect(membership.status).toBe("CANCELLED");

    const again = await request(app)
      .post(`/api/v1/payments/${membershipPaymentId}/refund`)
      .set(cookieHeader(managerCookie));
    expect(again.status).toBe(409);
  });

  it("members cannot record or refund payments", async () => {
    const create = await request(app)
      .post("/api/v1/payments")
      .set(cookieHeader(memberCookie))
      .send({ amount: 10, type: "OTHER", method: "CASH" });
    expect(create.status).toBe(403);

    const refund = await request(app)
      .post(`/api/v1/payments/${membershipPaymentId}/refund`)
      .set(cookieHeader(memberCookie));
    expect(refund.status).toBe(403);
  });
});
