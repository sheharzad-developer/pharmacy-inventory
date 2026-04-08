/**
 * User-facing hints when Postgres is unreachable (common on Vercel + Supabase).
 */
export function getDatabaseConnectionHint(): string {
  const u = process.env.DATABASE_URL ?? "";
  if (!u.trim()) {
    return "Add DATABASE_URL in Vercel: Project → Settings → Environment Variables → Production (and Preview if needed), then redeploy.";
  }
  if (/127\.0\.0\.1|localhost/i.test(u)) {
    return "Remove localhost/127.0.0.1 from DATABASE_URL on Vercel. Use the Supabase connection string from the dashboard.";
  }
  if (/db\.[^/]+\.supabase\.co/i.test(u)) {
    return "On Vercel, the direct db.*.supabase.co host often fails. In Supabase: Connect → use Session pooler (URI uses *.pooler.supabase.com and port 5432). Paste that as DATABASE_URL and redeploy.";
  }
  return "Check Vercel DATABASE_URL matches Supabase Dashboard → Connect, the DB password is correct, and the Supabase project is not paused.";
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
