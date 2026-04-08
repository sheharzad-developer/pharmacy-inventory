import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/authStore";
import { clearSessionCookieOnResponse, SESSION_COOKIE_NAME } from "@/lib/authSession";

export async function POST() {
  const c = await cookies();
  const sessionId = c.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) await deleteSession(sessionId);

  const res = NextResponse.json({ ok: true });
  clearSessionCookieOnResponse(res);
  return res;
}
