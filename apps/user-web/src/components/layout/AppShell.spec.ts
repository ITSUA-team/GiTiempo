// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import { createMemoryHistory } from "vue-router";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import AppShell from "./AppShell.vue";
import { createAppRouter, routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

describe("AppShell", () => {
  beforeEach(() => {
    clearRefreshToken();
    vi.stubEnv("VITE_ADMIN_APP_URL", "https://admin.example.test/login");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("preserves the visible admin workspace link, top-bar timer, and shared navigation", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore(pinia);
    authStore.accessToken = "user-access-token";
    authStore.bootstrapComplete = true;
    const logoutSpy = vi.spyOn(authStore, "logout").mockImplementation(async () => {
      authStore.accessToken = null;
    });

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });
    await router.push("/");
    await router.isReady();

    const wrapper = mount(AppShell, {
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute('data-tooltip', String(binding.value));
            },
          },
        },
        plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          DashboardOverview: {
            template: '<div data-testid="dashboard-overview" />',
          },
          TopBarTimer: {
            template: '<div data-testid="top-bar-timer">Top bar timer</div>',
          },
          WorkspaceHeader: {
            props: [
              "counterpartHref",
              "counterpartLabel",
              "displayName",
              "settingsTo",
              "userInitials",
              "workspaceName",
            ],
            emits: ["signOut"],
            template: `
              <header>
                <a :href="counterpartHref">{{ counterpartLabel }}</a>
                <slot name="center" />
                <RouterLink data-testid="profile-menu-settings" :to="settingsTo">Settings</RouterLink>
                <button type="button" data-testid="profile-menu-sign-out" @click="$emit('signOut')">Sign out</button>
              </header>
            `,
          },
        },
      },
    });
    const workspaceLink = wrapper.get(
      'a[href="https://admin.example.test/login"]',
    );
    const profileLinks = wrapper.findAll('a[href="/profile"]');
    const timerLinks = wrapper.findAll('a[href="/timer"]');
    const settingsLink = wrapper.get('[data-testid="profile-menu-settings"]');

    expect(workspaceLink.text()).toBe("Admin workspace");
    expect(settingsLink.attributes("href")).toBe("/profile");
    expect(wrapper.find('[data-testid="dashboard-overview"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="top-bar-timer"]').exists()).toBe(true);
    expect(wrapper.findAll('a[aria-label="Dashboard"]')).toHaveLength(2);
    expect(wrapper.findAll('a[aria-label="Time Entries"]')).toHaveLength(2);
    expect(profileLinks).toHaveLength(3);
    expect(timerLinks).toHaveLength(0);

    await wrapper.get('[data-testid="profile-menu-sign-out"]').trigger("click");
    await flushPromises();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.name).toBe(routeNames.login);
  });
});
