/**
 * Pure business rules (R1–R6). No I/O — unit-tested directly.
 * Date-only semantics: @db.Date columns are treated as UTC midnights.
 */

export const DAY_MS = 86_400_000;

export function dateOnly(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

/** R1: endDate = startDate + plan.durationDays */
export function computeEndDate(startDate: Date, durationDays: number): Date {
  return new Date(dateOnly(startDate).getTime() + durationDays * DAY_MS);
}

/** R2: the endDate day itself is still valid; it expires the next day. */
export function hasMembershipEnded(endDate: Date, now: Date): boolean {
  return dateOnly(now).getTime() > dateOnly(endDate).getTime();
}

export type StoredMembershipStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

export function deriveMembershipStatus(
  stored: StoredMembershipStatus,
  endDate: Date,
  now: Date,
): StoredMembershipStatus {
  if (stored === "CANCELLED") return "CANCELLED";
  if (hasMembershipEnded(endDate, now)) return "EXPIRED";
  return stored === "EXPIRED" ? "EXPIRED" : "ACTIVE";
}

/** R2: expired/cancelled memberships cannot be used for enrollment. */
export function isMembershipUsable(
  status: StoredMembershipStatus,
  endDate: Date,
  now: Date,
): boolean {
  return deriveMembershipStatus(status, endDate, now) === "ACTIVE";
}

export interface EnrollCheckInput {
  memberStatus: "ACTIVE" | "INACTIVE";
  membership: { status: StoredMembershipStatus; endDate: Date } | null;
  sessionStatus: "SCHEDULED" | "CANCELLED" | "COMPLETED";
  startsAt: Date;
  enrolledCount: number;
  capacity: number;
  existingEnrollment: "ENROLLED" | "CANCELLED" | null;
  now: Date;
}

export type EnrollCheck =
  | { ok: true }
  | { ok: false; code: "STATE_CONFLICT" | "MEMBERSHIP_REQUIRED" | "CLASS_FULL" | "ALREADY_ENROLLED" | "BAD_REQUEST"; message: string };

/** R3 — all preconditions for enrolling a member in a session. */
export function checkEnrollment(input: EnrollCheckInput): EnrollCheck {
  if (input.memberStatus !== "ACTIVE") {
    return {
      ok: false,
      code: "STATE_CONFLICT",
      message: "Member is inactive",
    };
  }
  if (
    !input.membership ||
    !isMembershipUsable(
      input.membership.status,
      input.membership.endDate,
      input.now,
    )
  ) {
    return {
      ok: false,
      code: "MEMBERSHIP_REQUIRED",
      message: "Member needs an active membership to enroll",
    };
  }
  if (input.sessionStatus !== "SCHEDULED") {
    return {
      ok: false,
      code: "STATE_CONFLICT",
      message: "This session is not open for enrollment",
    };
  }
  if (input.startsAt.getTime() <= input.now.getTime()) {
    return {
      ok: false,
      code: "STATE_CONFLICT",
      message: "This session has already started",
    };
  }
  if (input.existingEnrollment === "ENROLLED") {
    return {
      ok: false,
      code: "ALREADY_ENROLLED",
      message: "Member is already enrolled in this session",
    };
  }
  if (input.enrolledCount >= input.capacity) {
    return {
      ok: false,
      code: "CLASS_FULL",
      message: "This session is full",
    };
  }
  return { ok: true };
}

/** R4: attendance may be recorded during or after the session window. */
export function canRecordAttendance(startsAt: Date, now: Date): boolean {
  return now.getTime() >= startsAt.getTime();
}

/** R5: half-open interval overlap. */
export function hasTimeOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/** R6: payments must have a positive amount. */
export function isValidPaymentAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}

export function isSessionWindowValid(startsAt: Date, endsAt: Date): boolean {
  return endsAt.getTime() > startsAt.getTime();
}
