#!/usr/bin/env bash
# PulseFit installer — interactive Docker Compose setup.
set -euo pipefail

REPO_URL="https://github.com/Liwyd/gym-management.git"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
  C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_BLUE=$'\033[34m'
else
  C_RESET=""; C_BOLD=""; C_DIM=""; C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""
fi

ok()   { printf '%s✓%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
err()  { printf '%s✗%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; }
warn() { printf '%s!%s %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
info() { printf '%s·%s %s\n' "$C_DIM" "$C_RESET" "$*"; }
step() { printf '\n%s==>%s %s%s%s\n' "$C_BLUE" "$C_RESET" "$C_BOLD" "$*" "$C_RESET"; }

die() { err "$*"; exit 1; }

prompt() {
  # prompt VAR "Question" "default"
  local var="$1" q="$2" def="${3:-}" ans=""
  if [ -n "$def" ]; then
    read -r -p "$q [$def]: " ans || true
    printf -v "$var" '%s' "${ans:-$def}"
  else
    read -r -p "$q: " ans || true
    printf -v "$var" '%s' "$ans"
  fi
}

confirm() {
  # confirm "Question" -> 0 yes / 1 no
  local ans=""
  read -r -p "$1 [y/N]: " ans || true
  case "$ans" in [Yy]*) return 0 ;; *) return 1 ;; esac
}

banner() {
  printf '%s\n' "${C_BOLD}${C_BLUE}"
  cat <<'EOF'
  ____   __   _   _   _____   _____   ____    _   _    ___    _   _   _____
 |  _ \ / /  | \ | | | ____| |_   _| |  _ \  | \ | |  / _ \  | \ | | | ____|
 | |_) / /_  |  \| | |  _|     | |   | |_) | |  \| | | | | | |  \| | |  _|
 |  _ < __| | |\  | | |___    | |   |  _ <  | |\  | | |_| | | |\  | | |___
 |_| \_\_|  |_| \_| |_|____|   |_|   |_| \_\ |_| \_|  \___/  |_| \_| |_____|
EOF
  printf '%s%s\n' "${C_RESET}" "${C_DIM}Sports Club Management System — installer${C_RESET}"
}

check_os() {
  step "System check"
  local os arch
  os="$(uname -s)"; arch="$(uname -m)"
  case "$os" in
    Linux|Darwin) ok "Operating system: $os" ;;
    *) die "Unsupported OS: $os (Linux or macOS required)" ;;
  esac
  case "$arch" in
    x86_64|amd64|arm64|aarch64) ok "Architecture: $arch" ;;
    *) warn "Unusual architecture: $arch — images may not be available" ;;
  esac
}

require_cmd() {
  # require_cmd docker "Docker" "https://docs.docker.com/get-docker/"
  if command -v "$1" >/dev/null 2>&1; then
    ok "$2 found ($(command -v "$1"))"
    return 0
  fi
  err "$2 not found"
  info "Install it from: $3"
  return 1
}

check_docker() {
  local missing=0
  require_cmd git "Git" "https://git-scm.com/downloads" || missing=1
  require_cmd docker "Docker Engine" "https://docs.docker.com/get-docker/" || missing=1
  if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
      ok "Docker daemon is running"
    else
      err "Docker is installed but the daemon is not running"
      info "Start Docker (e.g. 'sudo systemctl start docker' or open Docker Desktop)"
      missing=1
    fi
    if docker compose version >/dev/null 2>&1; then
      ok "Docker Compose plugin found"
    else
      err "Docker Compose v2 plugin missing ('docker compose' unavailable)"
      info "https://docs.docker.com/compose/install/"
      missing=1
    fi
  fi
  [ "$missing" -eq 0 ] || die "Fix the issues above and re-run scripts/install.sh"
}

configure() {
  step "Configuration"
  info "Press Enter to accept the value in [brackets]."

  prompt INSTALL_DIR "Install directory" "$HOME/pulsefit"
  prompt FRONTEND_PORT "Frontend port" "3000"
  prompt BACKEND_PORT "API port" "4000"
  prompt POSTGRES_PASSWORD "PostgreSQL password (demo data)" "pulsefit"

  local jwt
  if command -v openssl >/dev/null 2>&1; then
    jwt="$(openssl rand -hex 32)"
  else
    jwt="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
  prompt JWT_SECRET "JWT secret (empty = generate)" ""
  if [ -z "${JWT_SECRET:-}" ]; then
    JWT_SECRET="$jwt"
    info "Generated a random JWT secret."
  fi
  if [ "${#JWT_SECRET}" -lt 16 ]; then
    die "JWT_SECRET must be at least 16 characters"
  fi
}

prepare_source() {
  step "Preparing application files"
  if [ -f "$ROOT_DIR/docker-compose.yml" ]; then
    if [ "$INSTALL_DIR" -ef "$ROOT_DIR" ] 2>/dev/null; then
      APP_DIR="$ROOT_DIR"
      ok "Using current directory: $APP_DIR"
    else
      info "Copying application to $INSTALL_DIR"
      mkdir -p "$INSTALL_DIR"
      # Copy everything except heavy local build artifacts.
      (cd "$ROOT_DIR" && tar -cf - \
        --exclude='node_modules' --exclude='.next' --exclude='dist' \
        --exclude='.git' --exclude='backups' \
        .) | (cd "$INSTALL_DIR" && tar -xf -)
      APP_DIR="$INSTALL_DIR"
      ok "Application copied to $APP_DIR"
    fi
  else
    if [ -d "$INSTALL_DIR/.git" ] || [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
      APP_DIR="$INSTALL_DIR"
      info "Existing install found at $APP_DIR — updating…"
      if [ -d "$APP_DIR/.git" ]; then
        git -C "$APP_DIR" pull --ff-only || warn "git pull failed; keeping local files"
      fi
    else
      info "Cloning $REPO_URL into $INSTALL_DIR"
      git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
      APP_DIR="$INSTALL_DIR"
    fi
    ok "Application ready at $APP_DIR"
  fi
}

write_env() {
  step "Writing environment file"
  umask 077
  cat >"$APP_DIR/.env" <<EOF
# Generated by scripts/install.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
POSTGRES_USER=pulsefit
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=gym_management
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=8h
COOKIE_SECURE=false
CORS_ORIGIN=http://localhost:$FRONTEND_PORT
FRONTEND_PORT=$FRONTEND_PORT
BACKEND_PORT=$BACKEND_PORT
EOF
  chmod 600 "$APP_DIR/.env"
  ok ".env written (permissions 600)"
}

start_stack() {
  step "Starting containers"
  info "Pulling prebuilt images from Docker Hub…"
  if docker compose -f "$APP_DIR/docker-compose.yml" --env-file "$APP_DIR/.env" pull backend frontend 2>/dev/null; then
    ok "Images pulled"
    docker compose -f "$APP_DIR/docker-compose.yml" --env-file "$APP_DIR/.env" up -d
  else
    warn "Pull failed — building images locally instead (can take several minutes)"
    docker compose -f "$APP_DIR/docker-compose.yml" --env-file "$APP_DIR/.env" up -d --build
  fi
  ok "Containers started"
}

seed_data() {
  step "Demo data"
  if confirm "Seed the database with demo data (members, classes, payments)?"; then
    docker compose -f "$APP_DIR/docker-compose.yml" --env-file "$APP_DIR/.env" \
      exec -T backend node dist/prisma/seed.js \
      && ok "Demo data seeded (password for all demo logins: Password123!)" \
      || warn "Seeding failed — you can retry later with: scripts/manager.sh seed"
  else
    info "Skipped. Seed later with: scripts/manager.sh seed"
  fi
}

verify_health() {
  step "Verifying services"
  local i backend_url="http://localhost:$BACKEND_PORT/api/v1/health"
  local frontend_url="http://localhost:$FRONTEND_PORT/"
  for i in $(seq 1 30); do
    if curl -fsS "$backend_url" >/dev/null 2>&1; then
      ok "API healthy: $backend_url"
      break
    fi
    [ "$i" -eq 30 ] && die "API did not become healthy in time. Check: scripts/manager.sh logs backend"
    sleep 2
  done
  for i in $(seq 1 15); do
    if curl -fsS "$frontend_url" >/dev/null 2>&1; then
      ok "Frontend healthy: $frontend_url"
      return 0
    fi
    [ "$i" -eq 15 ] && die "Frontend did not become healthy. Check: scripts/manager.sh logs frontend"
    sleep 2
  done
}

summary() {
  step "Installation complete"
  cat <<EOF

  ${C_BOLD}URLs${C_RESET}
    Web app:   http://localhost:$FRONTEND_PORT
    API:       http://localhost:$BACKEND_PORT/api/v1

  ${C_BOLD}Demo logins${C_RESET} (password: ${C_BOLD}Password123!${C_RESET})
    admin@pulsefit.club        Administrator
    manager@pulsefit.club      Manager
    reception@pulsefit.club    Receptionist
    sofia@pulsefit.club        Trainer
    liam.foster@example.com    Member

  ${C_BOLD}Manage${C_RESET}
    Status:  ${APP_DIR}/scripts/manager.sh status
    Logs:    ${APP_DIR}/scripts/manager.sh logs
    Stop:    ${APP_DIR}/scripts/manager.sh stop
    Backup:  ${APP_DIR}/scripts/manager.sh backup
    Update:  ${APP_DIR}/scripts/manager.sh update

EOF
}

main() {
  banner
  check_os
  check_docker
  configure
  prepare_source
  write_env
  start_stack
  seed_data
  verify_health
  summary
}

main "$@"
