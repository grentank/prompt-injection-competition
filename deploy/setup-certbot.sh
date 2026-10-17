#!/bin/bash
# Issue or keep the Let's Encrypt certificate on the server.
# Private keys stay in /etc/letsencrypt and are not copied into git.
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/root/prompt-injection-competition}"
cd "$PROJECT_DIR"

DOMAIN="${DEPLOY_DOMAIN:-hacking-competition.chickenkiller.com}"
if [ -f deploy/.env ]; then
  # shellcheck disable=SC1091
  DOMAIN="$(grep -E '^DEPLOY_DOMAIN=' deploy/.env | tail -1 | cut -d= -f2- || true)"
  DOMAIN="${DOMAIN:-hacking-competition.chickenkiller.com}"
fi

if ! command -v certbot >/dev/null 2>&1; then
  apt-get update
  apt-get install -y certbot
fi

mkdir -p /var/lib/pic/certbot-www \
  /etc/letsencrypt/renewal-hooks/pre \
  /etc/letsencrypt/renewal-hooks/post

install -m 755 deploy/certbot/pre-stop-caddy.sh /etc/letsencrypt/renewal-hooks/pre/pic-stop-caddy.sh
install -m 755 deploy/certbot/post-start-caddy.sh /etc/letsencrypt/renewal-hooks/post/pic-start-caddy.sh

if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  echo "==> Requesting certificate for ${DOMAIN}"
  docker stop pic-caddy >/dev/null 2>&1 || true
  if ! certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    --preferred-challenges http \
    -d "$DOMAIN"; then
    echo "WARNING: certificate was not issued (DNS probably does not point here yet)"
    exit 0
  fi
else
  echo "==> Certificate already present for ${DOMAIN}"
fi

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] && [ -f deploy/Caddyfile.https ]; then
  cp deploy/Caddyfile.https deploy/Caddyfile
  echo "==> Caddyfile switched to HTTPS"
fi
