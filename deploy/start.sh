#!/bin/bash
# Start PIC after a full server reboot. Safe to run multiple times.
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/root/prompt-injection-competition}"
cd "$PROJECT_DIR"

log() { echo "[pic-start] $(date '+%H:%M:%S') $*"; }

wait_for() {
  local desc="$1" cmd="$2" attempts="${3:-30}" delay="${4:-2}"
  for ((i = 1; i <= attempts; i++)); do
    if eval "$cmd" >/dev/null 2>&1; then
      log "$desc ready"
      return 0
    fi
    sleep "$delay"
  done
  log "WARNING: $desc not ready after $((attempts * delay))s"
  return 1
}

log "Starting PIC stack..."

wait_for "Docker" "docker info" 30 2 || exit 1

if ! wait_for "frontline network" "docker network inspect frontline" 60 2; then
  log "Creating frontline network..."
  docker network create frontline 2>/dev/null || true
fi

if ! docker network inspect pic-network >/dev/null 2>&1; then
  log "Creating pic-network..."
  docker network create pic-network 2>/dev/null || true
fi

if [ ! -f deploy/.env ]; then
  log "Creating deploy/.env from example"
  cp deploy/.env.example deploy/.env
fi

if ! docker image inspect pic-sandbox:latest >/dev/null 2>&1; then
  log "Building pic-sandbox:latest..."
  docker build -f docker/sandbox.Dockerfile -t pic-sandbox:latest .
fi

log "Starting pic-master via docker compose..."
docker compose -f deploy/docker-compose.yml up -d --build

if [ -x deploy/setup-caddy.sh ]; then
  deploy/setup-caddy.sh || log "Caddy setup skipped or failed (non-fatal)"
fi

# Restart exited sandbox containers (unless-stopped does not restart manually stopped ones)
for name in $(docker ps -a --format '{{.Names}}' | grep '^pic-sandbox-' || true); do
  status=$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null || echo missing)
  if [ "$status" = "exited" ]; then
    log "Restarting sandbox $name"
    docker start "$name" || true
  fi
done

log "PIC status:"
docker compose -f deploy/docker-compose.yml ps

if wait_for "pic-master HTTP" "curl -sf http://127.0.0.1:4000/" 15 2; then
  log "pic-master HTTP OK on :4000"
else
  log "WARNING: pic-master not responding on :4000"
  exit 1
fi

log "Done"
