# UC-03 — Create member account

- **Actors**: Receptionist (primary), Manager, Administrator
- **Preconditions**: actor authenticated with one of the three roles; unique email not yet registered
- **Realization**: `POST /api/v1/members` · sequence: [member registration](../../analysis/sequence/member-registration.md) · activity: [member registration](../../analysis/activity/member-registration.md)

## Main flow

1. Actor opens **Members → Add member** and fills identity, contact, and optional profile fields.
2. System validates all fields (email format, names required).
3. System checks email uniqueness.
4. System creates `User` (role `MEMBER`, status `ACTIVE`, bcrypt-hashed password) and `Member` (generated `memberCode`) in one transaction.
5. System writes an `ActivityLog` entry.
6. System returns the member; UI shows the new code and (if generated) the temporary password once.

## Alternative flows

- **1a Actor leaves password blank**: system generates a temporary password and displays it once.
- **4a Duplicate race** (two clerks, same email): unique index rejects the second insert → `409 EMAIL_TAKEN`.

## Error flows

- **E1** Invalid fields → `422` with per-field errors, form keeps input.
- **E2** Email already registered → `409 EMAIL_TAKEN`.
- **E3** Not authorized (e.g., a `TRAINER` calls the endpoint) → `403 FORBIDDEN` (server-side, R8).

## Postconditions

- One `User` + one `Member` exist; member can log in immediately; member is not yet enrolled in any plan.

---

# UC-04 — Search and view members

- **Actors**: Receptionist (primary), Manager, Administrator
- **Preconditions**: actor authenticated
- **Realization**: `GET /api/v1/members` (paginated, filters: search string, status) · members also see only themselves via `GET /api/v1/members/me` (R8)

## Main flow

1. Actor opens **Members** list.
2. System returns a paginated list (default sort: newest first) including membership summary (plan, status, expiry).
3. Actor types in search (name, email, member code) → system filters server-side.
4. Actor opens a member → system returns profile with memberships, enrollments, payments (scoped tabs).

## Alternative flows

- **2a Empty database**: system shows the designed empty state (never a blank screen).

## Error flows

- **E1** Invalid pagination params → `422`.
- **E2** Actor is `MEMBER` accessing another member → `403` (R8).

## Postconditions

- No data mutation; list remains consistent with filters.

---

# UC-05 — Edit member profile

- **Actors**: Receptionist, Manager, Administrator
- **Preconditions**: member exists; actor authorized
- **Realization**: `PATCH /api/v1/members/:id`

## Main flow

1. Actor opens **Edit** on a member.
2. System validates input; actor submits changes (contact info, emergency contact, notes, status).
3. System updates the `Member` (and `User` name/phone fields) in one transaction and writes `ActivityLog`.
4. UI shows success toast and refreshed data.

## Alternative flows

- **2a Status set to `INACTIVE`**: future logins for that member are blocked (`ACCOUNT_DISABLED`) and enrollment attempts fail (`NO_ACTIVE_MEMBERSHIP` path via member status check).

## Error flows

- **E1** `422` invalid input · **E2** `404` unknown member · **E3** `403` wrong role.

## Postconditions

- Profile updated; immutable fields (`memberCode`, `joinedAt`) untouched.
