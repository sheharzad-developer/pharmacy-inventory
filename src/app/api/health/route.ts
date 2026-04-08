import { NextResponse } from "next/server";

/** Use this URL on your host to confirm the app is running (no DB required). */
export async function GET() {
  return NextResponse.json({ ok: true, service: "pharmacy-inventory" });
}
