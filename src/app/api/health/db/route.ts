import { NextResponse } from "next/server";
import { databaseUrlEnvKeyUsed } from "@/lib/databaseUrl";
import { hasDatabase, getPool } from "@/lib/db";
import { getDatabaseConnectionHint } from "@/lib/dbErrors";

/**
 * Set HEALTH_DB_PROBE=true in Vercel env, redeploy, GET this route to test DB connectivity.
 * Remove the env var after debugging.
 */
export async function GET() {
  if (process.env.HEALTH_DB_PROBE !== "true") {
    return NextResponse.json({ error: "Not enabled." }, { status: 404 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      hint: getDatabaseConnectionHint(),
    });
  }

  try {
    const pool = getPool();
    await pool.query("select 1 as ok");
    return NextResponse.json({
      ok: true,
      configured: true,
      reachable: true,
      envKeyUsed: databaseUrlEnvKeyUsed(),
    });
  } catch (e) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code: string }).code : undefined;
    return NextResponse.json({
      ok: false,
      configured: true,
      reachable: false,
      envKeyUsed: databaseUrlEnvKeyUsed(),
      code,
      message: e instanceof Error ? e.message : String(e),
      hint: getDatabaseConnectionHint(),
    });
  }
}
