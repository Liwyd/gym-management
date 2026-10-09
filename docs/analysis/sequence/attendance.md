# Sequence — Attendance Registration

```mermaid
sequenceDiagram
    actor T as Trainer (or Manager)
    participant UI as Frontend
    participant API as Express API
    participant DB as PostgreSQL

    T->>UI: Open own session → roster
    UI->>API: GET /api/v1/sessions/:id/attendance
    API->>DB: SELECT enrollments + existing attendance
    API-->>UI: 200 roster with marks
    T->>UI: Mark PRESENT / LATE / ABSENT per member
    UI->>API: POST /api/v1/sessions/:id/attendance {memberId, status}
    API->>API: auth: session.trainer == T, or MANAGER/ADMIN
    alt not the trainer of this session
        API-->>UI: 403 {error: "FORBIDDEN"}
    else session still SCHEDULED (not yet run)
        API-->>UI: 409 {error: "SESSION_NOT_HELD"}
    else member not enrolled
        API-->>UI: 404 {error: "NOT_ENROLLED"}
    else ok
        API->>DB: UPSERT Attendance(status, recordedBy, recordedAt)
        API->>DB: COMMIT
        API-->>UI: 200 {data: attendance}
        UI-->>T: Roster updated (badge per status)
    end
```

**Notes**: upsert keeps rule R4 (one attendance row per member per session, unique constraint in Stage 2); trainers only ever see rosters of their own sessions (R8).
