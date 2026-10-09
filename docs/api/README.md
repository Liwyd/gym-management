# API Reference (v1)

Base URL: `/api/v1`. All responses use the shared envelope
(`{data, meta?}` on success, `{error:{code,message,details?}}` on failure).
Authentication is an httpOnly `pulsefit_access` cookie (POST `/auth/login`);
there are no bearer tokens. Every route except `GET /health`, `POST
/auth/login` and `POST /auth/logout` requires a valid session (`requireAuth`),
then a capability check (`authorize`), then object-level scoping.

Roles: **A**dmin · **M**anager · **T**rainer · **R**eceptionist · **M**ember.
The authoritative capability → roles table is
`backend/src/modules/auth/permissions.ts`.

## Auth & session

| Method | Path               | Capability      | Notes                                     |
| ------ | ------------------ | --------------- | ----------------------------------------- |
| POST   | `/auth/login`      | public          | rate-limited 10/15 min per IP             |
| POST   | `/auth/logout`     | public          | clears the cookie                         |
| GET    | `/auth/me`         | any session     | current user + role                       |
| PATCH  | `/auth/me`         | any session     | own profile (name, phone, password)       |
| GET    | `/health`          | public          | 200 when DB reachable, else 503           |

## Dashboard & notifications

| Method | Path                          | Capability     |
| ------ | ----------------------------- | -------------- |
| GET    | `/dashboard`                  | all roles (role-specific payload) |
| GET    | `/notifications`              | any session (own rows) |
| GET    | `/notifications/unread-count` | any session    |
| POST   | `/notifications/:id/read`     | owner          |
| POST   | `/notifications/read-all`     | any session    |

## Members

| Method | Path                | Capability     | Notes                                  |
| ------ | ------------------- | -------------- | -------------------------------------- |
| GET    | `/members`          | `members:list` (A,M,R) | offset pagination + `search`     |
| POST   | `/members`          | `members:write` (A,M,R) | registration with Member + login |
| GET    | `/members/:id`      | `members:read`  | members limited to their own row (403) |
| PATCH  | `/members/:id`      | `members:write` |                                        |
| GET    | `/members/me`       | member          | own member profile + `memberCode`      |
| PATCH  | `/members/me`       | member          | own profile                            |

## Plans, memberships, payments

| Method | Path                       | Capability          | Notes                                  |
| ------ | -------------------------- | ------------------- | -------------------------------------- |
| GET    | `/plans`                   | any session         | catalog (members need it to purchase)  |
| GET    | `/plans/:id`               | any session         |                                        |
| POST   | `/plans`                   | `plans:write` (A)   |                                        |
| PATCH  | `/plans/:id`               | `plans:write` (A)   |                                        |
| GET    | `/memberships`             | `memberships:list` (A,M,R) |                                |
| GET    | `/memberships/mine`        | member              | own memberships                        |
| GET    | `/memberships/:id`         | `memberships:read`  | scoped to own row for members          |
| POST   | `/memberships`             | `memberships:write` | purchase: creates ACTIVE membership + COMPLETED payment (R1, R2) |
| PATCH  | `/memberships/:id`         | `memberships:write` | `{refund:true}` cancels + refunds (A,M)| 
| GET    | `/payments`                | `payments:list` (A,M,R,M*) | members see own rows             |
| GET    | `/payments/:id`            | `payments:list`     | scoped                                 |
| POST   | `/payments`                | `payments:write` (A,M,R) | CLASS_FEE / OTHER only           |
| POST   | `/payments/:id/refund`     | `payments:refund` (A,M)  | COMPLETED → REFUNDED            |

## Classes, sessions, enrollment, attendance

| Method | Path                       | Capability        | Notes                                  |
| ------ | -------------------------- | ----------------- | -------------------------------------- |
| GET    | `/classes`                 | all roles         | `includeInactive` for staff            |
| POST   | `/classes`                 | `classes:write` (A,M) |                                     |
| PATCH  | `/classes/:id`             | `classes:write` (A,M) |                                     |
| GET    | `/sessions`                | all roles         | filters: `status`, `from`, `to`        |
| GET    | `/sessions/:id`            | all roles         |                                        |
| POST   | `/sessions`                | `sessions:write` (A,M,T) | capacity ≤ facility (R7)         |
| PATCH  | `/sessions/:id`            | `sessions:write`  |                                        |
| POST   | `/sessions/:id/cancel`     | `sessions:write`  | notifies enrolled members (R9)         |
| GET    | `/enrollments`             | all roles         | `sessionId` / `memberId` filters       |
| POST   | `/enrollments`             | `enrollments:write` | needs active membership (R3), capacity (R5) |
| POST   | `/enrollments/:id/cancel`  | `enrollments:write` | frees the spot                        |
| GET    | `/attendance`              | `attendance:read` (A,M,T) | trainers only their sessions    |
| POST   | `/attendance`              | `attendance:write` | batch `{sessionId, marks[]}` after start (R4) |

## Trainers, facilities, users

| Method | Path              | Capability            | Notes                                  |
| ------ | ----------------- | --------------------- | -------------------------------------- |
| GET    | `/trainers`       | `trainers:list` (A,M,R) |                                  |
| GET    | `/trainers/:id`   | `trainers:list`       |                                        |
| PATCH  | `/trainers/:id`   | any session           | scoped: own bio/spec; status needs `members:write` |
| GET    | `/facilities`     | `facilities:list` (A,M,T,R) |                              |
| POST   | `/facilities`     | `facilities:write` (A) |                                      |
| PATCH  | `/facilities/:id` | `facilities:write` (A) |                                      |
| GET    | `/users`          | `users:list` (A)      | staff accounts                         |
| GET    | `/users/:id`      | `users:list` (A)      |                                        |
| POST   | `/users`          | `users:write` (A)     | staff accounts only (members via `/members`) |
| PATCH  | `/users/:id`      | `users:write` (A)     | role/status guards (last admin rule)   |

## Error codes

`VALIDATION_ERROR` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `NOT_FOUND`
404 · `CONFLICT` / `STATE_CONFLICT` 409 · `MEMBERSHIP_REQUIRED` 403 ·
`CLASS_FULL` 409 · `ALREADY_ENROLLED` 409 · `NOT_ENROLLED` 403 ·
`SESSION_CANCELLED` 409 · `PAYMENT_INVALID` 409 · `PLAN_INACTIVE` 409 ·
`RATE_LIMITED` 429 · `SERVICE_UNAVAILABLE` 503.

Pagination: `?page=1&limit=20` (limit ≤ 100) → `meta:{page,limit,total,totalPages}`.
