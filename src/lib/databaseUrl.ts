/**
 * Vercel + Supabase integration often sets POSTGRES_* but not DATABASE_URL.
 * Prefer session-style URLs (port 5432 on pooler) over :6543 transaction pooler for node-pg.
 */
const URL_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
] as const;

export function urlHostIsLoopback(connectionString: string): boolean {
  const raw = connectionString.trim().replace(/^postgres:\/\//i, "postgresql://");
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  } catch {
    return false;
  }
}

export function urlHostIsSupabaseDirectDb(connectionString: string): boolean {
  const raw = connectionString.trim().replace(/^postgres:\/\//i, "postgresql://");
  try {
    const u = new URL(raw);
    return /^db\.[^.]+\.supabase\.co$/i.test(u.hostname);
  } catch {
    return /db\.[^/]+\.supabase\.co/i.test(connectionString);
  }
}

/** Which env key `resolveDatabaseUrl()` will use (same skip-loopback-then-fallback logic). */
export function databaseUrlEnvKeyUsed(): (typeof URL_ENV_KEYS)[number] | null {
  for (const key of URL_ENV_KEYS) {
    const t = process.env[key]?.trim();
    if (t && !urlHostIsLoopback(t)) return key;
  }
  for (const key of URL_ENV_KEYS) {
    const t = process.env[key]?.trim();
    if (t) return key;
  }
  return null;
}

export function resolveDatabaseUrl(): string | undefined {
  // Prefer any non-loopback URL (Vercel often has a stale DATABASE_URL=localhost plus good POSTGRES_*).
  for (const key of URL_ENV_KEYS) {
    const t = process.env[key]?.trim();
    if (t && !urlHostIsLoopback(t)) return t;
  }
  for (const key of URL_ENV_KEYS) {
    const t = process.env[key]?.trim();
    if (t) return t;
  }
  return undefined;
}

/** Host string looks like Supabase (direct or pooler). */
export function looksLikeSupabaseConnectionString(url: string): boolean {
  return /supabase\.co|pooler\.supabase\.com/i.test(url);
}

function isRunningOnVercel(): boolean {
  return process.env.VERCEL === "1";
}

/**
 * node-pg on Vercel: TLS verification often fails for managed Postgres. For any **remote** URL on
 * Vercel we set ssl.rejectUnauthorized=false unless DATABASE_SSL_REJECT_UNAUTHORIZED=true.
 * Locally, only Supabase-shaped URLs get that (so Docker localhost stays non-SSL).
 */
export function preparePgConnection(connectionString: string): {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
} {
  let cs = connectionString.trim();
  const loopback = urlHostIsLoopback(cs);

  if (!loopback && !/sslmode=/i.test(cs)) {
    cs += cs.includes("?") ? "&sslmode=require" : "?sslmode=require";
  }

  if (loopback) {
    return { connectionString: cs };
  }

  const strictSsl = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true";

  if (isRunningOnVercel()) {
    return {
      connectionString: cs,
      ssl: { rejectUnauthorized: strictSsl },
    };
  }

  if (looksLikeSupabaseConnectionString(cs)) {
    return {
      connectionString: cs,
      ssl: { rejectUnauthorized: strictSsl },
    };
  }

  if (strictSsl) {
    return { connectionString: cs, ssl: { rejectUnauthorized: true } };
  }

  return { connectionString: cs };
}
