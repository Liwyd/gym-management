# Functional Requirements

Each requirement: statement · priority · derived from (stories / use cases) · realized by (Stage 7 target).

## FR group A — Authentication & sessions

| ID | Requirement | Pri | From | Realized by |
|---|---|---|---|---|
| FR-01 | The system shall authenticate users by email + password and issue a signed JWT in an httpOnly, SameSite=Lax cookie (8h TTL); the token shall never be readable by JavaScript. | Must | US-01, US-02 · UC-01 | `POST /auth/login`, `GET /auth/me`, auth middleware |
| FR-02 | Failed logins shall return one indistinguishable error for unknown email and wrong password; login attempts shall be rate-limited per IP and per email (default: 10 / 15 min) returning 429. | Must | US-01 · UC-01 | auth module + rate-limit middleware |
| FR-03 | Only `ACTIVE` users may authenticate; a deactivated user's existing session shall be rejected at the next request (status re-checked per request). | Must | US-01, US-41 · UC-01, UC-18 | auth middleware |
| FR-04 | Logout shall clear the cookie and be idempotent. | Must | US-04 · UC-02 | `POST /auth/logout` |
| FR-05 | Every protected UI route and API shall enforce role permissions server-side; unauthorized UI access shall render a designed 403 page, APIs shall return 403. | Must | US-03, US-05, US-43 · UC-01 | RBAC middleware + route guards |

## FR group B — Members

| ID | Requirement | Pri | From | Realized by |
|---|---|---|---|---|
| FR-06 | Staff shall create a member atomically (User role=MEMBER + Member profile + generated memberCode); passwords bcrypt-hashed; duplicate email → 409. | Must | US-06 · UC-03 | `POST /members` |
| FR-07 | Staff shall list members with server-side search (name/email/code), status filter, and bounded pagination (default 20, max 100). | Must | US-07 · UC-04 | `GET /members` |
| FR-08 | Member detail shall expose profile plus related memberships, enrollments, and payments (each paginated/tabbed). | Must | US-08 · UC-04 | `GET /members/:id` + sub-resources |
| FR-09 | Staff shall edit mutable profile fields; memberCode/joinedAt immutable; setting status INACTIVE takes effect for login and enrollment. | Should | US-09 · UC-05 | `PATCH /members/:id` |
| FR-10 | Members shall read only their own member data; any request scoped to another member id shall be rejected (403/404). | Must | US-10 · UC-04 | ownership checks (R8) |

## FR group C — Plans & memberships

| ID | Requirement | Pri | From | Realized by |
|---|---|---|---|---|
| FR-11 | Admins shall create/edit/deactivate plans (name unique, durationDays > 0, price > 0); inactive plans cannot be purchased; existing memberships unaffected. | Must | US-11 · UC-06 | `CRUD /plans` |
| FR-12 | A membership purchase shall create a `COMPLETED` payment and an `ACTIVE` membership in one transaction, with amount taken server-side from the plan and `endDate = startDate + durationDays`. | Must | US-12, US-13 · UC-07 | `POST /payments` (type=MEMBERSHIP_PURCHASE) |
| FR-13 | At most one `ACTIVE` membership per member; a second purchase attempt shall fail 409 without creating a payment. | Must | US-14 · UC-07 | service/DB check (R1) |
| FR-14 | The system shall expire memberships with `endDate < today` automatically (daily job + on-start sweep) and block their enrollments. | Should | US-15 · UC-08 | background job (R2) |
| FR-15 | Refunds shall set payment `REFUNDED` and linked membership `CANCELLED` transactionally; payment amounts shall never be edited. | Should | US-16, US-34 · UC-09 | `POST /payments/:id/refund` (R6) |
| FR-16 | The system shall list memberships expiring within 14 days, nearest first, for staff dashboards. | Should | US-17 · UC-08, UC-19 | dashboard aggregation |

## FR group D — Classes & scheduling

| ID | Requirement | Pri | From | Realized by |
|---|---|---|---|---|
| FR-17 | Admins/managers shall create/edit/deactivate class templates (name unique, capacity ≥ 1). | Must | US-18 · UC-10 | `CRUD /classes` |
| FR-18 | Scheduling a session shall validate time window and reject overlapping `SCHEDULED` sessions for the same trainer and for the same facility (range query `startsAt < end AND endsAt > start`), 409 with conflict details. | Must | US-19, US-20 · UC-11 | `POST /sessions` (R5) |
| FR-19 | Cancelling a session (own trainer or manager/admin) shall store status + reason, notify all enrolled members, and block further enrollment/attendance. | Must | US-21 · UC-12 | `POST /sessions/:id/cancel` |
| FR-20 | Any authenticated user may browse future sessions with remaining capacity, cancelled ones visibly marked. | Must | US-22 · UC-11 | `GET /sessions` |
| FR-21 | Trainers shall see their own sessions grouped by today/week/past, defaulting to self as scheduler. | Should | US-23 · UC-11 | `GET /sessions?scope=me` |

## FR group E — Enrollment

| ID | Requirement | Pri | From | Realized by |
|---|---|---|---|---|
| FR-22 | Enrollment shall require: authenticated self or staff, member ACTIVE with `ACTIVE` membership, session `SCHEDULED` and future, no existing non-cancelled enrollment, and capacity (count of `ENROLLED` under transaction) — enforced atomically so concurrent requests cannot oversell. | Must | US-24, US-25, US-26 · UC-13 | `POST /sessions/:id/enrollments` (R3) |
| FR-23 | Enrollments may be cancelled (self or staff) until 120 minutes before start; the row is kept as `CANCELLED` and capacity is freed. | Should | US-27 · UC-14 | `DELETE …/enrollments/…` |
| FR-24 | Members shall see their personal schedule (upcoming with cancel action, past with attendance status) with a designed empty state. | Should | US-28 · UC-13, UC-14 | frontend schedule page |

## FR group F — Attendance

| ID | Requirement | Pri | From | Realized by |
|---|---|---|---|---|
| FR-25 | The session trainer (or manager/admin) shall upsert attendance (`PRESENT`/`LATE`/`ABSENT`) per enrolled member after the session window; one record per enrollment; non-owners → 403. | Must | US-29 · UC-15 | `GET/POST /sessions/:id/attendance` (R4) |
| FR-26 | Managers shall review any session's attendance with counts and status filters. | Should | US-30 · UC-15 | attendance read endpoints |
| FR-27 | Members shall see their own attendance history and summary counts only. | Should | US-31 · UC-15 | `GET /me/attendance` |

## FR group G — Payments

| ID | Requirement | Pri | From | Realized by |
|---|---|---|---|---|
| FR-28 | Staff shall record a payment (member, amount > 0, type, method, note) as `COMPLETED` with actor recorded. | Must | US-32 · UC-16 | `POST /payments` (R6) |
| FR-29 | Payment history shall support server-side filters (member, date range, method, type, status), pagination, and filtered totals. | Should | US-33 · UC-16 | `GET /payments` |
| FR-30 | Refund shall be offered as a row action only for eligible payments and permitted roles. | Should | US-34 · UC-09 | refund endpoint + UI guard |

## FR group H — Dashboard & notifications

| ID | Requirement | Pri | From | Realized by |
|---|---|---|---|---|
| FR-31 | The dashboard shall return role-filtered aggregations (counts, today's classes/attendance, expiring memberships, upcoming classes, recent activity) matching underlying list pages. | Must | US-35 · UC-19 | `GET /dashboard` |
| FR-32 | Revenue shall be computed from `COMPLETED` payments as a 12-month series; no fabricated data; designed empty state when zero. | Should | US-36 · UC-19 | dashboard endpoint |
| FR-33 | The system shall create notifications on membership activation, enrollment (create/cancel), session cancellation, and payment; users shall list/read/mark-all their own only. | Should | US-37 · UC-20 | notifications module (R9) |
| FR-34 | Staff dashboards shall show a bounded recent-activity feed from business events in `ActivityLog`. | Could | US-38 · UC-19 | dashboard endpoint |
| FR-35 | Quick actions shall render only for roles allowed to perform them and open the real flows. | Should | US-39 · UC-19 | dashboard UI |

## FR group I — Administration

| ID | Requirement | Pri | From | Realized by |
|---|---|---|---|---|
| FR-36 | Admins shall manage facilities; inactive facilities cannot host new sessions. | Should | US-40 · UC-17 | `CRUD /facilities` |
| FR-37 | Admins shall manage staff accounts (create non-member roles, edit role/status, reset password), guarded by `LAST_ADMIN`, all mutations logged. | Must | US-41 · UC-18 | `CRUD /users` |
| FR-38 | Trainer profiles (specialization, bio) shall be managed by admin; trainers may edit only their own bio; displayed on class/schedule pages. | Should | US-42 · UC-18 | `PATCH /trainers/:id` |
| FR-39 | The full authorization matrix (role × resource × action) shall be enforced by API middleware and covered by automated tests. | Must | US-43 · all UCs | RBAC middleware + test suite |
| FR-40 | Every page shall implement loading, empty, error, and permission-denied states; forms validate inline with pending/success handling; destructive actions require confirmation. | Must | US-44 · all UCs | frontend state conventions |
