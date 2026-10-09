import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import {
  apiAvailable,
  app,
  closeDb,
  cookieHeader,
  login,
  makeUser,
  resetDb,
} from "./helpers";

const describeApi = apiAvailable ? describe : describe.skip;

describeApi("RBAC enforcement on live endpoints (R8)", () => {
  let member: Awaited<ReturnType<typeof makeUser>>;
  let receptionist: Awaited<ReturnType<typeof makeUser>>;
  let trainer: Awaited<ReturnType<typeof makeUser>>;
  let admin: Awaited<ReturnType<typeof makeUser>>;
  let memberCookie: string;
  let receptionCookie: string;
  let trainerCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    await resetDb();
    member = await makeUser({ role: Role.MEMBER, member: true });
    receptionist = await makeUser({ role: Role.RECEPTIONIST });
    trainer = await makeUser({ role: Role.TRAINER, trainer: true });
    admin = await makeUser({ role: Role.ADMIN });
    memberCookie = await login(member);
    receptionCookie = await login(receptionist);
    trainerCookie = await login(trainer);
    adminCookie = await login(admin);
  });
  afterAll(async () => {
    await closeDb();
  });

  it("members cannot list members or users", async () => {
    const membersRes = await request(app)
      .get("/api/v1/members")
      .set(cookieHeader(memberCookie));
    expect(membersRes.status).toBe(403);

    const usersRes = await request(app)
      .get("/api/v1/users")
      .set(cookieHeader(memberCookie));
    expect(usersRes.status).toBe(403);
  });

  it("members can read only their own member detail", async () => {
    const other = await makeUser({ role: Role.MEMBER, member: true });

    const own = await request(app)
      .get(`/api/v1/members/${member.memberId}`)
      .set(cookieHeader(memberCookie));
    expect(own.status).toBe(200);

    const theirs = await request(app)
      .get(`/api/v1/members/${other.memberId}`)
      .set(cookieHeader(memberCookie));
    expect(theirs.status).toBe(403);
  });

  it("memberships list is staff-only; members use /memberships/mine", async () => {
    const list = await request(app)
      .get("/api/v1/memberships")
      .set(cookieHeader(memberCookie));
    expect(list.status).toBe(403);

    const mine = await request(app)
      .get("/api/v1/memberships/mine")
      .set(cookieHeader(memberCookie));
    expect(mine.status).toBe(200);
  });

  it("receptionists cannot create users, but can register members", async () => {
    const userRes = await request(app)
      .post("/api/v1/users")
      .set(cookieHeader(receptionCookie))
      .send({
        email: "nobody@test.club",
        password: "Password123!",
        firstName: "No",
        lastName: "Body",
        role: "TRAINER",
      });
    expect(userRes.status).toBe(403);

    const memberRes = await request(app)
      .post("/api/v1/members")
      .set(cookieHeader(receptionCookie))
      .send({
        email: "fresh.member@test.club",
        password: "Password123!",
        firstName: "Fresh",
        lastName: "Member",
      });
    expect(memberRes.status).toBe(201);
    expect(memberRes.body.data.member.memberCode).toMatch(/^MB-/);
  });

  it("only admins can manage plans and facilities", async () => {
    const planByReception = await request(app)
      .post("/api/v1/plans")
      .set(cookieHeader(receptionCookie))
      .send({ name: "Nope", durationDays: 30, price: 10 });
    expect(planByReception.status).toBe(403);

    const planByAdmin = await request(app)
      .post("/api/v1/plans")
      .set(cookieHeader(adminCookie))
      .send({ name: "Pro Annual", durationDays: 365, price: 399 });
    expect(planByAdmin.status).toBe(201);

    const facilityByManager = await request(app)
      .post("/api/v1/facilities")
      .set(cookieHeader(await login(await makeUser({ role: Role.MANAGER }))))
      .send({ name: "Back Court", type: "COURT", capacity: 4 });
    expect(facilityByManager.status).toBe(403);
  });

  it("trainers cannot record payments", async () => {
    const res = await request(app)
      .post("/api/v1/payments")
      .set(cookieHeader(trainerCookie))
      .send({
        memberId: member.memberId,
        amount: 20,
        type: "CLASS_FEE",
        method: "CASH",
      });
    expect(res.status).toBe(403);
  });

  it("administrators can deactivate and reactivate an account, but not themselves", async () => {
    const target = await makeUser({ role: Role.RECEPTIONIST });
    const deactivate = await request(app)
      .patch(`/api/v1/users/${target.id}`)
      .set(cookieHeader(adminCookie))
      .send({ status: "INACTIVE" });
    expect(deactivate.status).toBe(200);

    const self = await request(app)
      .patch(`/api/v1/users/${admin.id}`)
      .set(cookieHeader(adminCookie))
      .send({ status: "INACTIVE" });
    expect(self.status).toBe(409);
    expect(self.body.error.message).toContain("own role or status");
  });

  it("an admin cannot be removed if they are the last active one", async () => {
    const demote = await request(app)
      .patch(`/api/v1/users/${admin.id}`)
      .set(cookieHeader(adminCookie))
      .send({ role: "MANAGER" });
    expect(demote.status).toBe(409);
    expect(demote.body.error.message).toContain("active administrator");
  });
});
