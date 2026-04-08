import { NextResponse } from "next/server";
import { createSession, findUserByEmail } from "@/lib/authStore";
import { verifyPassword } from "@/lib/passwords";
import { isValidEmailSyntax, normalizeEmail } from "@/lib/emailValidation";
import { attachSessionCookie } from "@/lib/authSession";
import { dbFailureUserMessage } from "@/lib/dbErrors";

type Body = { email?: unknown; password?: unknown };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !isValidEmailSyntax(email)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const session = await createSession(user.id);
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    attachSessionCookie(res, session.id);
    return res;
  } catch (e) {
    console.error("[api/auth/login]", e);
    const specific = dbFailureUserMessage(e);
    if (specific) {
      return NextResponse.json({ error: specific }, { status: 503 });
    }
    const showDetail =
      process.env.NODE_ENV !== "production" || process.env.SHOW_AUTH_ERRORS === "true";
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
    const detail = showDetail
      ? ` (${e instanceof Error ? e.name : "Error"}${code ? ` code=${code}` : ""}: ${e instanceof Error ? e.message : String(e)})`
      : "";
    return NextResponse.json({ error: `Login failed. Please try again later.${detail}` }, { status: 500 });
  }
}
