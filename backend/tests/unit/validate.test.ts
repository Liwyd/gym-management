import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../../src/lib/errors";
import { parse } from "../../src/lib/validate";
import { paginationSchema, pageParams, MAX_LIMIT } from "../../src/utils/pagination";
import {
  boolQuery,
  dateField,
  emailField,
  passwordField,
  priceField,
} from "../../src/utils/schemas";

describe("parse() validation envelope", () => {
  it("returns parsed data on success", () => {
    const schema = z.object({ name: z.string().min(1) });
    expect(parse(schema, { name: "ok" }, "Thing")).toEqual({ name: "ok" });
  });

  it("throws 400 VALIDATION_ERROR with field details", () => {
    const schema = z.object({ email: z.email() });
    try {
      parse(schema, { email: "nope" }, "Member");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.status).toBe(400);
      expect(appErr.code).toBe("VALIDATION_ERROR");
      expect(appErr.message).toContain("Member");
      expect(Array.isArray(appErr.details)).toBe(true);
    }
  });
});

describe("pagination (bounded offset pagination)", () => {
  it("defaults page=1 limit=20", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it("caps limit at 100", () => {
    expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
    expect(paginationSchema.parse({ limit: MAX_LIMIT }).limit).toBe(100);
  });

  it("rejects page below 1", () => {
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
  });

  it("computes skip/take", () => {
    expect(pageParams({ page: 3, limit: 20 })).toEqual({ skip: 40, take: 20 });
  });
});

describe("shared field schemas", () => {
  it("boolQuery only accepts explicit true/false strings", () => {
    expect(boolQuery.parse("true")).toBe(true);
    expect(boolQuery.parse("false")).toBe(false);
    expect(boolQuery.parse(undefined)).toBe(false);
    expect(() => boolQuery.parse("yes")).toThrow();
  });

  it("dateField parses ISO datetimes and rejects garbage", () => {
    const d = dateField.parse("2026-05-01T10:00:00.000Z");
    expect(d).toBeInstanceOf(Date);
    expect(() => dateField.parse("tomorrow")).toThrow();
    expect(() => dateField.parse("2026-05-01")).toThrow();
  });

  it("emailField normalizes to lowercase", () => {
    expect(emailField.parse("  Admin@PulseFit.CLUB ")).toBe(
      "admin@pulsefit.club",
    );
  });

  it("passwordField enforces length plus letter and digit", () => {
    expect(passwordField.parse("Password123!")).toBe("Password123!");
    expect(() => passwordField.parse("short1")).toThrow();
    expect(() => passwordField.parse("alllettersonly")).toThrow();
    expect(() => passwordField.parse("12345678")).toThrow();
  });

  it("priceField enforces 2 decimal places", () => {
    expect(priceField.parse(49.99)).toBe(49.99);
    expect(priceField.parse(50)).toBe(50);
    expect(() => priceField.parse(10.999)).toThrow();
    expect(() => priceField.parse(0)).toThrow();
    expect(() => priceField.parse(-1)).toThrow();
  });
});
