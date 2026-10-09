# Epic E9 — Administration (UC-17, UC-18)

## US-40 — Manage facilities
**As an** administrator, **I want to** maintain facilities (name, type, capacity, status), **so that** scheduling only offers real rooms.
- Priority: **Medium** · Use case: UC-17 · Status: Specified
- AC1: CRUD with validation (unique name, capacity ≥ 1); status toggle `ACTIVE`/`INACTIVE`.
- AC2: Inactive facilities cannot be selected for new sessions (UC-11 returns `FACILITY_UNAVAILABLE`).
- AC3: Mutations restricted to ADMIN (R8).

## US-41 — Manage staff accounts and roles
**As an** administrator, **I want to** create staff accounts and change roles/status, **so that** access matches real job functions.
- Priority: **High** · Use case: UC-18 · Status: Specified
- AC1: Create user with any non-member role; edit role/status/phone; reset password (new temporary one shown once, stored bcrypt-hashed).
- AC2: Deactivated users are rejected at next authenticated request and at login (AC in US-01).
- AC3: The last active ADMIN cannot be demoted or deactivated (`409 LAST_ADMIN`).
- AC4: All mutations server-authorized (R8) and logged in `ActivityLog`.

## US-42 — Trainer profile management
**As an** administrator, **I want to** attach specialization and bio to trainer accounts, **so that** class pages show real coach information.
- Priority: **Medium** · Use case: UC-18, UC-10 · Status: Specified
- AC1: Trainer profile fields editable from user management; trainers may edit their own bio only.
- AC2: Trainer pages (schedule, class detail) display specialization/bio.

## US-43 — Members list permission boundaries
**As any** staff member, **I want** my accessible pages to match my role, **so that** I am not blocked by over-restriction nor handed excessive access.
- Priority: **High** · Use case: UC-04, UC-18 · Status: Specified
- AC1: Receptionist: members/enrollments/payments, no reports/settings. Manager: all operations + reports, no user/role admin. Admin: everything. Trainer: own sessions only. Member: self only.
- AC2: Every boundary enforced by API middleware tests (Stage 7), not just navigation.

## US-44 — Consistent error, loading, and empty states
**As a** user, **I want** every page to handle loading/empty/error/denied states, **so that** I never see a blank or raw error screen.
- Priority: **High** · Use case: all · Status: Specified
- AC1: Each list/page implements the four designed states (skeletons, empty-state copy + action, error + retry, 403 page).
- AC2: Forms show validation errors inline, disable submit while pending, and confirm success.
- AC3: Destructive actions (cancel session, refund, delete/deactivate) require an explicit confirmation dialog.
