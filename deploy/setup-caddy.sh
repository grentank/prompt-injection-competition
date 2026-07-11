#!/bin/bash
# Fix Caddy config for PIC routes. Idempotent.
set -euo pipefail

CADDYFILE="${CADDYFILE:-/root/frontline/infra/Caddyfile}"
PIC_CADDY="${PIC_CADDY:-/root/prompt-injection-competition/deploy/competition.caddy}"
CADDY_CONTAINER="${CADDY_CONTAINER:-infra-caddy-1}"

if [ ! -f "$CADDYFILE" ]; then
  echo "[setup-caddy] Caddyfile not found: $CADDYFILE (skip)"
  exit 0
fi

# Broken import: file is not mounted into the caddy container.
if grep -q '^import competition-import.caddy' "$CADDYFILE"; then
  sed -i '/^import competition-import.caddy/d' "$CADDYFILE"
  echo "[setup-caddy] Removed broken competition-import.caddy import"
fi

# Remove absolute-path import that does not exist inside the container.
if grep -q 'prompt-injection-competition/deploy/competition.caddy' "$CADDYFILE"; then
  sed -i '/prompt-injection-competition\/deploy\/competition.caddy/d' "$CADDYFILE"
  echo "[setup-caddy] Removed host-only competition.caddy import"
fi

DOMAIN_BLOCK='temp-frontline-agent.ignorelist.com'
if ! grep -q "$DOMAIN_BLOCK" "$CADDYFILE"; then
  echo "[setup-caddy] Domain block $DOMAIN_BLOCK not in Caddyfile (skip route injection)"
  exit 0
fi

if grep -q 'reverse_proxy pic-master:4000' "$CADDYFILE"; then
  echo "[setup-caddy] PIC routes already present"
else
  # Insert PIC handlers at the start of the site block.
  awk -v routes="$PIC_CADDY" '
    $0 ~ /temp-frontline-agent\.ignorelist\.com \{/ && !done {
      print
      while ((getline line < routes) > 0) print line
      close(routes)
      done=1
      next
    }
    { print }
  ' "$CADDYFILE" > "${CADDYFILE}.tmp" && mv "${CADDYFILE}.tmp" "$CADDYFILE"
  echo "[setup-caddy] Injected PIC routes into $DOMAIN_BLOCK block"
fi

if docker ps --format '{{.Names}}' | grep -qx "$CADDY_CONTAINER"; then
  docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile 2>/dev/null \
    || docker restart "$CADDY_CONTAINER"
  echo "[setup-caddy] Caddy reloaded"
fi
