# UC-17 — Manage facilities

- **Actors**: Administrator (primary; Manager may view)
- **Preconditions**: actor is `ADMIN` for mutations
- **Realization**: `GET/POST/PATCH /api/v1/facilities`

## Main flow

1. Admin opens **Facilities**.
2. Admin adds a room (name, type, capacity, description) or edits details / toggles status.
3. System validates (unique name, `capacity > 0`).
4. System persists; scheduling (UC-11) only offers `ACTIVE` facilities.

## Alternative flows

- **4a Set `INACTIVE`**: existing sessions keep the room for history; new sessions cannot be booked (UC-11 returns `FACILITY_UNAVAILABLE`).

## Error flows

- **E1** `422` · **E2** `409` duplicate name · **E3** `403` non-admin mutation attempt.

## Postconditions

- Facility catalog updated; conflict checks (UC-11) use the same table.

---

# UC-18 — Manage user accounts and roles

- **Actors**: Administrator
- **Preconditions**: actor is `ADMIN`
- **Realization**: `GET/POST/PATCH /api/v1/users` (list/create/update role & status; password reset by admin sets a new temporary password)

## Main flow

1. Admin opens **Users** (all accounts with roles).
2. Admin creates a staff account (role ≠ `MEMBER` — member accounts are created via UC-03) or edits role/status/phone or resets a password.
3. System validates role transitions and email uniqueness; hashes new passwords (bcrypt).
4. System persists and writes `ActivityLog`.

## Alternative flows

- **2a Deactivate user**: `UserStatus=INACTIVE`; sessions rejected at next request (middleware re-reads status) and login blocked (UC-01 E2).
- **2b Demote an admin**: forbidden if it would leave zero active admins (`LAST_ADMIN` guard).

## Error flows

- **E1** `422` · **E2** `409` email taken · **E3** `403` (non-admin) · **E4** `409 LAST_ADMIN`.

## Postconditions

- Accounts and roles consistent with R8; deactivated users immediately lose API access.
