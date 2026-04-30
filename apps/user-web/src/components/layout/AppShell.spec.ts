// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import { createMemoryHistory } from "vue-router";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import AppShell from "./AppShell.vue";
import { createAppRouter } from "@/router";
import { useAuthStore } from "@/stores/auth";

describe("AppShell", () => {
  beforeEach(() => {
    clearRefreshToken();
  });

  it("preserves the visible admin workspace link and profile action", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore(pinia);
    authStore.accessToken = "user-access-token";
    authStore.bootstrapComplete = true;

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });
    await router.push("/");
    await router.isReady();

    const wrapper = mount(AppShell, {
      global: {
        plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions]],
      },
    });
    const workspaceLink = wrapper.get('a[href="http://localhost:5174"]');
    const profileLink = wrapper.get('a[aria-label="Open profile settings"]');

    expect(workspaceLink.text()).toBe("Admin workspace");
    expect(profileLink.attributes("href")).toBe("/profile");
  });
});
