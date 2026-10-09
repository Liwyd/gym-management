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

describeApi("attendance (R4, UC-15)", () => {
  let manager: Awaited<ReturnType<typeof makeUser>>;
  let trainerUser: Awaited<ReturnType<typeof makeUser>>;
  let otherTrainer: Awaited<ReturnType<typeof makeUser>>;
  let member: Awaited<ReturnType<typeof makeUser>>;
  let plan: Awaited<ReturnType<typeof makePlan>>;
  let fitnessClass: Awaited<ReturnType<typeof makeClass>>;
  let facility: Awaited<ReturnType<typeof makeFacility>>;
  let managerCookie: string;
  let trainerCookie: string;
  let session: Awaited<ReturnType<typeof makeSession>>;

  beforeAll(async () => {
    await resetDb();
    manager = await makeUser({ role: Role.MANAGER });
    trainerUser = await makeUser({ role: Role.TRAINER, trainer: true });
    otherTrainer = await makeUser({ role: Role.TRAINER, trainer: true });
    member = await makeUser({ role: Role.MEMBER, member: true });
    plan = await makePlan({ durationDays: 30 });
    fitnessClass = await makeClass();
    facility = await makeFacility();
    await activateMembership(member.memberId!, plan.id);
    session = await makeSession({
      classId: fitnessClass.id,
      trainerId: trainerUser.trainerId!,
      facilityId: facility.id,
      startsAt: new Date(Date.now() - 30 * 60 * 1000),
      endsAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    await prismaRef().enrollment.create({
      data: {
        memberId: member.memberId!,
        sessionId: session.id,
        status: "ENROLLED",
      },
    });
    managerCookie = await login(manager);
    trainerCookie = await login(trainerUser);
  });
  afterAll(async () => {
    await closeDb();
  });

  it("rejects attendance before the session has started (R4)", async () => {
    const upcoming = await makeSession({
      classId: fitnessClass.id,
      trainerId: trainerUser.trainerId!,
      facilityId: facility.id,
      startsAt: new Date(Date.now() + 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 90 * 60 * 1000),
    });
    const res = await request(app)
      .post("/api/v1/attendance")
      .set(cookieHeader(managerCookie))
      .send({
        sessionId: upcoming.id,
        marks: [{ memberId: member.memberId, status: "PRESENT" }],
      });
    expect(res.status).toBe(409);
  });

  it("rejects attendance for members not enrolled in the session", async () => {
    const stranger = await makeUser({ role: Role.MEMBER, member: true });
    const res = await request(app)
      .post("/api/v1/attendance")
      .set(cookieHeader(managerCookie))
      .send({
        sessionId: session.id,
        marks: [{ memberId: stranger.memberId, status: "PRESENT" }],
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("NOT_ENROLLED");
  });

  it("rejects attendance for cancelled sessions", async () => {
    const cancelled = await makeSession({
      classId: fitnessClass.id,
      trainerId: trainerUser.trainerId!,
      facilityId: facility.id,
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
      endsAt: new Date(Date.now() - 30 * 60 * 1000),
      status: "CANCELLED",
    });
    const res = await request(app)
      .post("/api/v1/attendance")
      .set(cookieHeader(managerCookie))
      .send({
        sessionId: cancelled.id,
        marks: [{ memberId: member.memberId, status: "PRESENT" }],
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("STATE_CONFLICT");
  });

  it("records PRESENT attendance for an enrolled member and upserts on repeat", async () => {
    const res = await request(app)
      .post("/api/v1/attendance")
      .set(cookieHeader(trainerCookie))
      .send({
        sessionId: session.id,
        marks: [{ memberId: member.memberId, status: "PRESENT" }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.attendance[0].status).toBe("PRESENT");

    const res2 = await request(app)
      .post("/api/v1/attendance")
      .set(cookieHeader(trainerCookie))
      .send({
        sessionId: session.id,
        marks: [{ memberId: member.memberId, status: "ABSENT" }],
      });
    expect(res2.status).toBe(201);
    expect(res2.body.data.attendance[0].status).toBe("ABSENT");

    const rows = await prismaRef().attendance.count({
      where: { enrollment: { sessionId: session.id, memberId: member.memberId } },
    });
    expect(rows).toBe(1);
  });

  it("another trainer cannot record attendance for someone else's session", async () => {
    const res = await request(app)
      .post("/api/v1/attendance")
      .set(cookieHeader(await login(otherTrainer)))
      .send({
        sessionId: session.id,
        marks: [{ memberId: member.memberId, status: "LATE" }],
      });
    expect(res.status).toBe(403);
  });

  it("trainers read only their own sessions; managers read all", async () => {
    const trainerView = await request(app)
      .get("/api/v1/attendance")
      .set(cookieHeader(trainerCookie));
    expect(trainerView.status).toBe(200);
    expect(trainerView.body.data.length).toBeGreaterThan(0);
    for (const row of trainerView.body.data) {
      expect(row.enrollment.session.trainerId).toBe(trainerUser.trainerId);
    }

    const managerView = await request(app)
      .get("/api/v1/attendance")
      .set(cookieHeader(managerCookie));
    expect(managerView.status).toBe(200);
  });
});
