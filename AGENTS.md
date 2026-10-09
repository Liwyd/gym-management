# AGENTS.md — Sports Club Management System (University Project)

Persistent execution memory and roadmap. A new session must read this file first, determine the current stage, find the first unchecked task, inspect the repository, and continue from there.

## Project

Complete Sports Club / Gym Management System: academic project that must be complete, coherent, runnable, presentable, and free of unfinished placeholders. Every implemented feature has a real frontend, backend, database behavior, validation, error handling, and a coherent UX. No fake screens, TODOs, "coming soon", lorem ipsum, fake charts, or empty buttons.

## Technology Stack

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui, responsive, accessible, loading/empty/error/permission-denied states on every page.
- **Backend**: Node.js + Express + TypeScript, modular REST API, centralized error handling, validation on every untrusted input.
- **Database**: PostgreSQL + Prisma (schema/migrations/seed in `backend/prisma/`).
- **Auth**: JWT (access token) delivered in an httpOnly cookie, bcrypt password hashing, role-based authorization enforced on the server (never only in the frontend).
- **Infra**: Docker + Docker Compose, GitHub Actions (CI + Docker Hub publish), interactive installer + `manager.sh`.

## Roles

ADMIN, MANAGER, TRAINER, RECEPTIONIST, MEMBER.

## Domain (current scope)

Users/accounts, Members, Trainers, Membership plans, Memberships, Classes, Class schedules, Enrollments, Attendance, Payments, Facilities/Rooms, Notifications, Dashboard statistics. Entities may be added or removed during Stage 1–2 analysis; keep scope academically manageable.

## Repository Structure

```
/
├── AGENTS.md            # this file (source of truth for progress)
├── README.md            # intentionally short
├── .gitignore
├── .env.example         # variable names only, never real secrets
├── frontend/            # Next.js app
├── backend/             # Express API + prisma/
├── docs/
│   ├── analysis/        # Stage 1: class / sequence / activity diagrams
│   ├── database/        # Stage 2: ERD
│   ├── use-cases/       # Stage 3
│   ├── user-stories/    # Stage 4
│   ├── requirements/    # Stage 5
│   ├── prototype/       # Stage 6
│   ├── architecture/
│   ├── api/
│   └── deployment/
├── docker/
├── docker-compose.yml
├── scripts/install.sh
├── scripts/manager.sh
└── .github/workflows/   # ci.yml, docker.yml
```

Deviation from the original sketch: no root `database/` directory — Prisma schema/migrations/seed live in `backend/prisma/` (standard layout), academic ERD lives in `docs/database/`.

## Design System (Stage 6 must implement this)

- Modern, minimal, premium, clean, spacious, professional; blue + white dominant; dark navy text; subtle neumorphism only (soft elevation, gentle inner shadows, clean borders) — never exaggerated 2019-style neumorphism.
- Real design tokens: primary, secondary, background, foreground, muted, border, destructive, success, warning, info. No per-component ad-hoc colors.
- Professional modern font with clear hierarchy (page title, section, card title, body, caption, label, metadata, statistics). Avoid excessive font weights.
- Consistent spacing system; interface must breathe; no cramped or overcrowded layouts.
- Reusable components: buttons, inputs, selects, dialogs, sheets, dropdowns, tables, cards, badges, tabs, breadcrumbs, navigation, charts, forms, pagination, empty/loading/error states, confirmation dialogs, toasts.
- Dashboard: complete but not cluttered (members, active memberships, today's attendance/classes, revenue, upcoming classes, expiring memberships, recent activity, quick actions).
- Responsive on desktop/laptop/tablet/mobile (real adaptation, not shrinking). Accessibility: semantic HTML, keyboard navigation, visible focus, labels, aria, contrast, accessible dialogs.

## API Conventions

- REST under `/api/v1`, consistent success/error envelope, proper HTTP status codes, never expose internal errors.
- Pagination on list endpoints, filtering where useful, request logging, rate limiting on authentication endpoints.
- Validation: zod on the backend for all untrusted input (frontend validation is UX only).
- Authorization enforced server-side for every mutation and every read of another user's data.

## Git Conventions

- Branch per stage: `main`, `stage/01-analysis`, `stage/02-database`, `stage/03-use-cases`, `stage/04-user-stories`, `stage/05-requirements`, `stage/06-prototype`, `stage/07-application`, `stage/08-docker-ci`, `stage/09-installer`, `stage/10-final-qa`.
- One-line conventional commits: `feat: …`, `fix: …`, `docs: …`, `ui: …`, `ci: …`, `ops: …`, `chore: …`. Never `update`/`changes`/`final`.
- After every meaningful milestone: verify → commit → push → update this file.
- Finish a stage completely (artifacts exist, consistent, checks pass, committed, pushed, this file updated, marked COMPLETE) before starting the next.

## Quality Gate (before marking any stage COMPLETE)

Architecture structured · work actually works · consistent with earlier stages · UI meets design system (if UI) · invalid states handled · appropriate tests/checks run · documentation present · committed · pushed · AGENTS.md updated.

## Project Execution State

### Current Stage
Stage 5 — COMPLETE. Next: Stage 6 (prototype / design system).

### Stage 0 — Bootstrap — COMPLETE
- [x] Audit repository (single commit containing only plan.md; no code)
- [x] Configure git identity and push authentication
- [x] Distill plan.md into AGENTS.md
- [x] Add .gitignore
- [x] Remove plan.md from git history (fresh root commit; object store rebuilt after aggressive gc corrupted loose objects on this PRoot filesystem — avoid `gc --aggressive --prune=now` here)
- [x] Force-push clean history to origin/main (`be23ac7` → `460249d`, verified: no plan.md in any reachable object)

## Stage 1 — Analysis — COMPLETE
- [x] Branch `stage/01-analysis`
- [x] Analyze domain; define actors and core classes (`docs/analysis/README.md` — actors, class inventory, normative rules R1–R9)
- [x] Class diagram (entities, attributes, methods, relationships, cardinalities) (`docs/analysis/class-diagram.md`)
- [x] Sequence diagrams: member registration, login, membership activation, class enrollment, attendance, payment, trainer scheduling (`docs/analysis/sequence/`)
- [x] Activity diagrams for key workflows (`docs/analysis/activity/`)
- [x] Validate diagrams against intended functionality (`docs/analysis/validation.md`)
- [x] Commit, push, quality gate, mark COMPLETE

## Stage 2 — Database — COMPLETE
- [x] Branch `stage/02-database`
- [x] ERD in `docs/database/` matching Stage 1 (`erd.md` + design notes `README.md`)
- [x] Prisma schema: PKs, FKs, constraints, justified indexes, timestamps, normalization (`backend/prisma/schema.prisma`)
- [x] Migration (`prisma/migrations/0001_init/migration.sql`, generated via `prisma migrate diff`, DDL syntax-verified) + realistic safe seed (`backend/prisma/seed.ts`, type-checked)
- [x] Commit, push, quality gate, mark COMPLETE

Known limitation: no local Postgres/Docker in this environment — `migrate deploy` + seed execution must be verified in Stage 7/8 CI (Postgres service container). Schema validated with `prisma validate`, client generated, seed type-checked with `tsc --noEmit`.

## Stage 3 — Use Cases — COMPLETE
- [x] Branch `stage/03-use-cases`
- [x] Use case diagram + descriptions (actor, preconditions, main/alternative/error flows, postconditions) — 20 use cases in `docs/use-cases/`
- [x] Supporting sequence and activity diagrams; consistent with DB and planned implementation (Stage 1 diagrams referenced; login / enrollment-cancel / session-cancel activities added)
- [x] Commit, push, quality gate, mark COMPLETE

## Stage 4 — User Stories — COMPLETE
- [x] Branch `stage/04-user-stories`
- [x] Stories in "As a / I want / so that" with acceptance criteria, priority, related use case, status; grouped by epic — 44 stories (US-01…US-44) in `docs/user-stories/`, all 20 use cases covered
- [x] Commit, push, quality gate, mark COMPLETE

## Stage 5 — Requirements — COMPLETE
- [x] Branch `stage/05-requirements`
- [x] Functional + non-functional requirements mapped to stories and later implementation — FR-01…FR-40, NFR-01…NFR-12, full traceability matrix (`docs/requirements/`)
- [x] Commit, push, quality gate, mark COMPLETE

## Stage 6 — Prototype / Design System
- [ ] Branch `stage/06-prototype`
- [ ] Design tokens, typography, spacing, component library per Design System section
- [ ] Prototype screens in `docs/prototype/`; foundation implemented in `frontend/` so Stage 7 inherits it
- [ ] Commit, push, quality gate, mark COMPLETE

## Stage 7 — Application
- [ ] Branch `stage/07-application`
- [ ] Backend modules: auth, users, members, memberships, plans, classes, enrollment, attendance, payments, trainers, facilities, notifications, dashboard
- [ ] Auth (JWT cookie, bcrypt), RBAC, validation, error envelope, pagination, logging
- [ ] Frontend pages for all flows with loading/empty/error/denied states, responsive + accessible
- [ ] Tests: authentication, authorization, membership rules, enrollment capacity, payment validation, key endpoints
- [ ] Realistic demo seed data; every button/form/endpoint works
- [ ] Commit, push, quality gate, mark COMPLETE

## Stage 8 — Docker + CI/CD
- [ ] Branch `stage/08-docker-ci`
- [ ] Multi-stage Dockerfiles (frontend, backend), `docker-compose.yml` with healthchecks, `.env.example`
- [ ] Minimal `README.md`
- [ ] `ci.yml` (install, lint, typecheck, test, build) and `docker.yml` (build + push with `DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` GitHub secrets)
- [ ] CI green; no credentials in code/history; quality gate, mark COMPLETE

## Stage 9 — Installer + Management
- [ ] Branch `stage/09-installer`
- [ ] `scripts/install.sh` (OS/arch detect, dependency + Docker checks, prompts, dirs, image pull, env config, start, health verify, URLs, next commands, polished TUI)
- [ ] `scripts/manager.sh` (install, update, start, stop, restart, status, logs, backup, uninstall with confirmation, help)
- [ ] Static checks (`bash -n`, shellcheck if available); quality gate, mark COMPLETE

## Stage 10 — Final QA / Presentation
- [ ] Branch `stage/10-final-qa`
- [ ] Full audit: academic artifacts, application works end-to-end, UI consistency, DevOps, Git hygiene
- [ ] Consistency chain verified: story → requirement → use case → activity → sequence → class → DB → API → frontend
- [ ] Presentation flows obvious: login, dashboard, members, memberships, classes, attendance, trainers, statistics, role-based access
- [ ] Quality gate, mark COMPLETE

## Decisions

1. PostgreSQL + Prisma (academic clarity, relational constraints).
2. JWT in httpOnly cookie rather than localStorage (XSS mitigation); SameSite=Lax; credentials included CORS.
3. Server-side RBAC on every endpoint; frontend hiding is never the security boundary.
4. Single Express monolith + Postgres — no queues, microservices, or caching layers (unjustified complexity at this scale).
5. Prisma lives in `backend/prisma/`; no root `database/` folder.
6. Offset pagination with bounded `limit` (max 100) is sufficient for project scale.
7. Academic diagrams in Mermaid (source files committed in `docs/`).
8. plan.md was purged from git history by rebuilding the root commit (only commit existed at the time).
9. `bcryptjs` (pure-JS bcrypt, v3) instead of native `bcrypt` — no compiler toolchain needed in CI/Docker/PRoot.
10. npm installs here are slow and background/orphaned processes can deadlock under libproot — always run installs in the foreground with a generous timeout, never concurrently.

## Constraints & Environment Notes

- This environment has **no Docker / docker-compose**: Stage 8–9 runtime behavior must be verified via GitHub Actions and static checks; never claim local Docker verification.
- `git-filter-repo` unavailable → history cleanup used a fresh root commit (`git init` + new commit + `--force-with-lease` push). **Do not run `git gc --aggressive --prune=now` in this workspace** — it corrupted loose objects on the PRoot/FUSE filesystem once already.
- Demo/seed data must match the real schema; no absurdly large datasets.
- Never commit secrets: only `.env.example` with variable names.

## Known Issues

- None yet.

## Next Exact Action

Start Stage 6: create branch `stage/06-prototype`, produce `docs/prototype/` (design tokens, typography, spacing, component inventory, screen mockups as Mermaid/HTML specs) and implement the design-system foundation in `frontend/` (Next.js scaffold, tokens, base shadcn components) so Stage 7 inherits it.
