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

function pgCode(e: unknown): string {
  if (typeof e !== "object" || e === null || !("code" in e)) return "";
  return String((e as { code: string }).code);
}

/** Maps DB/network/pooler errors to a safe user-visible string. */
export function dbFailureUserMessage(e: unknown): string | null {
  if (e && typeof e === "object" && "errors" in e && Array.isArray((e as AggregateError).errors)) {
    for (const inner of (e as AggregateError).errors) {
      const m = dbFailureUserMessage(inner);
      if (m) return m;
    }
  }

  const msg = e instanceof Error ? e.message : String(e);

  if (/No database URL|DATABASE_URL is not set/i.test(msg)) {
    return `Database is not configured. ${getDatabaseConnectionHint()}`;
  }

  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|getaddrinfo/i.test(msg)) {
    return `Cannot reach PostgreSQL. ${getDatabaseConnectionHint()}`;
  }

  const code = pgCode(e);
  if (code === "23505") return "Email already registered.";
  if (code === "42P01") return "Database tables are missing. Run sql/schema.sql in Supabase SQL Editor.";
  if (code === "3D000") return "Database does not exist. Check DATABASE_URL.";
  if (code === "28P01" || code === "28000") {
    return "Database login failed (wrong password or user). In Supabase → Settings → Database, reset the password and update the same value in every POSTGRES_* / DATABASE_URL on Vercel, then redeploy.";
  }
  if (code === "42703") {
    return "Database schema is out of date. Run sql/schema.sql (or sql/migrate_from_legacy.sql) in the Supabase SQL Editor.";
  }

  if (/password authentication failed|authentication failed for user|invalid authorization specification/i.test(msg)) {
    return "Database rejected the username or password. Copy the connection URI again from Supabase (Database settings) into Vercel env vars and redeploy.";
  }

  if (/Tenant or user not found/i.test(msg)) {
    return "Supabase pooler rejected the database user. In Supabase → Connect, copy the Session pooler URI exactly (user is usually postgres.yourprojectref, not postgres alone).";
  }

  if (/MaxClientsInSessionMode|too many clients|remaining connection slots are reserved/i.test(msg)) {
    return "Database connection limit reached. Wait a minute and try again, or pause other apps using the same Supabase database.";
  }

  if (/SSL|TLS|certificate|UNABLE_TO_VERIFY|EPROTO|sslmode|self signed|SELF_SIGNED/i.test(msg)) {
    return "Database SSL/TLS failed. Pull the latest code, redeploy on Vercel, and confirm POSTGRES_* / DATABASE_URL is the Supabase Session pooler URI. You do not need to add DATABASE_SSL_REJECT_UNAUTHORIZED unless you intentionally set it to true (strict TLS); leave it unset for normal operation.";
  }

  if (/bcrypt|invalid salt|rounds/i.test(msg)) {
    return "Could not hash the password. Try again or use a simpler password temporarily.";
  }

  return null;
}
