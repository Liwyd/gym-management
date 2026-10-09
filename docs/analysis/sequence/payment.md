# Sequence — Payment Recording (front desk)

Receptionist records a payment (cash/card/transfer). If it purchases a membership, activation happens in the same transaction; otherwise it is a class fee or other charge.

```mermaid
sequenceDiagram
    actor R as Receptionist
    participant UI as Frontend
    participant API as Express API
    participant DB as PostgreSQL

    R->>UI: Payments → "Record payment" (member, amount, method, type)
    UI->>API: POST /api/v1/payments {memberId, amount, method, type, planId?}
    API->>API: auth: RECEPTIONIST / MANAGER / ADMIN
    API->>API: zod validation (amount > 0, enum method/type)
    API->>DB: SELECT Member (ACTIVE)
    alt type = MEMBERSHIP_PURCHASE and planId provided
        API->>DB: BEGIN
        API->>DB: INSERT Payment(COMPLETED, paidAt=now)
        API->>DB: INSERT Membership(ACTIVE, start, end) — checks R1
        API->>DB: INSERT Notification + ActivityLog
        API->>DB: COMMIT
        API-->>UI: 201 {payment, membership}
    else type = CLASS_FEE or OTHER
        API->>DB: INSERT Payment(COMPLETED, paidAt=now)
        API->>DB: INSERT ActivityLog(action=PAYMENT_RECORDED)
        API-->>UI: 201 {payment}
    end
    UI-->>R: Receipt view + updated balances
```

**Notes**: `amount` is never read from the client-calculated total alone — the server derives membership price from `MembershipPlan.price` (prevents price manipulation, rule R6); failed validation → `422` with field errors; refunds are a manager/admin action flipping status, never editing the row.
