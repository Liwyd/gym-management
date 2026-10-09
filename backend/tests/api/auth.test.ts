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
  uniqueIp,
} from "./helpers";

const describeApi = apiAvailable ? describe : describe.skip;

describeApi("auth endpoints", () => {
  beforeAll(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await closeDb();
  });

  it("logs in, returns the user without the password hash, sets an httpOnly cookie", async () => {
    const user = await makeUser({ role: Role.MEMBER, member: true });
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Forwarded-For", uniqueIp())
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    const setCookie = res.headers["set-cookie"];
    const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie]).join(";");
    expect(cookie).toContain("pulsefit_access=");
    expect(cookie.toLowerCase()).toContain("httponly");
  });

  it("rejects a wrong password with 401 and a generic message", async () => {
    const user = await makeUser({ role: Role.MEMBER });
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Forwarded-For", uniqueIp())
      .send({ email: user.email, password: "WrongPass123" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("rejects an inactive account with 403", async () => {
    const user = await makeUser({ role: Role.RECEPTIONIST });
    const { prisma } = await import("../../src/lib/prisma");
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "INACTIVE" },
    });
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Forwarded-For", uniqueIp())
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain("inactive");
  });

  it("rejects invalid login payloads with 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Forwarded-For", uniqueIp())
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it("GET /auth/me works with the session cookie and 401s without it", async () => {
    const user = await makeUser({ role: Role.MANAGER });
    const cookie = await login(user);

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set(cookieHeader(cookie));
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe(user.id);
    expect(me.body.data.user.role).toBe("MANAGER");

    const anon = await request(app).get("/api/v1/auth/me");
    expect(anon.status).toBe(401);
  });

  it("logout clears the session cookie", async () => {
    const user = await makeUser({ role: Role.MEMBER, member: true });
    const cookie = await login(user);
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set(cookieHeader(cookie));
    expect(res.status).toBe(200);
    const cleared = res.headers["set-cookie"];
    expect((Array.isArray(cleared) ? cleared : [cleared]).join(";")).toContain(
      "pulsefit_access=;",
    );
  });

  it("PATCH /auth/me changes the name and rejects a wrong current password", async () => {
    const user = await makeUser({ role: Role.TRAINER });
    const cookie = await login(user);

    const okRes = await request(app)
      .patch("/api/v1/auth/me")
      .set(cookieHeader(cookie))
      .send({ firstName: "Renamed", lastName: "Coach" });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.user.firstName).toBe("Renamed");

    const badRes = await request(app)
      .patch("/api/v1/auth/me")
      .set(cookieHeader(cookie))
      .send({ newPassword: "NewPass123", currentPassword: "NopeWrong1" });
    expect(badRes.status).toBe(400);
    expect(JSON.stringify(badRes.body.error.details)).toContain("Current password");
  });
});
