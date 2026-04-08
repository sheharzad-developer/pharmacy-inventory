import { NextResponse } from "next/server";
import { addMedicine, getAllMedicines, sellMedicine } from "@/lib/medicinesStore";
import { requireInventoryAccess } from "@/lib/requireAuth";
import { parseNewMedicineBody, parseSellBody } from "@/lib/validation/medicine";

function sellErrorStatus(msg: string): number {
  if (msg === "Medicine not found.") return 404;
  if (msg === "Out of stock." || msg.startsWith("Not enough stock")) return 409;
  return 400;
}

export async function GET() {
  const auth = await requireInventoryAccess();
  if ("response" in auth) return auth.response;

  const items = await getAllMedicines();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireInventoryAccess();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseNewMedicineBody(body as Parameters<typeof parseNewMedicineBody>[0]);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const item = await addMedicine({
    ...parsed.input,
    createdByUserId: auth.user.id,
  });
  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireInventoryAccess();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseSellBody(body as Parameters<typeof parseSellBody>[0], 1);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  try {
    const item = await sellMedicine(parsed.id, parsed.amount);
    return NextResponse.json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sell failed.";
    return NextResponse.json({ error: msg }, { status: sellErrorStatus(msg) });
  }
}
