#!/usr/bin/env bash
# PulseFit manager — start/stop/update/backup the Docker Compose stack.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
ENV_FILE="$APP_DIR/.env"
BACKUP_DIR="$APP_DIR/backups"

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_RED=$'\033[31m'
  C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
else
  C_RESET=""; C_BOLD=""; C_RED=""; C_GREEN=""; C_YELLOW=""
fi

ok()   { printf '%s✓%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
err()  { printf '%s✗%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; }
warn() { printf '%s!%s %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
die()  { err "$*"; exit 1; }

usage() {
  cat <<EOF
${C_BOLD}PulseFit manager${C_RESET}

Usage: scripts/manager.sh <command>

  install    Interactive install (delegates to scripts/install.sh)
  update     Pull latest code, rebuild images, restart with data intact
  start      Start the stack (detached)
  stop       Stop the stack (containers kept)
  restart    Restart all services
  status     Container and health status
  logs       Tail service logs (default: all; or 'logs backend')
  seed       Load demo data into the database
  backup     Dump the database to backups/<timestamp>.sql.gz
  uninstall  Stop and remove containers, volumes, and network (asks first)
  help       Show this help
EOF
}

compose() {
  [ -f "$COMPOSE_FILE" ] || die "docker-compose.yml not found at $COMPOSE_FILE"
  docker compose -f "$COMPOSE_FILE" ${ENV_FILE:+--env-file "$ENV_FILE"} "$@"
}

confirm() {
  local ans=""
  read -r -p "$1 [y/N]: " ans || true
  case "$ans" in [Yy]*) return 0 ;; *) return 1 ;; esac
}

cmd_install() {
  [ -f "$SCRIPT_DIR/install.sh" ] || die "scripts/install.sh not found"
  exec bash "$SCRIPT_DIR/install.sh"
}

cmd_update() {
  if [ -d "$APP_DIR/.git" ]; then
    ok "Pulling latest code…"
    git -C "$APP_DIR" pull --ff-only || warn "git pull failed; continuing with local files"
  fi
  ok "Pulling latest images…"
  if compose pull backend frontend; then
    ok "Images updated"
  else
    warn "Pull failed — rebuilding images locally…"
    compose build
  fi
  ok "Restarting…"
  compose up -d
  ok "Updated"
}

cmd_start()  { compose up -d; ok "Started"; }
cmd_stop()   { compose stop; ok "Stopped"; }
cmd_restart(){ compose restart; ok "Restarted"; }

cmd_status() {
  compose ps
  echo
  local fe be
  fe="$(grep -E '^FRONTEND_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || true)"
  be="$(grep -E '^BACKEND_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || true)"
  fe="${fe:-3000}"; be="${be:-4000}"
  if curl -fsS "http://localhost:$be/api/v1/health" >/dev/null 2>&1; then
    ok "API healthy (http://localhost:$be)"
  else
    warn "API not healthy yet (http://localhost:$be)"
  fi
  if curl -fsS "http://localhost:$fe/" >/dev/null 2>&1; then
    ok "Frontend healthy (http://localhost:$fe)"
  else
    warn "Frontend not healthy (http://localhost:$fe)"
  fi
}

cmd_logs() {
  compose logs -f --tail=200 "$@"
}

cmd_seed() {
  compose exec backend node dist/prisma/seed.js \
    && ok "Demo data seeded (password: Password123!)" \
    || die "Seeding failed — is the stack running? Try: scripts/manager.sh start"
}

cmd_backup() {
  mkdir -p "$BACKUP_DIR"
  local file="$BACKUP_DIR/$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
  ok "Dumping database to $file"
  compose exec -T postgres sh -c 'pg_dump -U "${POSTGRES_USER:-pulsefit}" "${POSTGRES_DB:-gym_management}"' \
    | gzip >"$file"
  ok "Backup written ($(du -h "$file" | cut -f1))"
}

cmd_uninstall() {
  warn "This removes containers, the database volume, and the network."
  warn "Application files in $APP_DIR are kept (use backup first if needed)."
  if ! confirm "Really uninstall?"; then
    ok "Cancelled"
    return 0
  fi
  compose down -v
  ok "Uninstalled (containers, volumes, network removed)"
}

case "${1:-help}" in
  install)   cmd_install ;;
  update)    cmd_update ;;
  start)     cmd_start ;;
  stop)      cmd_stop ;;
  restart)   cmd_restart ;;
  status)    cmd_status ;;
  logs)      shift; cmd_logs "$@" ;;
  seed)      cmd_seed ;;
  backup)    cmd_backup ;;
  uninstall) cmd_uninstall ;;
  help|-h|--help) usage ;;
  *) err "Unknown command: $1"; usage; exit 1 ;;
esac
