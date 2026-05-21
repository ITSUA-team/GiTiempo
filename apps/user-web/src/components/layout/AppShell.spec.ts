// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
        },
      },
    });
    const workspaceLink = wrapper.get(
      'a[href="https://admin.example.test/login"]',
    );
    const profileLinks = wrapper.findAll('a[href="/profile"]');
    const timerLinks = wrapper.findAll('a[href="/timer"]');

    expect(workspaceLink.text()).toBe("Admin workspace");
    expect(wrapper.find('[aria-label="Open profile settings"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="dashboard-overview"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="workspace-header-center-row"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="top-bar-timer"]')).toHaveLength(1);
    expect(wrapper.findAll('a[aria-label="Dashboard"]')).toHaveLength(2);
    expect(wrapper.findAll('a[aria-label="Time Entries"]')).toHaveLength(2);
    expect(profileLinks).toHaveLength(2);
    expect(timerLinks).toHaveLength(0);
  });
});
