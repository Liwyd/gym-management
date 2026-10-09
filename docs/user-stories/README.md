# Stage 4 — User Stories

Stories in "As a / I want / so that" form, with acceptance criteria, priority, related use case, and status. Traceability: **story → requirement (Stage 5) → use case (Stage 3) → implementation (Stage 7)**.

## Legend

- **Priority**: `High` (must have for a presentable, coherent system) · `Medium` (important for completeness) · `Low` (nice to have if time allows — but if listed as implemented, it must work)
- **Status**: `Specified` (defined here) → `Implemented` (Stage 7, endpoint + UI + tests exist) → `Verified` (Stage 10 audit)

## Epics

| Epic | Stories | Use cases |
|---|---|---|
| [E1 — Authentication & sessions](epic-authentication.md) | US-01…US-05 | UC-01, UC-02 |
| [E2 — Members](epic-members.md) | US-06…US-10 | UC-03, UC-04, UC-05 |
| [E3 — Plans & memberships](epic-memberships.md) | US-11…US-17 | UC-06, UC-07, UC-08, UC-09 |
| [E4 — Classes & scheduling](epic-classes.md) | US-18…US-23 | UC-10, UC-11, UC-12 |
| [E5 — Enrollment](epic-enrollment.md) | US-24…US-28 | UC-13, UC-14 |
| [E6 — Attendance](epic-attendance.md) | US-29…US-31 | UC-15 |
| [E7 — Payments](epic-payments.md) | US-32…US-34 | UC-16 |
| [E8 — Dashboard & notifications](epic-dashboard-notifications.md) | US-35…US-39 | UC-19, UC-20 |
| [E9 — Administration](epic-administration.md) | US-40…US-44 | UC-17, UC-18 |

## Rules every story inherits (from Stage 1)

R1–R9 (membership activation, lifecycle, enrollment, attendance, scheduling conflicts, payment immutability, authentication, server-side authorization, notifications). Acceptance criteria below cite them only where the story is the primary carrier.

## Coverage check

- All 20 use cases (UC-01…UC-20) have at least one story; every story cites its use case. ✅
- No story describes excluded scope (waitlists, recurring schedule generation, POS integration). ✅
- 44 stories: 26 High, 17 Medium, 1 Low. ✅
- Cross-cutting states (US-44) and authorization boundaries (US-43) are explicit stories, so Stage 5 can map requirement IDs onto them.
