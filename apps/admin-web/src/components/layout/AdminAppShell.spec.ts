import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import { createMemoryHistory } from "vue-router";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import AdminAppShell from "./AdminAppShell.vue";
import { createAppRouter } from "@/router";
import { useAuthStore } from "@/stores/auth";

const testMocks = vi.hoisted(() => ({
  errorToast: vi.fn(),
  getWorkspace: vi.fn(),
}));

vi.mock("@/services/admin-settings-client", () => ({
  adminSettingsClient: {
    getWorkspace: testMocks.getWorkspace,
  },
}));

vi.mock("@/composables/useToasts", () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
  }),
}));

describe("AdminAppShell", () => {
  beforeEach(() => {
    clearRefreshToken();
    testMocks.errorToast.mockReset();
    testMocks.getWorkspace.mockReset();
    testMocks.getWorkspace.mockResolvedValue({
      createdAt: "2026-05-01T10:00:00.000Z",
      id: "11111111-1111-4111-8111-111111111111",
      name: "GiTiempo Studio",
      updatedAt: "2026-05-01T10:00:00.000Z",
    });
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
    expect(settingsLinks).toHaveLength(2);

    await flushPromises();

    expect(testMocks.getWorkspace).toHaveBeenCalledWith("admin-access-token");
    expect(wrapper.text()).toContain("GiTiempo Studio");
  });

  it("keeps the fallback workspace label and shows toast feedback when shell workspace load fails", async () => {
    testMocks.getWorkspace.mockRejectedValueOnce(new Error("Workspace unavailable"));
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
        plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions]],
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("Workspace Admin");
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      "Workspace unavailable",
      expect.objectContaining({
        logContext: { action: "load-workspace-name", feature: "admin-shell" },
      }),
    );
  });
});
