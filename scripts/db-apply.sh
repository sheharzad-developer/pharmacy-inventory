#!/usr/bin/env bash
# Load DATABASE_URL from .env.local and run psql (same URL the app uses).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SQL_FILE="${1:-}"

if [[ -z "$SQL_FILE" ]]; then
  echo "Usage: $0 <sql-file>" >&2
  echo "Example: $0 sql/schema.sql" >&2
  exit 1
fi

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local — add a line like:" >&2
  echo '  DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/DATABASE' >&2
  exit 1
fi

DOTENV="$ROOT/node_modules/.bin/dotenv"
if [[ ! -x "$DOTENV" ]]; then
  echo "Run npm install (dotenv-cli is required)." >&2
  exit 1
fi

# Load the same env Next.js uses; fail clearly if the URL is missing (avoids psql falling back to local socket / user applemini).
DBURL=$("$DOTENV" -e .env.local -- printenv DATABASE_URL || true)
if [[ -z "${DBURL}" ]]; then
  echo "DATABASE_URL is missing or empty in .env.local." >&2
  echo "Add a full connection string, for example:" >&2
  echo '  DATABASE_URL=postgresql://myuser:mysecret@127.0.0.1:5432/pharmacy' >&2
  echo "Use 127.0.0.1 (not localhost) if your Postgres listens on TCP. Encode special characters in the password (e.g. @ as %40)." >&2
  exit 1
fi

exec psql "$DBURL" -f "$ROOT/$SQL_FILE"
