import { cookies } from "next/headers";
import { deleteSession, findSession, getUserById } from "./authStore";

const COOKIE_NAME = "pharm_session";

export async function getCurrentUser() {
  const c = await cookies();
  const sessionId = c.get(COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await findSession(sessionId);
  if (!session) return null;

  return await getUserById(session.userId);
}

export async function setSessionCookie(sessionId: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  const sessionId = c.get(COOKIE_NAME)?.value;
  if (sessionId) await deleteSession(sessionId);
  c.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

