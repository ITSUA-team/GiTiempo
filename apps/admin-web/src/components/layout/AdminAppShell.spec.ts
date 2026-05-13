import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import { createMemoryHistory } from "vue-router";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import AdminAppShell from "./AdminAppShell.vue";
import { createAppRouter } from "@/router";
import { useAuthStore } from "@/stores/auth";

describe("AdminAppShell", () => {
  beforeEach(() => {
    clearRefreshToken();
    vi.stubEnv("VITE_USER_APP_URL", "https://user.example.test/login");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("preserves the visible user workspace link and shared navigation", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore(pinia);
    authStore.accessToken = "admin-access-token";
    authStore.bootstrapComplete = true;

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });
    await router.push("/");
    await router.isReady();

    const wrapper = mount(AdminAppShell, {
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute('data-tooltip', String(binding.value));
            },
          },
        },
        plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions]],
      },
    });
    const workspaceLink = wrapper.get(
      'a[href="https://user.example.test/login"]',
    );
    const settingsLinks = wrapper.findAll('a[href="/settings"]');

    expect(workspaceLink.text()).toBe("User workspace");
    expect(wrapper.find('[aria-label="Open workspace settings"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="top-bar-timer"]').exists()).toBe(false);
    expect(wrapper.findAll('a[aria-label="Reports"]')).toHaveLength(2);
    expect(settingsLinks).toHaveLength(2);
  });
});
