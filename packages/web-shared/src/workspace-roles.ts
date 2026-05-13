import { WorkspaceRoles } from "@gitiempo/shared";
import type { WorkspaceRole } from "@gitiempo/shared";

export interface WorkspaceRoleOption {
  label: string;
  value: WorkspaceRole;
}

export const WORKSPACE_ROLE_OPTIONS: WorkspaceRoleOption[] = [
  { label: "Member", value: WorkspaceRoles.Member },
  { label: "PM", value: WorkspaceRoles.PM },
  { label: "Admin", value: WorkspaceRoles.Admin },
] as const;

export function formatWorkspaceRole(role: WorkspaceRole): string {
  const option = WORKSPACE_ROLE_OPTIONS.find((o) => o.value === role);
  return option?.label ?? role;
}
