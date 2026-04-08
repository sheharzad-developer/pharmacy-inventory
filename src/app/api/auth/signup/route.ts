import { NextResponse } from "next/server";
import { createUser, findUserByEmail, createSession } from "@/lib/authStore";
import { hashPassword } from "@/lib/passwords";
import { isDisposableEmail, isValidEmailSyntax, normalizeEmail } from "@/lib/emailValidation";
import { attachSessionCookie } from "@/lib/authSession";
import { parseRole } from "@/lib/roles";

type Body = { name?: unknown; email?: unknown; password?: unknown; role?: unknown };

function pgErrorMessage(e: unknown): string | null {
  const msg = e instanceof Error ? e.message : String(e);
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg)) {
    return "Cannot reach the database. Use a public Postgres URL (e.g. Neon/Supabase) in Vercel env; local Docker URLs will not work.";
  }
  const code =
    typeof e === "object" && e !== null && "code" in e ? String((e as { code: string }).code) : "";
  if (code === "23505") return "Email already registered.";
  if (code === "42P01") return "Database tables are missing. Run sql/schema.sql on your Postgres database.";
  if (code === "3D000") return "Database does not exist. Check DATABASE_URL.";
  return null;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = parseRole(body.role) ?? "staff";

  if (!name) {
    return NextResponse.json({ error: "Missing fields: name" }, { status: 400 });
  }
  if (!email || !isValidEmailSyntax(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: "Disposable email addresses are not allowed." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ name, email, passwordHash, role });
    const session = await createSession(user.id);

    const res = NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
      { status: 201 },
    );
    attachSessionCookie(res, session.id);
    return res;
  } catch (e) {
    console.error("[api/auth/signup]", e);
    const specific = pgErrorMessage(e);
    if (specific) {
      const status = specific.includes("Email already") ? 409 : 503;
      return NextResponse.json({ error: specific }, { status });
    }
    return NextResponse.json({ error: "Signup failed. Please try again later." }, { status: 500 });
  }
}
