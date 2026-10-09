# Epic E1 — Authentication & Sessions (UC-01, UC-02)

## US-01 — Login
**As a** club user, **I want to** log in with my email and password, **so that** I can access the features allowed for my role.
- Priority: **High** · Use case: UC-01 · Status: Specified
- AC1: Given a valid email/password, when I submit the login form, then I am routed to my role's dashboard and a session cookie is set (httpOnly).
- AC2: Given wrong credentials, when I submit, then I see one generic error ("Invalid email or password") — identical for unknown email and wrong password.
- AC3: Given an inactive account, when I submit valid credentials, then I see "Account disabled".
- AC4: Given repeated failed attempts, when the rate limit is hit, then I see a "try again later" message (HTTP 429), and the form re-enables after the window.
- AC5: All fields have labels; Enter submits; loading state disables the button.

## US-02 — Session persistence across tabs
**As a** user, **I want** my session to persist while I navigate, **so that** I am not asked to log in constantly.
- Priority: **High** · Use case: UC-01 · Status: Specified
- AC1: After login, any page load within the JWT lifetime (8h) keeps me authenticated.
- AC2: On app start, the frontend fetches `GET /auth/me`; 401 sends me to login with a "session expired" notice (no crash, no blank screen).

## US-03 — Role-based landing and navigation
**As a** user, **I want to** land on a dashboard that matches my role, **so that** I only see navigation I can actually use.
- Priority: **High** · Use case: UC-01, UC-19 · Status: Specified
- AC1: Each role lands on its role-filtered dashboard (UC-19) after login.
- AC2: Navigation hides items the role cannot access — **and** every protected route/API still returns 403 server-side when reached directly (R8; hidden nav is UX, not security).

## US-04 — Logout
**As a** user, **I want to** log out, **so that** my session ends on shared devices.
- Priority: **High** · Use case: UC-02 · Status: Specified
- AC1: Logout clears the cookie immediately and returns to the login screen.
- AC2: Logout twice (e.g., expired session) still ends at the login screen without an error toast.

## US-05 — Route protection with designed "permission denied"
**As a** user, **I want** a clear message when I open a page I may not use, **so that** I am never shown a blank or broken screen.
- Priority: **High** · Use case: UC-01 · Status: Specified
- AC1: Opening a route without login → redirected to login.
- AC2: Opening a route outside my role → designed 403 page ("You don't have permission to access this page") with a way back — not raw error text.
