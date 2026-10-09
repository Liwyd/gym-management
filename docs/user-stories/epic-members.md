# Epic E2 — Members (UC-03, UC-04, UC-05)

## US-06 — Create member account
**As a** receptionist, **I want to** register a new member, **so that** they can start using the club the same day.
- Priority: **High** · Use case: UC-03 · Status: Specified
- AC1: The form collects name, email, phone, and optional profile fields with inline validation.
- AC2: On success the member appears at the top of the list with a generated member code; a one-time temporary password is shown.
- AC3: Duplicate email → clear "email already registered" error; no data lost in the form.
- AC4: Trainers/members calling the API directly get 403 (R8).
- AC5: The account and member profile are created atomically (no half-created member).

## US-07 — Search and filter the member list
**As a** receptionist, **I want to** search members by name, email, or code and filter by status, **so that** I can find someone at the desk quickly.
- Priority: **High** · Use case: UC-04 · Status: Specified
- AC1: Search debounces server-side queries; results paginate (bounded page size).
- AC2: Empty result set shows a designed "No members found" state with a "clear filters" action.
- AC3: Loading shows skeleton rows; failure shows a retryable error state.

## US-08 — Member detail with related data
**As a** a manager, **I want to** open a member and see their memberships, enrollments, and payments, **so that** I can answer questions without switching pages.
- Priority: **High** · Use case: UC-04 · Status: Specified
- AC1: Detail page shows profile, current/expired membership history, upcoming/past enrollments, payment history — each tab with loading/empty/error states.
- AC2: Status badges (active/expired/cancelled, enrolled/cancelled, present/absent) are consistent design tokens, never raw enum strings.

## US-09 — Edit member profile
**As a** receptionist, **I want to** update a member's contact details and notes, **so that** records stay accurate.
- Priority: **Medium** · Use case: UC-05 · Status: Specified
- AC1: Only editable fields are editable; member code and join date are read-only.
- AC2: Saving shows success feedback; validation errors map to fields.
- AC3: Setting a member to inactive blocks their login and enrollment attempts.

## US-10 — Member sees own profile
**As a** member, **I want to** view my own profile and data, **so that** I can check my details without staff help.
- Priority: **Medium** · Use case: UC-04 · Status: Specified
- AC1: The member profile page shows only the logged-in member's data.
- AC2: Requesting another member's id via API returns 403/404 — never another member's data (IDOR prevention, R8).
