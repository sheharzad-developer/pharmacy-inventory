import { describe, expect, it } from "vitest";
import { canAccessInventory, parseRole } from "./roles";

describe("parseRole", () => {
  it("parses known roles case-insensitively", () => {
    expect(parseRole("Admin")).toBe("admin");
    expect(parseRole("PHARMACIST")).toBe("pharmacist");
    expect(parseRole("staff")).toBe("staff");
  });

  it("returns null for unknown", () => {
    expect(parseRole("superuser")).toBeNull();
    expect(parseRole(null)).toBeNull();
  });
});

describe("canAccessInventory", () => {
  it("allows all three roles", () => {
    expect(canAccessInventory("admin")).toBe(true);
    expect(canAccessInventory("staff")).toBe(true);
    expect(canAccessInventory("pharmacist")).toBe(true);
  });
});
