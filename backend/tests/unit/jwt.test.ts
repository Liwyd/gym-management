import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "../../src/modules/auth/jwt";
import { AppError } from "../../src/lib/errors";

describe("JWT session tokens (R7)", () => {
  it("round-trips sub and role", () => {
    const token = signToken({ sub: "user-1", role: Role.TRAINER });
    const payload = verifyToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.role).toBe(Role.TRAINER);
  });

  it("rejects a token signed with another secret", () => {
    const forged = jwt.sign({ role: Role.ADMIN }, "not-our-secret", {
      subject: "user-1",
    });
    expect(() => verifyToken(forged)).toThrow(AppError);
  });

  it("rejects a tampered payload", () => {
    const token = signToken({ sub: "user-1", role: Role.MEMBER });
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: "user-1", role: Role.ADMIN }),
    ).toString("base64url");
    expect(() => verifyToken(`${header}.${forgedPayload}.${signature}`)).toThrow(
      AppError,
    );
  });

  it("rejects garbage input", () => {
    expect(() => verifyToken("not-a-token")).toThrow(AppError);
  });

  it("rejects an invalid role claim", () => {
    const token = jwt.sign({ role: "SUPERUSER" }, process.env.JWT_SECRET!, {
      subject: "user-1",
    });
    expect(() => verifyToken(token)).toThrow(AppError);
  });
});
