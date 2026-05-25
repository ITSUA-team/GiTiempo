import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    allowAuthenticatedGuestFlow?: boolean;
    guestOnly?: boolean;
    requiresAuth?: boolean;
  }
}
