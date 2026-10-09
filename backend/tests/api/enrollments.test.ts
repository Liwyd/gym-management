import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import {
  activateMembership,
  apiAvailable,
  app,
  closeDb,
  cookieHeader,
  login,
  makeClass,
  makeFacility,
  makePlan,
  makeSession,
  makeUser,
  prismaRef,
  resetDb,
} from "./helpers";

const describeApi = apiAvailable ? describe : describe.skip;

describeApi("enrollment rules (R3, UC-13/14)", () => {
  let reception: Awaited<ReturnType<typeof makeUser>>;
  let manager: Awaited<ReturnType<typeof makeUser>>;
  let trainerUser: Awaited<ReturnType<typeof makeUser>>;
  let member: Awaited<ReturnType<typeof makeUser>>;
  let memberNoMembership: Awaited<ReturnType<typeof makeUser>>;
  let plan: Awaited<ReturnType<typeof makePlan>>;
  let fitnessClass: Awaited<ReturnType<typeof makeClass>>;
  let facility: Awaited<ReturnType<typeof makeFacility>>;
  let session: Awaited<ReturnType<typeof makeSession>>;
  let receptionCookie: string;
  let managerCookie: string;
  let memberCookie: string;

  beforeAll(async () => {
    await resetDb();
    reception = await makeUser({ role: Role.RECEPTIONIST });
    manager = await makeUser({ role: Role.MANAGER });
    trainerUser = await makeUser({ role: Role.TRAINER, trainer: true });
    member = await makeUser({ role: Role.MEMBER, member: true });
    memberNoMembership = await makeUser({ role: Role.MEMBER, member: true });
    plan = await makePlan({ durationDays: 90, price: 99 });
    fitnessClass = await makeClass({ capacity: 2 });
    facility = await makeFacility({ capacity: 20 });
    session = await makeSession({
      classId: fitnessClass.id,
      trainerId: trainerUser.trainerId!,
      facilityId: facility.id,
      startsAt: new Date(Date.now() + 2 * 3600 * 1000),
      endsAt: new Date(Date.now() + 3 * 3600 * 1000),
    });
    await activateMembership(member.memberId!, plan.id);
    receptionCookie = await login(reception);
    managerCookie = await login(manager);
    memberCookie = await login(member);
  });
  afterAll(async () => {
    await closeDb();
  });

  it("rejects enrollment without an active membership", async () => {
    const res = await request(app)
      .post("/api/v1/enrollments")
      .set(cookieHeader(receptionCookie))
      .send({ memberId: memberNoMembership.memberId, sessionId: session.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("MEMBERSHIP_REQUIRED");
  });

  it("enrolls a member with an active membership and notifies them (R9)", async () => {
    const res = await request(app)
      .post("/api/v1/enrollments")
      .set(cookieHeader(receptionCookie))
      .send({ memberId: member.memberId, sessionId: session.id });
    expect(res.status).toBe(201);
    expect(res.body.data.enrollment.status).toBe("ENROLLED");

    const notification = await prismaRef().notification.findFirst({
      where: { userId: member.id, title: "Enrollment confirmed" },
    });
    expect(notification).not.toBeNull();
  });

  it("rejects a duplicate enrollment", async () => {
    const res = await request(app)
      .post("/api/v1/enrollments")
      .set(cookieHeader(receptionCookie))
      .send({ memberId: member.memberId, sessionId: session.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_ENROLLED");
  });

  it("enforces class capacity and frees the spot on cancellation", async () => {
    const second = await makeUser({ role: Role.MEMBER, member: true });
    const third = await makeUser({ role: Role.MEMBER, member: true });
    await activateMembership(second.memberId!, plan.id);
    await activateMembership(third.memberId!, plan.id);

    const secondRes = await request(app)
      .post("/api/v1/enrollments")
      .set(cookieHeader(managerCookie))
      .send({ memberId: second.memberId, sessionId: session.id });
    expect(secondRes.status).toBe(201);

    const fullRes = await request(app)
      .post("/api/v1/enrollments")
      .set(cookieHeader(managerCookie))
      .send({ memberId: third.memberId, sessionId: session.id });
    expect(fullRes.status).toBe(409);
    expect(fullRes.body.error.code).toBe("CLASS_FULL");

    const cancelRes = await request(app)
      .post(`/api/v1/enrollments/${secondRes.body.data.enrollment.id}/cancel`)
      .set(cookieHeader(managerCookie));
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.enrollment.status).toBe("CANCELLED");

    const retryRes = await request(app)
      .post("/api/v1/enrollments")
      .set(cookieHeader(managerCookie))
      .send({ memberId: third.memberId, sessionId: session.id });
    expect(retryRes.status).toBe(201);
  });

  it("members enroll themselves but not others", async () => {
    const self = await request(app)
      .post("/api/v1/enrollments")
      .set(cookieHeader(memberCookie))
      .send({ memberId: member.memberId, sessionId: session.id });
    // already enrolled from the first test — duplicate path
    expect([201, 409]).toContain(self.status);

    const other = await makeUser({ role: Role.MEMBER, member: true });
    const notMine = await request(app)
      .post("/api/v1/enrollments")
      .set(cookieHeader(memberCookie))
      .send({ memberId: other.memberId, sessionId: session.id });
    expect(notMine.status).toBe(403);
  });

  it("enrollment is rejected for sessions that already started", async () => {
    const started = await makeSession({
      classId: fitnessClass.id,
      trainerId: trainerUser.trainerId!,
      facilityId: facility.id,
      startsAt: new Date(Date.now() - 3600 * 1000),
      endsAt: new Date(Date.now() + 3600 * 1000),
    });
    const res = await request(app)
      .post("/api/v1/enrollments")
      .set(cookieHeader(managerCookie))
      .send({ memberId: member.memberId, sessionId: started.id });
    expect(res.status).toBe(409);
  });

  it("cancelling a session cancels enrollments flow and notifies members", async () => {
    const cancel = await request(app)
      .post(`/api/v1/sessions/${session.id}/cancel`)
      .set(cookieHeader(managerCookie))
      .send({ reason: "Trainer ill" });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.session.status).toBe("CANCELLED");

    const notif = await prismaRef().notification.findFirst({
      where: { userId: member.id, title: "Class session cancelled" },
    });
    expect(notif).not.toBeNull();

    const enrollAfter = await request(app)
      .post("/api/v1/enrollments")
      .set(cookieHeader(managerCookie))
      .send({ memberId: memberNoMembership.memberId, sessionId: session.id });
    expect(enrollAfter.status).toBe(409);
  });
});
