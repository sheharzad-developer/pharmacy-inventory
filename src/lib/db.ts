import { Pool } from "pg";
import { preparePgConnection, resolveDatabaseUrl } from "./databaseUrl";

let pool: Pool | null = null;

export function hasDatabase() {
  return Boolean(resolveDatabaseUrl());
}

export function getPool(): Pool {
  const raw = resolveDatabaseUrl();
  if (!raw) {
    throw new Error("No database URL: set DATABASE_URL or Vercel Supabase POSTGRES_* variables.");
  }
  if (!pool) {
    const { connectionString, ssl } = preparePgConnection(raw);
    pool = new Pool({
      connectionString,
      ssl,
      max: 1,
      idleTimeoutMillis: 25_000,
      connectionTimeoutMillis: 25_000,
      allowExitOnIdle: true,
    });
  }
  return pool;
}
