import type { CurrentUserWorkspaceMembershipResponse } from "@gitiempo/shared";

export type WorkspaceSwitchStatus = "available" | "current" | "switching";

export function getWorkspaceRoleLabel(
  role: CurrentUserWorkspaceMembershipResponse["role"],
): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "pm":
      return "PM";
    case "member":
      return "Member";
  }
}

export function getWorkspaceSwitchStatus(
  membership: Pick<
    CurrentUserWorkspaceMembershipResponse,
    "isCurrent" | "workspaceId"
  >,
  switchingWorkspaceId: string | null,
): WorkspaceSwitchStatus {
  if (switchingWorkspaceId === membership.workspaceId) {
    return "switching";
  }

  if (membership.isCurrent) {
    return "current";
  }

  return "available";
}

export function getWorkspaceSwitchStatusLabel(
  status: WorkspaceSwitchStatus,
): string | null {
  switch (status) {
    case "available":
      return null;
    case "current":
      return "Current";
    case "switching":
      return "Switching...";
  }
}

export function getWorkspaceSwitchActionLabel(
  status: WorkspaceSwitchStatus,
): string {
  return getWorkspaceSwitchStatusLabel(status) ?? "Select";
}

export function isWorkspaceSwitchDisabled(
  membership: Pick<CurrentUserWorkspaceMembershipResponse, "isCurrent">,
  switchingWorkspaceId: string | null,
): boolean {
  return membership.isCurrent || switchingWorkspaceId !== null;
}
