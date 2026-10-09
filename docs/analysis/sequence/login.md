# Sequence — Login

```mermaid
sequenceDiagram
    actor U as Any user
    participant UI as Frontend
    participant API as Express API
    participant DB as PostgreSQL

    U->>UI: Enter email + password
    UI->>API: POST /api/v1/auth/login
    API->>API: rate limit check (per IP + email)
    API->>API: zod validation
    API->>DB: SELECT User WHERE email
    alt user not found or bad password
        API-->>UI: 401 {error: "INVALID_CREDENTIALS"}
        UI-->>U: Same error for both cases (no enumeration)
    else user status != ACTIVE
        API-->>UI: 403 {error: "ACCOUNT_DISABLED"}
    else credentials valid
        API->>API: sign JWT (sub, role, exp 8h)
        API-->>UI: 200 Set-Cookie: token (httpOnly, SameSite=Lax) + profile
        UI->>UI: route by role (admin/manager/trainer/receptionist/member)
        UI-->>U: Dashboard
    end
```

**Notes**: identical error for unknown email vs wrong password (no account enumeration); JWT is never readable by JS (httpOnly) — rule R7. Logout (`POST /api/v1/auth/logout`) clears the cookie.
