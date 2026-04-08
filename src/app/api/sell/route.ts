import { NextResponse } from "next/server";
import { sellMedicine } from "@/lib/medicinesStore";
import { requireInventoryAccess } from "@/lib/requireAuth";
import { parseSellBody } from "@/lib/validation/medicine";

function sellErrorStatus(msg: string): number {
  if (msg === "Medicine not found.") return 404;
  if (msg === "Out of stock." || msg.startsWith("Not enough stock")) return 409;
  return 400;
}

export async function POST(req: Request) {
  const gate = await requireInventoryAccess();
  if ("response" in gate) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseSellBody(body as Parameters<typeof parseSellBody>[0]);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  try {
    const item = await sellMedicine(parsed.id, parsed.amount);
    return NextResponse.json({ item, message: `Sold ${parsed.amount} unit(s).` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sell failed.";
    return NextResponse.json({ error: msg }, { status: sellErrorStatus(msg) });
  }
}
