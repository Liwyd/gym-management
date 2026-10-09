# Sequence — Class Enrollment

Capacity, duplicate and membership checks are enforced server-side inside a transaction (rule R3).

```mermaid
sequenceDiagram
    actor M as Member (or Receptionist)
    participant UI as Frontend
    participant API as Express API
    participant DB as PostgreSQL

    M->>UI: Open session detail, click "Enroll"
    UI->>API: POST /api/v1/sessions/:id/enrollments
    API->>API: auth: self (MEMBER) or RECEPTIONIST/MANAGER/ADMIN
    API->>DB: BEGIN
    API->>DB: SELECT ClassSession (with class capacity)
    alt session missing
        API-->>UI: 404 {error: "SESSION_NOT_FOUND"}
    else session cancelled or already started
        API-->>UI: 409 {error: "SESSION_NOT_OPEN"}
    else member has no ACTIVE membership
        API-->>UI: 403 {error: "NO_ACTIVE_MEMBERSHIP"}
    else duplicate non-cancelled enrollment exists
        API-->>UI: 409 {error: "ALREADY_ENROLLED"}
    else capacity exhausted (count at class capacity)
        API-->>UI: 409 {error: "SESSION_FULL"}
    else ok
        API->>DB: SELECT COUNT(enrollments) FOR the session (locked read)
        API->>DB: INSERT Enrollment(status=ENROLLED)
        API->>DB: INSERT Notification(enrollment confirmed)
        API->>DB: INSERT ActivityLog(action=MEMBER_ENROLLED)
        API->>DB: COMMIT
        API-->>UI: 201 {data: enrollment}
        UI-->>M: Success + "My schedule" updated
    end
```

**Notes**: capacity re-checked inside the transaction (count of `ENROLLED` rows) so two concurrent requests cannot oversell the session; cancellation reverses by setting `Enrollment.status = CANCELLED`, freeing capacity.
