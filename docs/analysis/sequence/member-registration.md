# Sequence — Member Registration

Receptionist (or admin) registers a new member: account creation and member profile are one operation.

```mermaid
sequenceDiagram
    actor R as Receptionist
    participant UI as Frontend
    participant API as Express API
    participant DB as PostgreSQL

    R->>UI: Open "Add member", fill form
    UI->>API: POST /api/v1/members (cookie: JWT of R)
    API->>API: auth: requireRole(RECEPTIONIST, MANAGER, ADMIN)
    API->>API: zod validation (name, email, phone, DOB…)
    API->>DB: BEGIN
    alt email already exists
        API-->>UI: 409 {error: "EMAIL_TAKEN"}
    else ok
        API->>DB: bcrypt hash password
        API->>DB: INSERT User(role=MEMBER, status=ACTIVE)
        API->>DB: INSERT Member(userId, memberCode)
        API->>DB: INSERT ActivityLog(actor=RECEPTIONIST, action=MEMBER_CREATED)
        API->>DB: COMMIT
        API-->>UI: 201 {data: member}
        UI->>R: Success toast, form reset
    end
```

**Notes**: single transaction (no `User` without `Member`); email uniqueness enforced by DB constraint; server generates the temporary password if not supplied and returns it once to the receptionist. Corresponds to rule R8 (authorization) and Stage 7 `POST /api/v1/members`.
