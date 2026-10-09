import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  canRecordAttendance,
  checkEnrollment,
  computeEndDate,
  dateOnly,
  deriveMembershipStatus,
  hasMembershipEnded,
  hasTimeOverlap,
  isMembershipUsable,
  isSessionWindowValid,
  isValidPaymentAmount,
  type EnrollCheckInput,
} from "../../src/modules/rules/rules";

const day = (iso: string) => new Date(iso);

describe("date helpers", () => {
  it("dateOnly strips time to UTC midnight", () => {
    expect(dateOnly(day("2026-03-15T14:30:00Z")).toISOString()).toBe(
      "2026-03-15T00:00:00.000Z",
    );
  });

  it("computeEndDate adds durationDays (R1)", () => {
    expect(computeEndDate(day("2026-01-01T00:00:00Z"), 30).toISOString()).toBe(
      "2026-01-31T00:00:00.000Z",
    );
    expect(computeEndDate(day("2026-01-01T00:00:00Z"), 1).getTime()).toBe(
      day("2026-01-02T00:00:00Z").getTime(),
    );
  });

  it("computeEndDate handles month boundaries", () => {
    expect(computeEndDate(day("2026-02-01T00:00:00Z"), 28).toISOString()).toBe(
      "2026-03-01T00:00:00.000Z",
    );
  });
});

describe("membership lifecycle (R1/R2)", () => {
  it("endDate day itself is still valid", () => {
    const end = day("2026-06-10T00:00:00Z");
    expect(hasMembershipEnded(end, day("2026-06-10T09:00:00Z"))).toBe(false);
    expect(hasMembershipEnded(end, day("2026-06-11T00:00:00Z"))).toBe(true);
  });

  it("deriveMembershipStatus: cancelled stays cancelled", () => {
    expect(
      deriveMembershipStatus("CANCELLED", day("2030-01-01T00:00:00Z"), new Date()),
    ).toBe("CANCELLED");
  });

  it("deriveMembershipStatus: ACTIVE past endDate becomes EXPIRED", () => {
    expect(
      deriveMembershipStatus("ACTIVE", day("2020-01-01T00:00:00Z"), new Date()),
    ).toBe("EXPIRED");
  });

  it("deriveMembershipStatus: ACTIVE within window stays ACTIVE", () => {
    expect(
      deriveMembershipStatus(
        "ACTIVE",
        new Date(Date.now() + 30 * DAY_MS),
        new Date(),
      ),
    ).toBe("ACTIVE");
  });

  it("isMembershipUsable rejects expired and cancelled", () => {
    const future = new Date(Date.now() + DAY_MS);
    expect(isMembershipUsable("ACTIVE", future, new Date())).toBe(true);
    expect(isMembershipUsable("EXPIRED", future, new Date())).toBe(false);
    expect(isMembershipUsable("CANCELLED", future, new Date())).toBe(false);
    expect(
      isMembershipUsable("ACTIVE", new Date(Date.now() - DAY_MS), new Date()),
    ).toBe(false);
  });
});

describe("checkEnrollment (R3)", () => {
  const base: EnrollCheckInput = {
    memberStatus: "ACTIVE",
    membership: { status: "ACTIVE", endDate: new Date(Date.now() + 30 * DAY_MS) },
    sessionStatus: "SCHEDULED",
    startsAt: new Date(Date.now() + 24 * 3600 * 1000),
    enrolledCount: 5,
    capacity: 12,
    existingEnrollment: null,
    now: new Date(),
  };

  it("allows a valid enrollment", () => {
    expect(checkEnrollment(base)).toEqual({ ok: true });
  });

  it("rejects inactive member", () => {
    const r = checkEnrollment({ ...base, memberStatus: "INACTIVE" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("STATE_CONFLICT");
  });

  it("rejects missing membership", () => {
    const r = checkEnrollment({ ...base, membership: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("MEMBERSHIP_REQUIRED");
  });

  it("rejects expired membership", () => {
    const r = checkEnrollment({
      ...base,
      membership: { status: "ACTIVE", endDate: new Date(Date.now() - DAY_MS) },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("MEMBERSHIP_REQUIRED");
  });

  it("rejects cancelled session", () => {
    const r = checkEnrollment({ ...base, sessionStatus: "CANCELLED" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("STATE_CONFLICT");
  });

  it("rejects session that already started", () => {
    const r = checkEnrollment({
      ...base,
      startsAt: new Date(Date.now() - 1000),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("STATE_CONFLICT");
  });

  it("rejects duplicate enrollment", () => {
    const r = checkEnrollment({ ...base, existingEnrollment: "ENROLLED" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("ALREADY_ENROLLED");
  });

  it("allows re-enrollment after a cancellation", () => {
    const r = checkEnrollment({ ...base, existingEnrollment: "CANCELLED" });
    expect(r.ok).toBe(true);
  });

  it("rejects full session (capacity)", () => {
    const r = checkEnrollment({ ...base, enrolledCount: 12, capacity: 12 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("CLASS_FULL");
  });
});

describe("attendance and scheduling rules (R4/R5)", () => {
  it("attendance only during or after session start (R4)", () => {
    const start = new Date(Date.now() - 60_000);
    expect(canRecordAttendance(start, new Date())).toBe(true);
    expect(
      canRecordAttendance(new Date(Date.now() + 60_000), new Date()),
    ).toBe(false);
  });

  it("half-open overlap detection (R5)", () => {
    const a1 = day("2026-05-01T10:00:00Z");
    const a2 = day("2026-05-01T11:00:00Z");
    expect(
      hasTimeOverlap(a1, a2, day("2026-05-01T10:30:00Z"), day("2026-05-01T12:00:00Z")),
    ).toBe(true);
    expect(
      hasTimeOverlap(a1, a2, day("2026-05-01T11:00:00Z"), day("2026-05-01T12:00:00Z")),
    ).toBe(false);
    expect(
      hasTimeOverlap(a1, a2, day("2026-05-01T08:00:00Z"), day("2026-05-01T10:00:00Z")),
    ).toBe(false);
    expect(
      hasTimeOverlap(a1, a2, day("2026-05-01T09:00:00Z"), day("2026-05-01T10:30:00Z")),
    ).toBe(true);
  });
});

describe("payment rules (R6)", () => {
  it("requires a positive finite amount", () => {
    expect(isValidPaymentAmount(10)).toBe(true);
    expect(isValidPaymentAmount(0.01)).toBe(true);
    expect(isValidPaymentAmount(0)).toBe(false);
    expect(isValidPaymentAmount(-5)).toBe(false);
    expect(isValidPaymentAmount(Number.NaN)).toBe(false);
  });

  it("session window must end after start", () => {
    expect(
      isSessionWindowValid(day("2026-05-01T10:00:00Z"), day("2026-05-01T11:00:00Z")),
    ).toBe(true);
    expect(
      isSessionWindowValid(day("2026-05-01T11:00:00Z"), day("2026-05-01T10:00:00Z")),
    ).toBe(false);
  });
});
