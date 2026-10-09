# Epic E4 — Classes & Scheduling (UC-10, UC-11, UC-12)

## US-18 — Manage class catalog
**As an** administrator, **I want to** create and edit classes (name, category, capacity, description), **so that** the schedule offers the real offering.
- Priority: **High** · Use case: UC-10 · Status: Specified
- AC1: CRUD with validation (unique name, capacity ≥ 1).
- AC2: Deactivated classes cannot host new sessions but existing sessions remain.

## US-19 — Schedule a session with conflict detection
**As a** manager, **I want to** schedule a class session and be told about conflicts, **so that** trainers and rooms are never double-booked.
- Priority: **High** · Use case: UC-11 · Status: Specified
- AC1: Form: class, date, start/end time, facility, trainer; validates `end > start`.
- AC2: Trainer overlap → 409 showing the conflicting session; facility overlap → same (R5).
- AC3: Success adds the session to the schedule view immediately.

## US-20 — Trainer schedules own session
**As a** trainer, **I want to** schedule my own sessions, **so that** I can plan my week without chasing managers.
- Priority: **High** · Use case: UC-11 · Status: Specified
- AC1: Trainer form defaults trainer to self and cannot select another trainer (R8).
- AC2: Same conflict checks as staff (R5).

## US-21 — Cancel a session with notifications
**As a** trainer, **I want to** cancel one of my sessions with a reason, **so that** enrolled members know in time.
- Priority: **High** · Use case: UC-12 · Status: Specified
- AC1: Confirmation shows the number of enrolled members.
- AC2: Cancellation sets status + reason, notifies every enrolled member, and blocks further enrollment/attendance.
- AC3: Cancelling someone else's session → 403.

## US-22 — Browse the schedule
**As any** user, **I want to** see upcoming classes (day/week list with trainer, room, spots left), **so that** I can plan training.
- Priority: **High** · Use case: UC-11, UC-13 · Status: Specified
- AC1: Upcoming sessions listed with remaining capacity; cancelled sessions visually distinct with reason.
- AC2: Members see only enroll-able (future, open) sessions with an enroll button when eligible.
- AC3: Loading/empty/error states for the schedule grid.

## US-23 — Trainer's "my sessions" view
**As a** trainer, **I want to** see only my sessions (today/upcoming/past), **so that** I know where to be and what to mark.
- Priority: **Medium** · Use case: UC-11, UC-15 · Status: Specified
- AC1: Default view groups sessions by today / this week / past.
- AC2: Past sessions link directly to the roster (US-29).
