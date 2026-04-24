import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";

import { createAppRouter, routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

describe("admin router", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("defines the documented admin route inventory", () => {
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia: createPinia(),
    });

    expect(router.hasRoute(routeNames.login)).toBe(true);
    expect(router.hasRoute(routeNames.dashboard)).toBe(true);
    expect(router.hasRoute(routeNames.reports)).toBe(true);
    expect(router.hasRoute(routeNames.invoices)).toBe(true);
    expect(router.hasRoute(routeNames.members)).toBe(true);
    expect(router.hasRoute(routeNames.projects)).toBe(true);
    expect(router.hasRoute(routeNames.settings)).toBe(true);
  });

  it("redirects anonymous users to login and preserves the requested route", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/reports");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.query.redirect).toBe("/reports");
  });

  it("redirects authenticated users away from login to the default route", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore(pinia);
    authStore.accessToken = "admin-access-token";
    authStore.bootstrapComplete = true;

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/login");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("resumes a valid preserved redirect for authenticated login visits", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore(pinia);
    authStore.accessToken = "admin-access-token";
    authStore.bootstrapComplete = true;

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/login?redirect=%2Fsettings");
    await router.isReady();

    expect(router.currentRoute.value.fullPath).toBe("/settings");
  });
});
