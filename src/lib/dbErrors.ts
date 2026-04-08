import { resolveDatabaseUrl, urlHostIsLoopback, urlHostIsSupabaseDirectDb } from "./databaseUrl";

/**
 * User-facing hints when Postgres is unreachable (common on Vercel + Supabase).
 */
export function getDatabaseConnectionHint(): string {
  const u = resolveDatabaseUrl() ?? "";
  if (!u.trim()) {
    return "Set DATABASE_URL in Vercel, or install the Supabase integration so POSTGRES_URL_NON_POOLING (or POSTGRES_URL) is defined. Apply to Production and redeploy.";
  }
  if (urlHostIsLoopback(u)) {
    return "The DB host is localhost/127.0.0.1, which Vercel cannot reach. In Vercel env, set DATABASE_URL to Supabase Connect → Session pooler (host *.pooler.supabase.com, port 5432).";
  }
  if (urlHostIsSupabaseDirectDb(u)) {
    return "Direct db.*.supabase.co often fails from Vercel. Use Session pooler URI (*.pooler.supabase.com:5432) as DATABASE_URL, or rely on POSTGRES_URL_NON_POOLING from the Supabase integration.";
  }
  return "Confirm the DB password, Supabase project is not paused, and env vars are attached to this deployment (Production vs Preview).";
}

export function dbFailureUserMessage(e: unknown): string | null {
  const msg = e instanceof Error ? e.message : String(e);
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|getaddrinfo/i.test(msg)) {
    return `Cannot reach PostgreSQL. ${getDatabaseConnectionHint()}`;
  }

  const code =
    typeof e === "object" && e !== null && "code" in e ? String((e as { code: string }).code) : "";
  if (code === "23505") return "Email already registered.";
  if (code === "42P01") return "Database tables are missing. Run sql/schema.sql in Supabase SQL Editor.";
  if (code === "3D000") return "Database does not exist. Check DATABASE_URL.";
  return null;
}
