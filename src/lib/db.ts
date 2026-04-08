import { Pool } from "pg";

/** Works with Supabase when DATABASE_URL is the URI from Project Settings → Database (sslmode is usually in the URL). */

let pool: Pool | null = null;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Serverless (Vercel): avoid exhausting DB connections per isolate
      max: 1,
      idleTimeoutMillis: 25_000,
      connectionTimeoutMillis: 25_000,
      allowExitOnIdle: true,
    });
  }
  return pool;
}

