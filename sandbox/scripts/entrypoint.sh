#!/bin/sh
set -e

if [ "$RESET_DB" = "1" ]; then
  echo "Resetting sandbox database..."
  rm -f "$DB_PATH"
fi

node node_modules/sequelize-cli/lib/sequelize db:migrate
node node_modules/sequelize-cli/lib/sequelize db:seed:all

exec node src/server.js
