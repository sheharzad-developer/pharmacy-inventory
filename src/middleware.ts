import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "pharm_session";

export function middleware(request: NextRequest) {
  const session = request.cookies.get(COOKIE)?.value;
  if (session) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/inventory", "/inventory/:path*", "/add-medicine", "/add-medicine/:path*"],
};
