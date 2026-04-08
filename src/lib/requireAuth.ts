import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findSession, getUserById } from "./authStore";
import type { PublicUser, UserRole } from "./authTypes";
import { canAccessInventory } from "./roles";

const COOKIE_NAME = "pharm_session";

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const c = await cookies();
  const sessionId = c.get(COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await findSession(sessionId);
  if (!session) return null;

  const user = await getUserById(session.userId);
  if (!user) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function requireInventoryAccess(): Promise<{ user: PublicUser } | { response: NextResponse }> {
  const user = await getSessionUser();
  if (!user) return { response: unauthorizedResponse() };
  if (!canAccessInventory(user.role as UserRole)) return { response: forbiddenResponse() };
  return { user };
}
