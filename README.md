# PulseFit — Sports Club Management System

University project: a complete gym / sports club management system with a
Next.js frontend, Express API, and PostgreSQL (Prisma).

**Stack:** Next.js 15 · TypeScript · Tailwind v4 + shadcn/ui · Express 5 ·
Prisma 6 · PostgreSQL 16 · JWT (httpOnly cookie) · Docker Compose

## Run with Docker Compose

```bash
cp .env.example .env   # optional — sane defaults are built in
docker compose up -d --build
```

| Service  | URL                          |
| -------- | ---------------------------- |
| Frontend | http://localhost:3000        |
| API      | http://localhost:4000/api/v1 |
| Database | localhost:5432               |

On first start the backend runs `prisma migrate deploy` automatically.
Seed the demo data once with:

```bash
docker compose exec backend node dist/prisma/seed.js
```

### Demo logins

Password for every seeded account: `Password123!`

| Role          | Email                          |
| ------------- | ------------------------------ |
| Administrator | admin@pulsefit.club            |
| Manager       | manager@pulsefit.club          |
| Receptionist  | reception@pulsefit.club        |
| Trainer       | sofia@pulsefit.club            |
| Member        | liam.foster@example.com       |

## Development (without Docker)

```bash
# backend
cd backend && npm install
cp ../.env.example .env    # set DATABASE_URL to a reachable Postgres
npm run db:migrate && npm run db:seed
npm run dev                # http://localhost:4000

# frontend (separate terminal)
cd frontend && npm install
npm run dev                # http://localhost:3000
```

The frontend proxies `/api/*` to the backend (`BACKEND_URL`, default
`http://localhost:4000`) so cookies stay same-origin.

## Tests

```bash
cd backend
npm test                   # unit tests always; API tests need TEST_DATABASE_URL
```

## Documentation

Academic artifacts (analysis, ERD, use cases, user stories, requirements,
prototype) live under [`docs/`](docs/).
