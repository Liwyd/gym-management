# Architecture

PulseFit is a single monolith (decided in AGENTS.md #4): one Express API and
one Next.js app, one PostgreSQL database. No queues, caches, or services.

## Layers

```
Browser
  │  fetch("/api/v1/…", credentials: "include")   ← same-origin, httpOnly cookie
  ▼
Next.js (App Router)  ── /api rewrite proxy ──▶  Express API  ──▶  PostgreSQL
  frontend/src/…                                   src/middleware/     Prisma
                                                  src/modules/*        (schema,
                                                                      migrations)
```

- **Frontend**: client-side rendering with `useQuery`/`useListQuery` hooks;
  `AuthProvider` fetches `/auth/me` once; `AppShell` filters navigation by the
  same capability map the server enforces. Every page has loading / empty /
  error / permission-denied states.
- **Proxy**: `next.config.ts` rewrites `/api/:path*` to `BACKEND_URL`, so the
  browser only ever talks to one origin and the JWT cookie stays same-site.
- **API**: Express 5 + TypeScript, modular routers (`src/modules/*`), zod
  validation of every untrusted input, offset pagination, uniform
  `{data, meta}` / `{error:{code,message}}` envelopes, pino request logging,
  rate limiting on authentication endpoints.
- **Database**: PostgreSQL + Prisma; migrations in `backend/prisma/migrations`,
  realistic seed in `backend/prisma/seed.ts`.

## Request pipeline

1. `helmet`, `cors` (credentialed, whitelisted origin), `express.json`,
   `cookie-parser`, optional request logger.
2. `requireAuth` for every `/api/v1` route except `/health`, `/auth/login`,
   `/auth/logout` (`src/routes.ts`) — verifies the `pulsefit_access` JWT and
   loads an ACTIVE user.
3. `authorize(capability)` — coarse RBAC from
   `src/modules/auth/permissions.ts`.
4. Service-level object scoping (`src/lib/scope.ts`) — members see only their
   own rows, trainers only their own sessions, etc. (R8).
5. Central error handler — known `AppError`s become typed envelopes;
   unexpected errors become a generic 500 with no internal detail leaked.

## Security decisions

| Concern            | Decision                                              |
| ------------------ | ----------------------------------------------------- |
| Session            | JWT (HS256) in httpOnly, SameSite=Lax cookie          |
| Passwords          | bcryptjs, policy: ≥8 chars + letter + digit           |
| Authorization      | Server-side only; frontend hiding is never the gate   |
| CSRF surface       | Same-site cookie + credentialed CORS whitelist        |
| Brute force        | 10 logins / 15 min per IP; 60 auth requests / 15 min  |
| Secrets            | Environment only (`.env` gitignored; `.env.example`)  |
| Input              | zod on every body/query/param                         |
