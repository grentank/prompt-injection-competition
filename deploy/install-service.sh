#!/bin/bash
# Install systemd unit for PIC auto-start on server boot.
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/root/prompt-injection-competition}"
SERVICE_NAME=pic.service

chmod +x "$PROJECT_DIR/deploy/start.sh"
chmod +x "$PROJECT_DIR/deploy/setup-caddy.sh"

cp "$PROJECT_DIR/deploy/pic.service" "/etc/systemd/system/$SERVICE_NAME"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME" || true

echo "Installed and enabled $SERVICE_NAME"
systemctl status "$SERVICE_NAME" --no-pager || true
