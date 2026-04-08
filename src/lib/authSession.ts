import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { deleteSession, findSession, getUserById } from "./authStore";

export const SESSION_COOKIE_NAME = "pharm_session";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
};

function secureInProd() {
  return process.env.NODE_ENV === "production";
}

/** Use on the same `NextResponse` you return from a Route Handler (required on Vercel). */
export function attachSessionCookie(res: NextResponse, sessionId: string) {
  res.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    ...cookieBase,
    secure: secureInProd(),
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export function clearSessionCookieOnResponse(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    ...cookieBase,
    secure: secureInProd(),
    maxAge: 0,
  });
}

export async function getCurrentUser() {
  const c = await cookies();
  const sessionId = c.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await findSession(sessionId);
  if (!session) return null;

  return await getUserById(session.userId);
}
