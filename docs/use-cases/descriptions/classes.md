# UC-10 — Manage class catalog

- **Actors**: Administrator (primary), Manager
- **Preconditions**: actor authorized (`ADMIN` or `MANAGER`)
- **Realization**: `GET/POST/PATCH /api/v1/classes`

## Main flow

1. Actor opens **Classes**.
2. Actor creates or edits a class template: name, category, capacity, description, active flag.
3. System validates (name unique, `capacity > 0`).
4. System persists; schedule views (UC-11) immediately offer the class.

## Alternative flows

- **4a Deactivate class**: existing sessions keep running; no new sessions can reference it; catalog hides it by default.

## Error flows

- **E1** `422` invalid · **E2** `409` duplicate name · **E3** `403` unauthorized.

## Postconditions

- Catalog updated; capacity changes affect future enrollments only.

---

# UC-11 — Schedule class session

- **Actors**: Trainer (for self), Manager, Administrator
- **Preconditions**: class active; facility `ACTIVE`; trainer `ACTIVE`; valid time window
- **Realization**: `POST /api/v1/sessions` · sequence: [trainer scheduling](../../analysis/sequence/trainer-scheduling.md) · activity: [class scheduling](../../analysis/activity/class-scheduling.md) · rule R5

## Main flow

1. Actor opens **Schedule → New session** (class, date/time, facility; trainer defaults to self).
2. Client shows live availability hints; actor submits.
3. System validates times (`endsAt > startsAt`, future start).
4. System checks overlap for the trainer and separately for the facility among `SCHEDULED` sessions.
5. System creates the session (`SCHEDULED`) and notifies the trainer; writes `ActivityLog`.

## Alternative flows

- **1a Manager schedules on behalf of a trainer**: same flow with explicit `trainerId` (R8: trainer may only pick self).

## Error flows

- **E1** Trainer overlap → `409 SCHEDULE_CONFLICT` (UI shows the conflicting session) · **E2** Facility overlap → `409 SCHEDULE_CONFLICT` · **E3** Class/facility missing or inactive → `404` · **E4** `422` bad times.

## Postconditions

- One new `SCHEDULED` session visible on schedule grids and to members (UC-13).

---

# UC-12 — Cancel class session

- **Actors**: Trainer (own session), Manager, Administrator
- **Preconditions**: session `SCHEDULED`
- **Realization**: `POST /api/v1/sessions/:id/cancel` · «extends» UC-11 · activity: [session cancellation](../diagrams/session-cancellation.md)

## Main flow

1. Actor opens session → **Cancel** and provides a reason.
2. System confirms (enrolled count shown).
3. System sets status `CANCELLED` + `cancelReason`, notifies all enrolled members, writes `ActivityLog`.

## Alternative flows

- **2a Enrollments**: remain (historical); members may re-enroll in a replacement session; cancelled sessions count against neither member nor trainer going forward.

## Error flows

- **E1** Session not found/already cancelled → `404`/`409` · **E2** `403` (trainer canceling someone else's session).

## Postconditions

- Session no longer accepts enrollments or attendance; enrolled members see it greyed out with the reason.
