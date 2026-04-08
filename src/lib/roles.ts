import type { UserRole } from "./authTypes";

const ROLES: ReadonlySet<string> = new Set(["admin", "staff", "pharmacist"]);

export function parseRole(value: unknown): UserRole | null {
  if (typeof value !== "string") return null;
  const r = value.trim().toLowerCase();
  return ROLES.has(r) ? (r as UserRole) : null;
}

/** Roles that may list, add, sell medicines and use insights. */
export function canAccessInventory(role: UserRole): boolean {
  return role === "admin" || role === "staff" || role === "pharmacist";
}
