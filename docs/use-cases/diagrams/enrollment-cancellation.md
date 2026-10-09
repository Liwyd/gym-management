# UC-14 Support — Enrollment Cancellation Activity

```mermaid
flowchart TD
    A([Start]) --> B[Actor opens enrollment<br/>member self or staff]
    B --> C[Click Cancel]
    C --> D{Authorized?<br/>self or RECEPTIONIST/MANAGER/ADMIN}
    D -- No --> E[403 FORBIDDEN]
    D -- Yes --> F{Enrollment ENROLLED<br/>and session not completed?}
    F -- No --> G[404 or 409]
    F -- Yes --> H{Session starts within<br/>cutoff (default 120 min)?}
    H -- Yes --> I[409 ENROLLMENT_LOCKED]
    H -- No --> J[Confirm dialog]
    J --> K{Confirmed?}
    K -- No --> L([End — no change])
    K -- Yes --> M[Set Enrollment.status = CANCELLED]
    M --> N[Notify member + ActivityLog]
    N --> O{DB error?}
    O -- Yes --> P[Error toast, row unchanged]
    O -- No --> Q([End — capacity freed])
```

Capacity counts only `ENROLLED` rows (UC-13), so the freed spot is immediately available again.
