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

  it("preserves the top-bar timer, profile menu, and shared navigation", async () => {
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
          RouterView: {
            template: '<div data-testid="dashboard-overview" />',
          },
          TopBarTimer: {
            template: '<div data-testid="top-bar-timer">Top bar timer</div>',
          },
          WorkspaceHeader: {
            props: [
              "counterpartHref",
              "counterpartLabel",
              "centerContentAlign",
              "displayName",
              "pageName",
              "settingsIcon",
              "settingsLabel",
              "settingsTo",
              "showDisplayName",
              "userInitials",
              "workspaceName",
            ],
            emits: ["signOut"],
            template: `
              <header>
                <span data-testid="workspace-header-page-name">{{ pageName }}</span>
                <span data-testid="workspace-header-center-align">{{ centerContentAlign }}</span>
                <span data-testid="workspace-header-show-display-name">{{ String(showDisplayName) }}</span>
                <div data-testid="workspace-header-center-row">
                  <slot name="center" />
                </div>
                <span v-if="settingsIcon" data-testid="profile-menu-icon">custom icon</span>
                <RouterLink data-testid="profile-menu-settings" :to="settingsTo">{{ settingsLabel }}</RouterLink>
                <button type="button" data-testid="profile-menu-sign-out" @click="$emit('signOut')">Sign out</button>
              </header>
            `,
          },
        },
      },
    });
    const profileLinks = wrapper.findAll('a[href="/profile"]');
    const timerLinks = wrapper.findAll('a[href="/timer"]');
    const settingsLink = wrapper.get('[data-testid="profile-menu-settings"]');

    expect(wrapper.find('[data-testid="profile-menu-icon"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="workspace-header-page-name"]').text()).toBe(
      "Dashboard",
    );
    expect(settingsLink.text()).toBe("Profile");
    expect(settingsLink.attributes("href")).toBe("/profile");
    expect(wrapper.get('[data-testid="workspace-header-center-align"]').text()).toBe("end");
    expect(wrapper.get('[data-testid="workspace-header-show-display-name"]').text()).toBe("false");
    expect(wrapper.find('[data-testid="dashboard-overview"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="workspace-header-center-row"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="top-bar-timer"]')).toHaveLength(1);
    expect(wrapper.findAll('a[aria-label="Dashboard"]')).toHaveLength(2);
    expect(wrapper.findAll('a[aria-label="Time Entries"]')).toHaveLength(2);
    expect(wrapper.findAll('a[aria-label="Profile"]')).toHaveLength(0);
    expect(profileLinks).toHaveLength(1);
    expect(timerLinks).toHaveLength(0);

    await router.push({ name: routeNames.timeEntries });
    await flushPromises();
    expect(wrapper.get('[data-testid="workspace-header-page-name"]').text()).toBe(
      "Time Entries",
    );

    await router.push({ name: routeNames.project });
    await flushPromises();
    expect(wrapper.get('[data-testid="workspace-header-page-name"]').text()).toBe(
      "Projects",
    );

    await router.push({ name: routeNames.profile });
    await flushPromises();
    expect(wrapper.get('[data-testid="workspace-header-page-name"]').text()).toBe(
      "Profile",
    );

    await wrapper.get('[data-testid="profile-menu-sign-out"]').trigger("click");
    await flushPromises();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.name).toBe(routeNames.login);
  });
});
