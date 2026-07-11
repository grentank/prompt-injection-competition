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

chmod +x deploy/start.sh deploy/setup-caddy.sh
deploy/setup-caddy.sh || true

# Systemd auto-start on server reboot (idempotent)
if [ -f deploy/install-service.sh ]; then
  chmod +x deploy/install-service.sh
  deploy/install-service.sh || echo "WARNING: systemd install failed — run deploy/install-service.sh manually"
fi

echo "Deploy complete"
REMOTE
