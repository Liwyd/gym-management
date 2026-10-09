# UC-13 — Enroll member in class

- **Actors**: Member (self), Receptionist, Manager, Administrator
- **Preconditions**: session `SCHEDULED` and in the future; member `ACTIVE` with `ACTIVE` membership (R3); actor authorized (self or staff)
- **Realization**: `POST /api/v1/sessions/:id/enrollments` · sequence: [class enrollment](../../analysis/sequence/class-enrollment.md) · activity: [class enrollment](../../analysis/activity/class-enrollment.md) · «includes» UC-01 · rules R2, R3

## Main flow

1. Actor browses **Classes** (future sessions with remaining spots) and opens one.
2. System shows class info, trainer, facility, capacity indicator.
3. Actor clicks **Enroll**.
4. System re-validates membership status, session state, capacity and duplicates **inside a transaction** (count of `ENROLLED` rows under lock).
5. System creates the enrollment, notifies the member, writes `ActivityLog`.

## Alternative flows

- **1a Staff enrolls on behalf**: receptionist picks member in the same dialog (desk flow).
- **3a Session full at re-check** (concurrent request took the last spot) → `409 SESSION_FULL`; UI refreshes capacity.

## Error flows

- **E1** Not authenticated → `401` · **E2** no/expired membership → `403 NO_ACTIVE_MEMBERSHIP` · **E3** duplicate → `409 ALREADY_ENROLLED` · **E4** session cancelled/started → `409 SESSION_NOT_OPEN` · **E5** unknown session → `404`.

## Postconditions

- One `ENROLLED` row; member's schedule updated; capacity consumed; attendance can later be recorded (UC-15).

---

# UC-14 — Cancel enrollment

- **Actors**: Member (self), Receptionist, Manager, Administrator
- **Preconditions**: enrollment `ENROLLED`; session not yet completed
- **Realization**: `DELETE /api/v1/sessions/:id/enrollments/me` (member) or `DELETE /api/v1/sessions/:id/enrollments/:memberId` (staff) · activity: [enrollment cancellation](../diagrams/enrollment-cancellation.md)

## Main flow

1. Actor opens their (or a member's) enrollment and selects **Cancel**.
2. System confirms.
3. System sets enrollment `CANCELLED` (row kept for history), notifies the actor, writes `ActivityLog`.

## Alternative flows

- **1a Cutoff**: cancellations for sessions starting within 2 hours are rejected (`ENROLLMENT_LOCKED`) so rosters stay stable — configurable constant, default 120 minutes.

## Error flows

- **E1** Session already completed → `409` · **E2** `403` (member canceling someone else's enrollment) · **E3** unknown enrollment → `404`.

## Postconditions

- Capacity freed (capacity counts only `ENROLLED`); member may enroll again if within capacity.

---

# UC-15 — Record attendance

- **Actors**: Trainer (own session), Manager, Administrator
- **Preconditions**: session held (`COMPLETED` or past `SCHEDULED`); members enrolled
- **Realization**: `GET/POST /api/v1/sessions/:id/attendance` · sequence: [attendance](../../analysis/sequence/attendance.md) · activity: [attendance recording](../../analysis/activity/attendance-recording.md) · rule R4

## Main flow

1. Trainer opens **My sessions → session roster**.
2. System lists enrolled members with current marks.
3. Trainer marks `PRESENT`/`LATE`/`ABSENT` per member.
4. System upserts one `Attendance` row per enrollment (`recordedBy`, `recordedAt`).

## Alternative flows

- **3a Bulk mark all present**: UI shortcut submitting one request per member; each validated independently.

## Error flows

- **E1** Actor is not the session trainer (and not manager/admin) → `403` · **E2** session not yet held → `409 SESSION_NOT_HELD` · **E3** member not enrolled → `404 NOT_ENROLLED`.

## Postconditions

- Attendance recorded exactly once per member/session (unique `enrollmentId`); member's personal history and class stats update.
