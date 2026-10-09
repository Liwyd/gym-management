# UC-06 — Manage membership plans

- **Actors**: Administrator (primary; Manager may view only)
- **Preconditions**: actor is `ADMIN`
- **Realization**: `GET/POST/PATCH /api/v1/plans` (list/ create/ update; soft deactivation via `isActive`)

## Main flow

1. Admin opens **Plans**.
2. Admin creates a plan (name, duration days, price, description) or edits price/description of an existing one.
3. System validates (`durationDays > 0`, `price > 0`, unique name).
4. System persists and lists updated catalog.

## Alternative flows

- **4a Deactivate** (`isActive=false`): plan disappears from purchase options; existing `Membership` rows are unaffected (historical prices remain on their payments).

## Error flows

- **E1** `422` invalid values · **E2** `409` duplicate name · **E3** `403` non-admin.

## Postconditions

- Catalog reflects changes; purchase use case (UC-07) only offers active plans.

---

# UC-07 — Purchase / activate membership

- **Actors**: Member (self-service), Receptionist/Manager/Administrator (on behalf of a member)
- **Preconditions**: target member exists and is `ACTIVE`; at least one active plan exists; member has no other `ACTIVE` membership (R1)
- **Realization**: `POST /api/v1/payments` with `type=MEMBERSHIP_PURCHASE` · sequence: [membership activation](../../analysis/sequence/membership-activation.md) and [payment](../../analysis/sequence/payment.md) · activity: [membership purchase](../../analysis/activity/membership-purchase.md) · «includes» UC-16 · rules R1, R2, R6

## Main flow

1. Actor selects a plan (member: **Plans → Join**; staff: member detail → **New membership**).
2. System shows price and computed end date (`today + durationDays`).
3. Actor confirms; system creates a `COMPLETED` `Payment` (amount copied server-side from the plan) and an `ACTIVE` `Membership` in one transaction.
4. System sends an activation notification and writes `ActivityLog`.

## Alternative flows

- **1a Renewal before expiry while an active membership exists**: rejected (`MEMBERSHIP_ALREADY_ACTIVE`) — R1 allows only one active membership; extend-in-place is out of scope.
- **3a Staff records cash payment**: same flow, `method=CASH` chosen by staff.

## Error flows

- **E1** Plan missing/inactive → `404 PLAN_UNAVAILABLE` · **E2** already active → `409 MEMBERSHIP_ALREADY_ACTIVE` · **E3** payment failure (future card path) → `PENDING`/`FAILED` payment, no membership created · **E4** `403` member trying to buy for someone else.

## Postconditions

- One `COMPLETED` payment + one `ACTIVE` membership with `endDate = startDate + durationDays`; member can enroll in classes (UC-13).

---

# UC-08 — Expire memberships

- **Actors**: System (scheduled job, daily)
- **Preconditions**: memberships exist with `status=ACTIVE` and `endDate < today`
- **Realization**: backend job at server start + daily interval; sets `MembershipStatus.EXPIRED`; rule R2

## Main flow

1. Job queries `ACTIVE` memberships with `endDate < today`.
2. System updates each to `EXPIRED`.
3. System writes one `ActivityLog` batch entry with the count.

## Alternative flows

- **1a None due**: job exits without changes.

## Error flows

- **E1** Job failure is logged server-side; retried on next tick (never blocks API requests).

## Postconditions

- Expired members cannot enroll (UC-13 checks `ACTIVE` membership); dashboard "expiring soon" widget reads the same table.

---

# UC-09 — Refund payment and cancel membership

- **Actors**: Manager, Administrator
- **Preconditions**: payment exists with `status=COMPLETED`; if it activated a membership, that membership is still `ACTIVE`
- **Realization**: `POST /api/v1/payments/:id/refund` · «extends» UC-16 · rule R6

## Main flow

1. Manager opens payment history of a member, selects **Refund**.
2. System shows confirmation (amount, related membership).
3. System sets payment `REFUNDED` and, if linked, membership `CANCELLED`, in one transaction; writes `ActivityLog` + notification.

## Error flows

- **E1** Already refunded → `409` · **E2** non-completed payment → `409` · **E3** `403` for non-manager roles.

## Postconditions

- Original row is never edited (amount/status history preserved); member loses active membership and class eligibility.
