#!/usr/bin/env bash
# Start Docker Postgres, wait until it accepts connections, apply sql/schema.sql.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

docker compose up -d

echo "Waiting for PostgreSQL..."
for _ in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U postgres 2>/dev/null; then
    break
  fi
  sleep 2
done
docker compose exec -T db pg_isready -U postgres

npm run db:schema
