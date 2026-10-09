# Stage 1 — System Analysis

Sports Club Management System — domain analysis: actors, core classes, and the rules that every later stage (database, use cases, stories, requirements, implementation) must stay consistent with.

## Actors

| Actor | Description | Primary capabilities |
|---|---|---|
| **Administrator** | Full system control | All CRUD, user/role management, plans, facilities, settings, all reports |
| **Manager** | Club operations | Members, memberships, classes, schedules, payments, reports; no system/user-role administration |
| **Trainer** | Coach delivering classes | Own schedule, mark attendance, manage own class sessions, view enrolled members |
| **Receptionist** | Front-desk staff | Register members, record payments, enroll members in classes, view schedules |
| **Member** | Club customer | Own profile, own memberships, browse classes, enroll/cancel, own attendance and payments |
| **System** | Automated behavior | Membership expiry, capacity enforcement, notifications, dashboard aggregation |

## Core classes

| Class | Responsibility |
|---|---|
| `User` | Account + authentication (email, password hash, role, status) |
| `Member` | Member profile and club-side identity; 1:1 with a `MEMBER` user |
| `Trainer` | Coach profile (specialization, bio); 1:1 with a `TRAINER` user |
| `MembershipPlan` | Sellable plan: name, duration days, price, active flag |
| `Membership` | A member's purchased plan instance with start/end dates and status |
| `FitnessClass` | Class template (name, category, capacity, description) |
| `ClassSession` | A scheduled occurrence of a class: trainer, facility, start/end time, status |
| `Enrollment` | A member's registration for a specific session (capacity- and duplicate-checked) |
| `Attendance` | Present/absent/late mark for one enrolled member in one session |
| `Payment` | Monetary record: amount, method, type, status, processor |
| `Facility` | Bookable room/space (gym floor, studio, pool, court) with capacity |
| `Notification` | Per-user message (info/warning/reminder) with read state |
| `ActivityLog` | Audit-style trail powering "recent activity" |

## Domain rules (normative)

These rules drive Stage 2 constraints, Stage 3 flows, Stage 5 requirements, and Stage 7 server-side validation/tests.

1. **R1 — Membership activation**: a `Membership` becomes `ACTIVE` only through a `COMPLETED` payment; `endDate = startDate + plan.durationDays`. Only one `ACTIVE` membership per member at a time.
2. **R2 — Membership lifecycle**: memberships whose `endDate` has passed are `EXPIRED`; expired/cancelled memberships cannot be used for enrollment.
3. **R3 — Enrollment**: allowed only if the member is `ACTIVE`, holds an `ACTIVE` membership, the session is `SCHEDULED` and starts in the future, capacity (`enrolled < FitnessClass.capacity`) is not exhausted, and the member has no existing non-cancelled enrollment for that session.
4. **R4 — Attendance**: only for an enrolled member; recorded by the session's trainer or a manager/admin, only during or after the session window; upsert semantics (one attendance record per member per session).
5. **R5 — Scheduling conflicts**: a trainer may not be assigned to two `SCHEDULED` sessions with overlapping times; neither may a facility. Sessions require a valid facility and trainer.
6. **R6 — Payments**: `amount > 0`; `COMPLETED` payments are immutable (a refund creates a `REFUNDED` state, never an edit of the amount); every payment references a member and a processor.
7. **R7 — Authentication**: login by email + password (bcrypt), issued as an httpOnly JWT cookie; only `ACTIVE` users may authenticate; login endpoints are rate-limited.
8. **R8 — Authorization (server-enforced)**: members read only their own data; trainers read only their own sessions' rosters; receptionists manage members/enrollments/payments; managers add reports/class management; admins additionally manage users, roles, plans, and facilities. Frontend hiding is never the security boundary.
9. **R9 — Notifications**: created on membership activation, enrollment confirmation/cancellation, session cancellation, and payment completion.

## Scope deliberately excluded

Recurring/generating schedules (sessions are created individually), waitlists, refunds as a separate entity, multi-branch/tenant support, point-of-sale inventory, locker management. Excluded to keep the project academically manageable; nothing in later stages may assume these exist.

## Diagram index

- [Class diagram](class-diagram.md)
- Sequence diagrams: [member registration](sequence/member-registration.md) · [login](sequence/login.md) · [membership activation](sequence/membership-activation.md) · [class enrollment](sequence/class-enrollment.md) · [attendance](sequence/attendance.md) · [payment](sequence/payment.md) · [trainer scheduling](sequence/trainer-scheduling.md)
- Activity diagrams: [member registration](activity/member-registration.md) · [membership purchase](activity/membership-purchase.md) · [class enrollment](activity/class-enrollment.md) · [attendance recording](activity/attendance-recording.md) · [class scheduling](activity/class-scheduling.md)
- [Validation report](validation.md)
