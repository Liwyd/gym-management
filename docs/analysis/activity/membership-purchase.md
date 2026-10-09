# Activity — Membership Purchase / Activation

```mermaid
flowchart TD
    A([Start]) --> B[Member opens Plans]
    B --> C[Select plan → confirm dialog with price and dates]
    C --> D[POST /api/v1/payments type=MEMBERSHIP_PURCHASE]
    D --> E{Plan exists and isActive?}
    E -- No --> F[404 PLAN_UNAVAILABLE]
    F --> B
    E -- Yes --> G{Member already has ACTIVE membership?}
    G -- Yes --> H[409 MEMBERSHIP_ALREADY_ACTIVE]
    H --> B
    G -- No --> I[BEGIN transaction]
    I --> J[INSERT Payment COMPLETED amount = plan.price]
    J --> K[INSERT Membership ACTIVE<br/>start = today, end = today + durationDays]
    K --> L[INSERT welcome Notification + ActivityLog]
    L --> M{DB error?}
    M -- Yes --> N[ROLLBACK → error message]
    N --> C
    M -- No --> O[COMMIT]
    O --> P[Show success: expiry date]
    P --> Q([End — membership active])
```

**Notes**: price is taken server-side from the plan (rule R6); rollback guarantees "no membership without a completed payment" (rule R1). Later the same diagram covers expiry: a scheduled job marks `endDate < today` as `EXPIRED` (rule R2).
