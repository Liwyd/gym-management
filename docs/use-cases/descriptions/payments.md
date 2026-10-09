# UC-16 — Record payment

- **Actors**: Receptionist (primary), Manager, Administrator
- **Preconditions**: member exists and is `ACTIVE`; actor authorized (R8)
- **Realization**: `POST /api/v1/payments` · sequence: [payment recording](../../analysis/sequence/payment.md) · «included by» UC-07 · rule R6

## Main flow

1. Actor opens **Payments → Record payment** (member picker, amount, method, type, note).
2. System validates (`amount > 0`, enums).
3. If `type=MEMBERSHIP_PURCHASE` with `planId`: system prices from the plan and activates a membership (UC-07 flow).
4. Otherwise (`CLASS_FEE`, `OTHER`): system stores a `COMPLETED` payment with the entered amount.
5. System writes `ActivityLog` and shows a receipt-style success view.

## Alternative flows

- **3a Method `CASH`**: no external integration; purely recorded (POS integrations out of scope).

## Error flows

- **E1** `422` amount/enum errors · **E2** `404` unknown member · **E3** `403` for `TRAINER`/`MEMBER` (members pay only through UC-07 self-service).

## Postconditions

- One `COMPLETED` `Payment` row (immutable afterwards, R6); member history and revenue dashboard reflect it immediately.
