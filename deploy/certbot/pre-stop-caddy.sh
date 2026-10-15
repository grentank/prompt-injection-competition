#!/bin/bash
# Free port 80 so certbot --standalone can renew.
docker stop pic-caddy >/dev/null 2>&1 || true
