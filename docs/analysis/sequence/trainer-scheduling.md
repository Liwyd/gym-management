# Sequence — Trainer Scheduling

Trainer (or manager/admin) creates a class session; overlapping trainer/facility assignments are rejected (rule R5).

```mermaid
sequenceDiagram
    actor T as Trainer / Manager
    participant UI as Frontend
    participant API as Express API
    participant DB as PostgreSQL

    T->>UI: Schedule → "New session" (class, date, times, facility)
    UI->>API: POST /api/v1/sessions {classId, startsAt, endsAt, facilityId, trainerId?}
    API->>API: auth: MANAGER/ADMIN, or TRAINER for own trainerId
    API->>API: zod validation (endsAt > startsAt, ISO dates)
    alt class missing or inactive
        API-->>UI: 404 {error: "CLASS_UNAVAILABLE"}
    else facility missing / not ACTIVE
        API-->>UI: 404 {error: "FACILITY_UNAVAILABLE"}
    else trainer or facility already booked in overlap window (SCHEDULED)
        API-->>UI: 409 {error: "SCHEDULE_CONFLICT"}
        UI-->>T: Show conflicting session inline
    else ok
        API->>DB: INSERT ClassSession(status=SCHEDULED)
        API->>DB: INSERT Notification(session scheduled) to trainer
        API->>DB: INSERT ActivityLog(action=SESSION_SCHEDULED)
        API-->>UI: 201 {data: session}
        UI-->>T: Session appears in schedule calendar
    end
```

**Notes**: overlap detection is a range query (`startsAt < :end AND endsAt > :start`) on `SCHEDULED` sessions filtered by trainer and by facility — two separate checks; final guarantee is the Stage 2 index + a DB exclusion-style uniqueness check performed inside the insert transaction.
