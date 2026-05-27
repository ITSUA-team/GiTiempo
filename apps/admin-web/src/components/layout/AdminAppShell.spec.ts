import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import { createMemoryHistory } from "vue-router";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";
import ToastService from "primevue/toastservice";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import AdminAppShell from "./AdminAppShell.vue";
import { createAppRouter, routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const testMocks = vi.hoisted(() => ({
  errorToast: vi.fn(),
  getWorkspace: vi.fn(),
}));

const RouterViewStub = {
  name: "RouterView",
  template: '<div data-testid="router-view" />',
};

vi.mock("@/services/admin-settings-client", () => ({
  adminSettingsClient: {
    getWorkspace: testMocks.getWorkspace,
  },
}));

vi.mock("@/composables/feedback/useToasts", () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
  }),
}));

const WorkspaceHeaderStub = {
  props: [
    "counterpartHref",
    "counterpartLabel",
    "displayName",
    "settingsIcon",
    "settingsLabel",
    "settingsTo",
    "userInitials",
    "workspaceName",
  ],
  emits: ["signOut"],
  template: `
    <header>
      <span>{{ workspaceName }}</span>
      <span v-if="settingsIcon" data-testid="profile-menu-icon">custom icon</span>
      <RouterLink data-testid="profile-menu-settings" :to="settingsTo">{{ settingsLabel }}</RouterLink>
      <button type="button" data-testid="profile-menu-sign-out" @click="$emit('signOut')">Sign out</button>
    </header>
  `,
};

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

  it("preserves the profile menu and shared navigation", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore(pinia);
    authStore.accessToken = "admin-access-token";
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

    const wrapper = mount(AdminAppShell, {
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute('data-tooltip', String(binding.value));
            },
          },
        },
        plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions], ToastService],
        stubs: {
          RouterView: RouterViewStub,
          WorkspaceHeader: WorkspaceHeaderStub,
        },
      },
    });
    const settingsLinks = wrapper.findAll('a[href="/settings"]');
    const settingsLink = wrapper.get('[data-testid="profile-menu-settings"]');

    expect(wrapper.find('[data-testid="profile-menu-icon"]').exists()).toBe(true);
    expect(settingsLink.text()).toBe("Settings");
    expect(settingsLink.attributes("href")).toBe("/settings");
    expect(wrapper.find('[data-testid="top-bar-timer"]').exists()).toBe(false);
    expect(wrapper.findAll('a[aria-label="Reports"]')).toHaveLength(2);
    expect(wrapper.findAll('a[aria-label="Settings"]')).toHaveLength(0);
    expect(settingsLinks).toHaveLength(1);

    await wrapper.get('[data-testid="profile-menu-sign-out"]').trigger("click");
    await flushPromises();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.name).toBe(routeNames.login);

    await flushPromises();

    expect(testMocks.getWorkspace).toHaveBeenCalledWith();
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
        stubs: {
          RouterView: RouterViewStub,
          WorkspaceHeader: WorkspaceHeaderStub,
        },
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
