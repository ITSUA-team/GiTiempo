import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    allowAuthenticatedGuestFlow?: boolean;
    guestOnly?: boolean;
    pageName?: string;
    requiresAuth?: boolean;
  }
}
