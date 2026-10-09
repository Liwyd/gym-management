# Sequence — Membership Activation

Member buys a plan; payment completion and membership activation happen atomically (rule R1).

```mermaid
sequenceDiagram
    actor M as Member
    participant UI as Frontend
    participant API as Express API
    participant DB as PostgreSQL

    M->>UI: Browse plans, click "Join / Renew"
    UI-->>M: Confirm dialog (plan, price, dates)
    M->>UI: Confirm
    UI->>API: POST /api/v1/payments {planId, method}
    API->>API: auth: requireRole(MEMBER, RECEPTIONIST, MANAGER, ADMIN)
    API->>DB: SELECT MembershipPlan WHERE id AND isActive
    alt plan inactive / not found
        API-->>UI: 404 {error: "PLAN_UNAVAILABLE"}
    else member already has ACTIVE membership
        API-->>UI: 409 {error: "MEMBERSHIP_ALREADY_ACTIVE"}
    else ok
        API->>DB: BEGIN
        API->>DB: INSERT Payment(type=MEMBERSHIP_PURCHASE, status=COMPLETED, amount=plan.price)
        API->>DB: INSERT Membership(status=ACTIVE, start=today, end=today+durationDays, paymentId)
        API->>DB: INSERT Notification(welcome / activated)
        API->>DB: INSERT ActivityLog(action=MEMBERSHIP_ACTIVATED)
        API->>DB: COMMIT
        API-->>UI: 201 {data: {payment, membership}}
        UI-->>M: Success view with expiry date
    end
```

**Notes**: refund path later flips payment to `REFUNDED` and membership to `CANCELLED` (manager/admin only); if any step fails the transaction rolls back — no membership without a completed payment.
