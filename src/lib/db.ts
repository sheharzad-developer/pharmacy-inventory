import { Pool } from "pg";
import { resolveDatabaseUrl } from "./databaseUrl";

/** Works with Supabase when connection string includes sslmode (from dashboard). */

let pool: Pool | null = null;

export function hasDatabase() {
  return Boolean(resolveDatabaseUrl());
}

export function getPool(): Pool {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    throw new Error("No database URL: set DATABASE_URL or Vercel Supabase POSTGRES_* variables.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 1,
      idleTimeoutMillis: 25_000,
      connectionTimeoutMillis: 25_000,
      allowExitOnIdle: true,
    });
  }
  return pool;
}
