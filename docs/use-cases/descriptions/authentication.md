# UC-01 — Log in

- **Actors**: Administrator, Manager, Trainer, Receptionist, Member (any authenticated user)
- **Preconditions**: user account exists and is `ACTIVE`; user is on the login screen
- **Realization**: `POST /api/v1/auth/login` · sequence: [login](../../analysis/sequence/login.md) · activity: [login-activity](../diagrams/login-activity.md) · rule R7

## Main flow

1. User enters email and password, submits.
2. System validates input format (zod).
3. System rate-limits repeated attempts per IP and email.
4. System looks up the user by email and verifies the bcrypt hash.
5. System checks `UserStatus = ACTIVE`.
6. System signs a JWT (subject, role, 8h expiry) and sets it as an httpOnly, SameSite=Lax cookie.
7. System returns the profile (name, role) and the frontend routes by role.

## Alternative flows

- **3a Rate limit exceeded**: system returns `429`; user waits as instructed.
- **6a First login after password reset**: same flow (password reset itself is out of scope for v1; admin sets passwords directly).

## Error flows

- **E1** Email/password mismatch → `401 INVALID_CREDENTIALS` (identical message for unknown email and wrong password — no account enumeration).
- **E2** Account `INACTIVE` → `403 ACCOUNT_DISABLED`.
- **E3** Database unavailable → `500` generic error, no internals exposed.

## Postconditions

- Valid session cookie issued; role known to the frontend; an `ActivityLog` entry is **not** written per login (kept for business events only).

---

# UC-02 — Log out

- **Actors**: any authenticated user
- **Preconditions**: valid session cookie
- **Realization**: `POST /api/v1/auth/logout`

## Main flow

1. User selects logout (or is logged out by expiry).
2. System clears the session cookie.
3. Frontend resets state and returns to the login screen.

## Error flows

- **E1** No cookie present → `200` anyway (idempotent).

## Postconditions

- Cookie no longer accepted; subsequent API calls return `401`.
