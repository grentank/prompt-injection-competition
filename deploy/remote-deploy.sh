#!/bin/bash
# Idempotent production deploy. Runs on the server.
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/root/prompt-injection-competition}"
cd "$PROJECT_DIR"

if [ ! -f deploy/.env ]; then
  cp deploy/.env.example deploy/.env
  echo "WARNING: deploy/.env created from example — set LLM_PROVIDER_API_KEY"
fi

docker network inspect pic-network >/dev/null 2>&1 || docker network create pic-network

echo "==> Building sandbox image"
docker build -f docker/sandbox.Dockerfile -t pic-sandbox:latest .

echo "==> Starting stack"
docker compose -f deploy/docker-compose.yml up -d --build

if [ -f deploy/install-service.sh ]; then
  chmod +x deploy/install-service.sh deploy/start.sh
  deploy/install-service.sh || echo "WARNING: systemd install failed"
fi

echo "==> Waiting for HTTP (up to 180s)"
deadline=$((SECONDS + 180))
while true; do
  if curl -sf --max-time 5 -o /dev/null http://127.0.0.1/; then
    echo "HTTP OK on :80"
    exit 0
  fi
  if [ "$SECONDS" -ge "$deadline" ]; then
    break
  fi
  sleep 2
done

echo "ERROR: http://127.0.0.1/ did not become ready" >&2
docker compose -f deploy/docker-compose.yml ps || true
docker logs pic-master --tail 80 || true
docker logs pic-caddy --tail 80 || true
exit 1
