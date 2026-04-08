import { describe, expect, it } from "vitest";
import {
  parseNewMedicineBody,
  parseSellBody,
  validateSellAgainstStock,
} from "./medicine";

describe("parseNewMedicineBody", () => {
  it("accepts valid payload", () => {
    const r = parseNewMedicineBody({
      name: " Aspirin ",
      batchNumber: "B1",
      expiryDate: "2027-01-15",
      quantity: 10,
      price: 5.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.name).toBe("Aspirin");
      expect(r.input.quantity).toBe(10);
    }
  });

  it("rejects invalid email-like name missing", () => {
    const r = parseNewMedicineBody({
      name: "",
      batchNumber: "B1",
      expiryDate: "2027-01-15",
      quantity: 1,
      price: 0,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects bad date format", () => {
    const r = parseNewMedicineBody({
      name: "X",
      batchNumber: "B1",
      expiryDate: "01-15-2027",
      quantity: 1,
      price: 0,
    });
    expect(r.ok).toBe(false);
  });
});

describe("parseSellBody", () => {
  it("parses amount default 1 for PATCH-style", () => {
    const r = parseSellBody({ id: "uuid-here" }, 1);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.amount).toBe(1);
  });

  it("rejects zero amount", () => {
    const r = parseSellBody({ id: "x", amount: 0 });
    expect(r.ok).toBe(false);
  });
});

describe("validateSellAgainstStock", () => {
  it("fails when selling more than available", () => {
    const r = validateSellAgainstStock(3, 5);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Not enough stock");
  });

  it("fails when out of stock", () => {
    const r = validateSellAgainstStock(0, 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Out of stock.");
  });

  it("succeeds when enough stock", () => {
    expect(validateSellAgainstStock(10, 3).ok).toBe(true);
  });
});
