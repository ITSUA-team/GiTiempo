import type { WorkspaceRole } from "@gitiempo/shared";
import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    allowedRoles?: readonly WorkspaceRole[];
    guestOnly?: boolean;
    requiresAuth?: boolean;
  }
}
