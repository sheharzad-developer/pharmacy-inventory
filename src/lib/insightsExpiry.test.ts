import { describe, expect, it } from "vitest";

/** Mirrors dashboard / insights expiry window: 0..29 days = expiring soon */
function daysUntilExpiry(dateString: string, nowMs: number): number | null {
  const d = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((d.getTime() - nowMs) / msPerDay);
}

describe("expiring medicines window", () => {
  it("treats item expiring in 15 days as expiring soon", () => {
    const now = new Date("2026-01-01T12:00:00.000Z").getTime();
    const days = daysUntilExpiry("2026-01-16", now);
    expect(days).not.toBeNull();
    expect(days! >= 0 && days! < 30).toBe(true);
  });

  it("excludes already-expired for soon filter when negative", () => {
    const now = new Date("2026-06-01T12:00:00.000Z").getTime();
    const days = daysUntilExpiry("2026-01-01", now);
    expect(days).not.toBeNull();
    expect(days! < 0).toBe(true);
  });
});
