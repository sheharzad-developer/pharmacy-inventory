import { NextResponse } from "next/server";
import { createUser, findUserByEmail, createSession } from "@/lib/authStore";
import { hashPassword } from "@/lib/passwords";
import { isDisposableEmail, isValidEmailSyntax, normalizeEmail } from "@/lib/emailValidation";
import { setSessionCookie } from "@/lib/authSession";
import { parseRole } from "@/lib/roles";

type Body = { name?: unknown; email?: unknown; password?: unknown; role?: unknown };

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

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email already registered." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ name, email, passwordHash, role });
  const session = await createSession(user.id);
  await setSessionCookie(session.id);

  return NextResponse.json(
    { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
    { status: 201 },
  );
}
