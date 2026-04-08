import { NextResponse } from "next/server";
import { getAllMedicines } from "@/lib/medicinesStore";
import type { Medicine } from "@/lib/medicineTypes";
import { requireInventoryAccess } from "@/lib/requireAuth";

type InsightsResponse = {
  source: "local" | "gemini";
  lowStock: {
    id: string;
    name: string;
    batchNumber: string;
    quantity: number;
  }[];
  expiringSoon: {
    id: string;
    name: string;
    batchNumber: string;
    expiryDate: string;
    daysUntilExpiry: number;
  }[];
  suggestions: string[];
  note?: string;
};

function daysUntil(dateString: string): number | null {
  const d = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((d.getTime() - Date.now()) / msPerDay);
}

function suggestedReorderQty(currentQty: number, targetQty: number) {
  return Math.max(0, targetQty - currentQty);
}

function generateLocalInsights(items: Medicine[]): InsightsResponse {
  const nowMs = Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;
  const TARGET_STOCK_QTY = 30;

  const lowStock = items
    .filter((m) => m.quantity < 10)
    .sort((a, b) => a.quantity - b.quantity)
    .map((m) => ({
      id: m.id,
      name: m.name,
      batchNumber: m.batchNumber,
      quantity: m.quantity,
    }));

  const expiringSoon = items
    .map((m) => ({ m, days: daysUntil(m.expiryDate) }))
    .filter((x) => x.days !== null && x.days >= 0 && x.days < 30)
    .sort((a, b) => (a.days as number) - (b.days as number))
    .map(({ m, days }) => ({
      id: m.id,
      name: m.name,
      batchNumber: m.batchNumber,
      expiryDate: m.expiryDate,
      daysUntilExpiry: days as number,
    }));

  const suggestions: string[] = [];

  for (const m of lowStock) {
    const reorder = suggestedReorderQty(m.quantity, TARGET_STOCK_QTY);
    suggestions.push(
      `Order ${m.name}: only ${m.quantity} left (batch ${m.batchNumber}). Suggested reorder: ${reorder} unit(s) to reach ${TARGET_STOCK_QTY}.`,
    );
  }

  if (expiringSoon.length > 0) {
    const soonest = expiringSoon[0];
    const list = expiringSoon
      .slice(0, 5)
      .map((m) => `${m.name} (${m.daysUntilExpiry} day${m.daysUntilExpiry === 1 ? "" : "s"})`)
      .join(", ");
    suggestions.push(`These medicines will expire soon (soonest in ${soonest.daysUntilExpiry} days): ${list}.`);
  }

  if (items.length > 0) {
    const lowTurnoverHint = items
      .map((m) => ({
        m,
        ageDays: Number.isFinite(Date.parse(m.createdAt)) ? Math.floor((nowMs - Date.parse(m.createdAt)) / msPerDay) : null,
      }))
      .filter((x) => x.m.quantity >= 50 && (x.ageDays === null || x.ageDays >= 14))
      .sort((a, b) => b.m.quantity - a.m.quantity)
      .slice(0, 3)
      .map((x) => x.m);
    if (lowTurnoverHint.length > 0) {
      suggestions.push(
        `Slow-moving note: consider reviewing high-stock items that have been in inventory for a while: ${lowTurnoverHint.map((m) => `${m.name} (qty ${m.quantity})`).join(", ")}.`,
      );
    }
  } else {
    suggestions.push("Add your first medicine to start tracking inventory.");
  }

  if (suggestions.length === 0) {
    suggestions.push("Inventory looks healthy. Keep monitoring weekly.");
  }

  return { source: "local", lowStock, expiringSoon, suggestions };
}

export async function POST() {
  const gate = await requireInventoryAccess();
  if ("response" in gate) return gate.response;

  const items = await getAllMedicines();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(generateLocalInsights(items));
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const prompt = [
    "Return JSON only. No markdown. No extra text.",
    "You are helping a pharmacy manager understand their inventory.",
    "",
    "Given inventory JSON, return this exact JSON shape:",
    "{",
    '  "lowStock": [{ "id": string, "name": string, "batchNumber": string, "quantity": number }],',
    '  "expiringSoon": [{ "id": string, "name": string, "batchNumber": string, "expiryDate": string, "daysUntilExpiry": number }],',
    '  "suggestions": [string]',
    "}",
    "",
    "Rules:",
    "- lowStock means quantity < 10",
    "- expiringSoon means daysUntilExpiry is 0..29",
    "- suggestions should include actionable lines like:",
    '  - "Order Paracetamol: only 2 left"',
    '  - "These medicines will expire in 7 days: ..."',
    '  - "Consider reducing slow-moving items: ..."',
    "",
    "Inventory JSON:",
    JSON.stringify(items),
  ].join("\n");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      },
    );

    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const msg =
        typeof (data?.error as { message?: string } | undefined)?.message === "string"
          ? (data.error as { message: string }).message
          : "Gemini request failed.";

      const status = Number(res.status);
      const isQuota =
        status === 429 || (typeof msg === "string" && /quota exceeded|rate limit/i.test(msg));
      if (isQuota) {
        const fallback = generateLocalInsights(items);
        return NextResponse.json({ ...fallback, note: msg });
      }

      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const text: string =
      (data?.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined)?.[0]?.content?.parts
        ?.map((p) => p?.text)
        .filter(Boolean)
        .join("") || "No insights returned.";

    try {
      const parsed = JSON.parse(text) as Omit<InsightsResponse, "source">;
      return NextResponse.json({
        source: "gemini",
        lowStock: Array.isArray((parsed as { lowStock?: unknown }).lowStock)
          ? (parsed as { lowStock: InsightsResponse["lowStock"] }).lowStock
          : [],
        expiringSoon: Array.isArray((parsed as { expiringSoon?: unknown }).expiringSoon)
          ? (parsed as { expiringSoon: InsightsResponse["expiringSoon"] }).expiringSoon
          : [],
        suggestions: Array.isArray((parsed as { suggestions?: unknown }).suggestions)
          ? (parsed as { suggestions: string[] }).suggestions
          : [text],
      } satisfies InsightsResponse);
    } catch {
      const fallback = generateLocalInsights(items);
      return NextResponse.json({ ...fallback, note: "Gemini returned non-JSON; using local fallback." });
    }
  } catch {
    return NextResponse.json(generateLocalInsights(items));
  }
}
