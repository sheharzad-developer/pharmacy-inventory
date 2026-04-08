import { randomUUID } from "crypto";
import { getPool, hasDatabase } from "./db";
import type { Session, User, UserRole } from "./authTypes";

const SESSION_TTL_DAYS = 7;

function isoNow() {
  return new Date().toISOString();
}

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const memUsers: User[] = [];
const memSessions: Session[] = [];

export async function createUser(params: {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}): Promise<User> {
  if (hasDatabase()) {
    const pool = getPool();
    const id = randomUUID();
    const result = await pool.query(
      `insert into users (id, email, password_hash, name, role)
       values ($1, $2, $3, $4, $5)
       returning id, email, password_hash as "passwordHash", name, role, created_at as "createdAt"`,
      [id, params.email, params.passwordHash, params.name, params.role],
    );
    return result.rows[0] as User;
  }

  if (memUsers.some((u) => u.email === params.email)) {
    throw new Error("Email already registered.");
  }
  const user: User = {
    id: randomUUID(),
    name: params.name,
    email: params.email,
    passwordHash: params.passwordHash,
    role: params.role,
    createdAt: isoNow(),
  };
  memUsers.push(user);
  return user;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  if (hasDatabase()) {
    const pool = getPool();
    const result = await pool.query(
      `select id, email, password_hash as "passwordHash", name, role, created_at as "createdAt"
       from users where email=$1`,
      [email],
    );
    const row = result.rows[0] as User | undefined;
    return row ?? null;
  }

  return memUsers.find((u) => u.email === email) ?? null;
}

export async function createSession(userId: string): Promise<Session> {
  const session: Session = {
    id: randomUUID(),
    userId,
    expiresAt: addDaysIso(SESSION_TTL_DAYS),
    createdAt: isoNow(),
  };

  if (hasDatabase()) {
    const pool = getPool();
    const result = await pool.query(
      `insert into sessions (id, user_id, expires_at)
       values ($1, $2, $3)
       returning id, user_id as "userId", expires_at as "expiresAt", created_at as "createdAt"`,
      [session.id, session.userId, session.expiresAt],
    );
    return result.rows[0] as Session;
  }

  memSessions.push(session);
  return session;
}

export async function findSession(sessionId: string): Promise<Session | null> {
  if (hasDatabase()) {
    const pool = getPool();
    const result = await pool.query(
      `select id, user_id as "userId", expires_at as "expiresAt", created_at as "createdAt"
       from sessions where id=$1`,
      [sessionId],
    );
    const row = result.rows[0] as Session | undefined;
    if (!row) return null;
    if (new Date(row.expiresAt).getTime() <= Date.now()) return null;
    return row;
  }

  const s = memSessions.find((x) => x.id === sessionId);
  if (!s) return null;
  if (new Date(s.expiresAt).getTime() <= Date.now()) return null;
  return s;
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (hasDatabase()) {
    const pool = getPool();
    await pool.query(`delete from sessions where id=$1`, [sessionId]);
    return;
  }

  const idx = memSessions.findIndex((x) => x.id === sessionId);
  if (idx !== -1) memSessions.splice(idx, 1);
}

export async function getUserById(
  userId: string,
): Promise<Pick<User, "id" | "email" | "createdAt" | "name" | "role"> | null> {
  if (hasDatabase()) {
    const pool = getPool();
    const result = await pool.query(
      `select id, email, name, role, created_at as "createdAt" from users where id=$1`,
      [userId],
    );
    const row = result.rows[0] as
      | (Pick<User, "id" | "email" | "createdAt" | "name" | "role"> & { role: string })
      | undefined;
    if (!row) return null;
    return { ...row, role: row.role as UserRole };
  }

  const u = memUsers.find((x) => x.id === userId);
  if (!u) return null;
  return { id: u.id, email: u.email, createdAt: u.createdAt, name: u.name, role: u.role };
}
