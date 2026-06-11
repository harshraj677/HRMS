export const ROLES = ["admin", "hr", "manager", "employee"] as const;

export type Role = (typeof ROLES)[number];

export function canManageOrgStructure(role: string): boolean {
  return role === "admin" || role === "hr";
}

export function isManagerOrAbove(role: string): boolean {
  return role === "admin" || role === "hr" || role === "manager";
}
