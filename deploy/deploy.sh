#!/bin/bash
set -euo pipefail

HOST="${DEPLOY_HOST:-135.106.156.210}"
USER="${DEPLOY_USER:-root}"
REMOTE_DIR="/root/prompt-injection-competition"

echo "==> Building client locally"
cd client && npm install && npm run build
cd ..

echo "==> Syncing to ${USER}@${HOST}:${REMOTE_DIR}"
rsync -avz --exclude node_modules --exclude data --exclude .env \
  ./ "${USER}@${HOST}:${REMOTE_DIR}/"

echo "==> Building on server (Docker only)"
ssh "${USER}@${HOST}" bash -s <<'REMOTE'
set -euo pipefail
cd /root/prompt-injection-competition

if [ ! -f deploy/.env ]; then
  cp deploy/.env.example deploy/.env
  echo "WARNING: edit deploy/.env with secrets before production use"
fi

docker build -f docker/sandbox.Dockerfile -t pic-sandbox:latest .
docker compose -f deploy/docker-compose.yml up -d --build

# Caddy import (idempotent)
IMPORT_FILE=/root/frontline/infra/competition-import.caddy
if [ ! -f "$IMPORT_FILE" ]; then
  echo 'import /root/prompt-injection-competition/deploy/competition.caddy' > "$IMPORT_FILE"
fi

CADDYFILE=/root/frontline/infra/Caddyfile
if ! grep -q competition-import.caddy "$CADDYFILE"; then
  sed -i '1i import competition-import.caddy' "$CADDYFILE"
  docker exec infra-caddy-1 caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
fi

echo "Deploy complete"
REMOTE
