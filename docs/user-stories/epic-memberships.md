# Epic E3 — Plans & Memberships (UC-06, UC-07, UC-08, UC-09)

## US-11 — Manage membership plans
**As an** administrator, **I want to** create, edit, and deactivate membership plans, **so that** pricing reflects the current offering.
- Priority: **High** · Use case: UC-06 · Status: Specified
- AC1: CRUD with validation (`durationDays > 0`, `price > 0`, unique name).
- AC2: Deactivating a plan hides it from purchase options but keeps existing memberships intact.
- AC3: Only ADMIN can mutate; others get 403 (R8).

## US-12 — Purchase membership (self-service)
**As a** member, **I want to** buy a plan online, **so that** my access starts immediately.
- Priority: **High** · Use case: UC-07 · Status: Specified
- AC1: The confirm dialog shows plan, price, and computed expiry date before paying.
- AC2: After confirmation, payment is `COMPLETED` and membership `ACTIVE` with `endDate = start + durationDays` (R1) — atomically.
- AC3: Price comes from the plan server-side; tampered client amounts are ignored (R6).
- AC4: Success view shows the expiry date; dashboard membership widget updates.

## US-13 — Staff purchase on behalf of a member
**As a** receptionist, **I want to** activate a membership for a member at the desk (including cash), **so that** walk-ins can join.
- Priority: **High** · Use case: UC-07, UC-16 · Status: Specified
- AC1: Member picker + plan picker + payment method (cash/card/transfer) in one dialog.
- AC2: Same server rules as self-service (active plan, no second active membership).

## US-14 — One active membership guard
**As a** system, **I want to** reject a second active membership, **so that** expiry and access rules stay unambiguous.
- Priority: **High** · Use case: UC-07 · Status: Specified
- AC1: Buying while an `ACTIVE` membership exists → 409 with a clear message; no payment row is created.
- AC2: Enforced server-side (DB/service), not just hidden in the UI (R1).

## US-15 — Automatic membership expiry
**As a** system, **I want to** mark passed memberships as expired, **so that** enrollment checks and reports are correct without manual work.
- Priority: **Medium** · Use case: UC-08 · Status: Specified
- AC1: Expired memberships (`endDate < today`) become `EXPIRED` automatically (daily job + on-start sweep).
- AC2: Expired member attempting enrollment gets the `NO_ACTIVE_MEMBERSHIP` rejection (R2/R3).

## US-16 — Refund payment / cancel membership
**As a** manager, **I want to** refund a payment and cancel the linked membership, **so that** disputes are resolved without editing history.
- Priority: **Medium** · Use case: UC-09 · Status: Specified
- AC1: Confirmation dialog shows amount and affected membership.
- AC2: Payment becomes `REFUNDED`, membership `CANCELLED`; the original amount is never modified (R6).
- AC3: Non-manager roles get 403; double refund → 409.

## US-17 — Expiring memberships visibility
**As a** receptionist, **I want to** see memberships expiring soon, **so that** I can prompt renewals at the desk.
- Priority: **Medium** · Use case: UC-08, UC-19 · Status: Specified
- AC1: Dashboard/list shows memberships expiring within 14 days, sorted by nearest expiry.
- AC2: Empty state when nothing is expiring (designed, not a blank card).
