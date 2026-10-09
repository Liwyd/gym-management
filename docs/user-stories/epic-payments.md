# Epic E7 — Payments (UC-16)

## US-32 — Record a payment at the desk
**As a** receptionist, **I want to** record a payment (class fee or other charge), **so that** the cash book matches reality.
- Priority: **High** · Use case: UC-16 · Status: Specified
- AC1: Dialog: member picker, amount, type, method, optional note; validation `amount > 0` and enum values.
- AC2: Success shows a receipt-style confirmation and the payment appears in history immediately.
- AC3: Membership purchases reuse the same flow with server-side pricing (US-12/13).

## US-33 — Payment history with filters
**As a** manager, **I want to** browse payment history (by member, date range, method, type), **so that** I can reconcile and investigate.
- Priority: **Medium** · Use case: UC-16 · Status: Specified
- AC1: Server-side filtering + pagination; totals shown for the filtered set.
- AC2: Refunded payments are visibly distinct; amount and status come from the immutable record (R6).

## US-34 — Refund from history
**As a** manager, **I want to** trigger a refund from a payment row, **so that** I don't need a separate screen.
- Priority: **Medium** · Use case: UC-09 · Status: Specified
- AC1: Row action appears only for eligible (completed, non-refunded) payments and permitted roles.
- AC2: Follows US-16 behavior exactly (payment `REFUNDED`, linked membership `CANCELLED`).
