# Stage 2 — Database Design

PostgreSQL + Prisma. Schema source: [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma) · ERD: [`erd.md`](erd.md) · Stage 1 rules: [`../analysis/README.md`](../analysis/README.md).

## Class → table mapping

Every Stage 1 class became exactly one table; enum literals are identical to the Stage 1 class-diagram notes (`Role`, `UserStatus`, `MemberStatus`, `TrainerStatus`, `MembershipStatus`, `SessionStatus`, `EnrollmentStatus`, `AttendanceStatus`, `PaymentStatus`, `PaymentMethod`, `PaymentType`, `FacilityType`, `FacilityStatus`, `NotificationType`). Two intentional refinements:

- `Attendance` hangs off `Enrollment` (unique `enrollmentId`) instead of duplicating member/session keys — matches Stage 1 cardinality `Enrollment 1 → 0..1 Attendance` and makes R4 self-enforcing.
- `Membership.paymentId` (unique, nullable) is the activation link — a `COMPLETED` payment may exist without a membership (class fees), but no `ACTIVE` membership can exist without a payment (R1).

## Normalization

Third normal form: no repeating groups, every non-key attribute depends on the key (`Member` stores profile facts keyed by `memberId`; names live only on `User`; prices live only on `MembershipPlan` and are copied into `Payment.amount` at purchase time as an immutable transaction record — a deliberate, documented denormalization for auditability under R6).

## Keys and constraints

| Constraint | Purpose |
|---|---|
| `User.email` unique | login identity, prevents duplicates (R7) |
| `Member.userId` / `Trainer.userId` unique | exactly one profile per account (Stage 1 composition rule) |
| `Member.memberCode` unique | human-facing lookup code |
| `MembershipPlan.name`, `FitnessClass.name`, `Facility.name` unique | stable, referencable catalog entries |
| `Membership.paymentId` unique | one membership per payment, no double activation |
| `Enrollment (memberId, sessionId)` unique | duplicate enrollment impossible (R3) |
| `Attendance.enrollmentId` unique | one attendance row per enrollment (R4) |
| FK `onDelete` policy | `Cascade` for profile/child data (`Member`, `Notification`, `Enrollment`→`Attendance`), `Restrict` where money/history must survive (`Payment.member`), `SetNull` for actors (`recordedBy`, `processedBy`, `actorId`) |

Value checks (`amount > 0`, `endsAt > startsAt`, `durationDays > 0`) are enforced by zod validation in Stage 7 and are part of the Stage 7 test suite. Prisma does not emit `CHECK` clauses into the schema DSL, and adding hand-written SQL that `prisma db push` would not recreate would create drift; application-level validation plus tests is the chosen trade-off (documented, not accidental).

## Indexes (all FKs and hot query columns; nothing extra)

Postgres does **not** index FK columns automatically.

| Index | Justification |
|---|---|
| `User.email` (unique) | every login and permission lookup |
| `Membership(memberId, status)` | R2/R3 checks: "does this member have an ACTIVE membership?" on every enrollment |
| `ClassSession(startsAt)` | schedule/calendar pages and "upcoming classes" ordered by time |
| `ClassSession(trainerId, startsAt)` | trainer's own schedule; overlap check for R5 |
| `ClassSession(facilityId, startsAt)` | facility conflict check for R5 |
| `ClassSession(classId)` | sessions of a class in the catalog |
| `Enrollment(sessionId, status)` | capacity count during enrollment inside the transaction (R3) |
| `Payment(memberId, paidAt)` | member payment history |
| `Payment(paidAt)` | dashboard revenue aggregation over time |
| `Notification(userId, createdAt)` / `(userId, readAt)` | bell-menu: unread count + recent list |
| `ActivityLog(createdAt)` | "recent activity" feed |

Deliberately **not** indexed: low-cardinality status columns alone (`role`, `status` enums) — table scans are correct at this scale, and composite indexes above already cover the real predicates.

## Migration

- `backend/prisma/migrations/0001_init/migration.sql` — full initial DDL, generated with `prisma migrate diff --from-empty --to-schema-datamodel`, applied with `prisma migrate deploy` (empty history) or `prisma db push` (development).
- `DATABASE_URL` comes only from the environment (see root `.env.example`).

## Seed

`backend/prisma/seed.ts` creates a realistic, presentable demo: 7 staff accounts (admin, manager, receptionist, 4 trainers), 18 members, 4 plans, 5 facilities, 6 classes, 38 sessions (4 weeks of completed history + today + next week), enrollments with attendance on past sessions, ~27 completed payments across 6 months (dashboard revenue has real data), memberships mostly active plus expired/cancelled examples, notifications and activity entries. Single demo password for every account: `Password123!` (documented, demo-only).
