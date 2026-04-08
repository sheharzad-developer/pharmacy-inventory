import type { NewMedicineInput } from "../medicineTypes";

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function isValidDateString(v: unknown): v is string {
  if (typeof v !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function toNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

export type NewMedicineBody = {
  name?: unknown;
  batchNumber?: unknown;
  expiryDate?: unknown;
  quantity?: unknown;
  price?: unknown;
};

export type ParsedMedicine =
  | { ok: true; input: NewMedicineInput }
  | { ok: false; error: string; status: number };

export function parseNewMedicineBody(body: NewMedicineBody): ParsedMedicine {
  if (!isNonEmptyString(body.name)) {
    return { ok: false, error: "Medicine Name is required.", status: 400 };
  }
  if (!isNonEmptyString(body.batchNumber)) {
    return { ok: false, error: "Batch Number is required.", status: 400 };
  }
  if (!isValidDateString(body.expiryDate)) {
    return { ok: false, error: "Expiry Date must be a valid date (YYYY-MM-DD).", status: 400 };
  }

  const quantity = toNumber(body.quantity);
  if (quantity === null || quantity < 0 || !Number.isInteger(quantity)) {
    return { ok: false, error: "Quantity must be a whole number (0 or more).", status: 400 };
  }

  const price = toNumber(body.price);
  if (price === null || price < 0) {
    return { ok: false, error: "Price must be 0 or more.", status: 400 };
  }

  return {
    ok: true,
    input: {
      name: body.name.trim(),
      batchNumber: body.batchNumber.trim(),
      expiryDate: body.expiryDate,
      quantity,
      price,
    },
  };
}

export type SellBody = {
  id?: unknown;
  amount?: unknown;
};

export type ParsedSell =
  | { ok: true; id: string; amount: number }
  | { ok: false; error: string; status: number };

export function parseSellBody(body: SellBody, defaultAmount = 1): ParsedSell {
  if (!isNonEmptyString(body.id)) {
    return { ok: false, error: "Medicine id is required.", status: 400 };
  }

  const raw = body.amount ?? defaultAmount;
  const amount = toNumber(raw);
  if (amount === null || amount <= 0 || !Number.isInteger(amount)) {
    return {
      ok: false,
      error: defaultAmount === 1 ? "Sell amount must be a whole number (1 or more)." : "Sell quantity must be a whole number (1 or more).",
      status: 400,
    };
  }

  return { ok: true, id: body.id.trim(), amount };
}

/** Pure sell rules against current quantity (for tests and consistent errors). */
export function validateSellAgainstStock(currentQty: number, amount: number): { ok: true } | { ok: false; error: string; status: number } {
  if (currentQty <= 0) {
    return { ok: false, error: "Out of stock.", status: 409 };
  }
  if (currentQty < amount) {
    return { ok: false, error: `Not enough stock. Available: ${currentQty}.`, status: 409 };
  }
  return { ok: true };
}
