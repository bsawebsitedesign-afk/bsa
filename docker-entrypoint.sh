#!/bin/sh
set -e

# The SQLite file lives on the mounted volume, which is empty the first time a
# container starts. Create the schema then, and only then - this never touches
# an existing database.
DB_PATH="$(printf '%s' "${DATABASE_URL:-file:/app/data/app.db}" | sed 's|^file:||')"

if [ ! -f "$DB_PATH" ]; then
  echo "[entrypoint] no database at $DB_PATH - creating schema"
  node ./node_modules/prisma/build/index.js db push --schema=./prisma/schema.prisma --skip-generate
  echo "[entrypoint] schema created. Seed it with: npm run db:seed"
fi

if [ -z "$JWT_SECRET" ]; then
  echo "[entrypoint] JWT_SECRET is not set. The server will refuse to start." >&2
  echo "[entrypoint] Generate one with: openssl rand -base64 48" >&2
fi

exec "$@"
