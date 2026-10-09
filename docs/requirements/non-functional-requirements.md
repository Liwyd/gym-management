# Non-Functional Requirements

Statement · verification method.

## NFR-01 — Usability (Must)

Staff flows (register member, record payment, enroll, mark attendance) shall be completable in ≤ 3 interactions from the relevant list page, with visible success/error feedback and no dead ends.
*Verify*: Stage 10 walkthrough of each presentation flow; every button wired (US-44).

## NFR-02 — Performance (Must)

List endpoints shall be paginated (default 20, max 100) and backed by the Stage 2 indexes; no unbounded queries or N+1 patterns. At the seed scale (~10³ rows) and at 10×/100× growth, list/API responses stay interactive (target p95 < 300 ms server-side excluding network). Dashboards aggregate with indexed predicates only.
*Verify*: query review in Stage 7; indexes exist in `0001_init`; no `SELECT *` over whole tables; dashboard endpoint uses grouped aggregates.

## NFR-03 — Security (Must)

- Passwords bcrypt-hashed (cost ≥ 10); never logged, never returned.
- JWT in httpOnly SameSite=Lax cookie; `credentials: 'include'` CORS limited to the configured origin.
- All untrusted input validated with zod server-side (422 + field errors).
- Login rate-limited (FR-02); no account enumeration (FR-02).
- Authorization server-side for every mutation and cross-user read (FR-05/10/39); IDOR tests included.
- Secrets only via environment (`.env.example` names only); no internal error details in responses; structured error envelope.
*Verify*: Stage 7 security test suite (auth, RBAC matrix, IDOR); Stage 10 secret scan of history.

## NFR-04 — Accessibility (Must)

Semantic HTML, labeled inputs, keyboard-operable navigation and dialogs (Esc, focus trap, visible focus), accessible names for icon buttons, color contrast ≥ 4.5:1 for text (WCAG AA), `aria-live` for async feedback.
*Verify*: Stage 10 keyboard-only walkthrough; axe-style manual checks on key pages.

## NFR-05 — Responsive design (Must)

Real adaptation at desktop / laptop / tablet / mobile breakpoints: navigation collapses, tables become card layouts or horizontally scroll with sticky first column, dialogs become full-screen sheets on small screens — not scaled-down desktop.
*Verify*: Stage 10 viewport checks at 1440/1024/768/390 px.

## NFR-06 — Reliability (Must)

All multi-row business operations (member creation, purchase, enrollment, refund) are transactional; DB constraints (unique FKs/enums) are the last line of defense; failures roll back cleanly and surface designed error states. Background expiry job failures are logged and retried, never blocking requests.
*Verify*: Stage 7 tests for atomicity paths (e.g., purchase rejection leaves no payment).

## NFR-07 — Maintainability (Must)

TypeScript strict; modular backend (feature modules with route/service/validation separation) and frontend (feature folders); consistent API envelope and status codes; lint + typecheck in CI; no duplicated business rules across modules; comments only where non-obvious.
*Verify*: CI `ci.yml` lint/typecheck gates (Stage 8).

## NFR-08 — Scalability (Must)

Designed to degrade gracefully, not to be premature: bounded pagination, justified indexes (no over-indexing), Prisma connection pooling, count-based capacity checks in transactions. Expected envelope: 10k members / 1M attendance-history rows remains within NFR-02 without schema redesign.
*Verify*: Stage 2 index justification; Stage 7 query-pattern review.

## NFR-09 — Observability (Should)

Request logging (method, path, status, duration, request id) without PII/secrets; centralized error logger with stack traces server-side only; `/health` endpoint for Docker healthchecks; application errors carry stable machine codes.
*Verify*: Stage 7/8 — health endpoint used by compose healthcheck (Stage 8).

## NFR-10 — Data integrity (Must)

Immutable payment history (state transitions only), unique constraints for business invariants (one profile per user, one attendance per enrollment, one enrollment per member/session), explicit `onDelete` policies, timestamps (`createdAt`/`updatedAt`) on mutable entities.
*Verify*: schema review (Stage 2 ✅); tests hitting each unique constraint.

## NFR-11 — Deployment (Must)

One-command startup via `docker compose up -d` with healthchecks; configuration exclusively via environment variables; CI runs install → lint → typecheck → test → build on every push; Docker images publish on `main`.
*Verify*: Stage 8 CI green (no local Docker available in this environment — CI is the authority).

## NFR-12 — Presentation readiness (Must)

The seeded demo must look alive and internally consistent: recent attendance, upcoming classes, revenue over months, expiring memberships, notifications — all computed from real rows; every showcased flow demonstrable in < 2 minutes without setup.
*Verify*: Stage 10 demo rehearsal against seed data.
