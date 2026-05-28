import type { WorkspaceRole } from "@gitiempo/shared";

export function hasAllowedRole(
  allowedRoles: readonly WorkspaceRole[] | undefined,
  role: WorkspaceRole | null | undefined,
): boolean {
  return allowedRoles === undefined || Boolean(role && allowedRoles.includes(role));
}
