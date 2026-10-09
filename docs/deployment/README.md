# Deployment

## Topology (Docker Compose)

```
postgres:16-alpine ── healthcheck: pg_isready
   ▲
backend   (docker/Dockerfile.backend)   ── healthcheck: GET /api/v1/health
   ▲        runs `prisma migrate deploy` on start, then node dist/server.js
frontend  (docker/Dockerfile.frontend)  ── healthcheck: GET /
              BACKEND_URL=http://backend:4000 baked into the rewrite at build
```

- `docker compose up -d --build` starts everything; seed once with
  `scripts/manager.sh seed`.
- Prebuilt images (`liwyd/pulsefit-backend`, `liwyd/pulsefit-frontend`) can be
  pulled instead of built by setting `IMAGE_TAG` (compose `image:` fields).
- Installer: `scripts/install.sh` (interactive). Day-to-day:
  `scripts/manager.sh {status|start|stop|restart|logs|backup|update|uninstall}`.

## Images

| Image    | Build                                | Runtime                          |
| -------- | ------------------------------------ | -------------------------------- |
| backend  | tsc → `dist/`, prisma client, compiled seed | node 22 alpine, prod deps + global prisma CLI |
| frontend | `next build` (standalone output)     | `node server.js` on :3000        |

## CI/CD (GitHub Actions)

- **`ci.yml`** — on `main` and `stage/**` pushes and all PRs:
  - *backend*: lint, typecheck, `prisma validate`, `prisma migrate deploy`,
    unit + integration tests against a Postgres 16 **service container**
    (`TEST_DATABASE_URL`) — the integration suite runs here, not on laptops
    without a database.
  - *frontend*: lint, typecheck, `next build`.
- **`docker.yml`** — on `main` and `v*` tags: buildx build of both images,
  pushed to Docker Hub with GHA layer caching (requires
  `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` repository secrets).

## Environments

`.env.example` lists every variable (names + safe defaults only). Local
development runs without Docker (`npm run dev` in each app); production-ish
runs go through compose.
