import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import { createMemoryHistory } from "vue-router";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";
import {
  type CurrentUserWorkspaceMembershipListResponse,
  WorkspaceRoles,
  type UserResponse,
  type WorkspaceRole,
} from "@gitiempo/shared";
import ToastService from "primevue/toastservice";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import {
  resetAuthRuntimeForTesting,
  setAuthRuntimeForTesting,
  type AuthRuntime,
} from "@/services/auth-runtime";
import AdminAppShell from "./AdminAppShell.vue";
import { createAppRouter, routeNames } from "@/router";
import { navigateToExternalHref } from "@/services/external-navigation";
import { useAuthStore } from "@/stores/auth";

const testMocks = vi.hoisted(() => ({
  errorToast: vi.fn(),
  getWorkspace: vi.fn(),
}));

const RouterViewStub = {
  name: "RouterView",
  template: '<div data-testid="router-view" />',
};

function createAuthProfile(role: WorkspaceRole = WorkspaceRoles.Admin): UserResponse {
  return {
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Admin User",
    email: "admin@example.com",
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    role,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

vi.mock("@/services/admin-settings-client", () => ({
  getAdminSettingsClient: () => ({
    getWorkspace: testMocks.getWorkspace,
  }),
}));

vi.mock("@/composables/feedback/useToasts", () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
    infoToast: vi.fn(),
  }),
}));

vi.mock("@/services/external-navigation", () => ({
  navigateToExternalHref: vi.fn(),
}));

function createRuntimeMock(
  overrides?: Partial<AuthRuntime>,
  role: WorkspaceRole = WorkspaceRoles.Admin,
): AuthRuntime {
  const currentUser = createAuthProfile(role);
  const workspaceMemberships: CurrentUserWorkspaceMembershipListResponse = {
    items: [
      {
        isCurrent: true,
        role,
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        workspaceName: "Workspace Alpha",
      },
      {
        isCurrent: false,
        role: "member",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
        workspaceName: "Workspace Beta",
      },
    ],
  };

  return {
    getCurrentUser: async () => currentUser,
    listCurrentUserWorkspaces: async () => workspaceMemberships,
    loginWithFirebaseToken: async () => ({
      accessToken: "access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token-next",
    }),
    logoutSession: async () => undefined,
    registerWorkspaceOwner: async () => ({
      accessToken: "registered-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "registered-refresh-token",
    }),
    refreshSession: async () => ({
      accessToken: "restored-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "restored-refresh-token",
    }),
    switchWorkspace: async () => ({
      accessToken: "switched-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "switched-refresh-token",
    }),
    signInWithEmailPassword: async () => "firebase-email-token",
    signInWithGoogle: async () => "firebase-google-token",
    signOutIdentityProvider: async () => undefined,
    updateCurrentUser: async (_accessToken, input) => ({
      ...currentUser,
      ...input,
    }),
    ...overrides,
  };
}

const WorkspaceHeaderStub = {
  props: [
    "counterpartHref",
    "counterpartLabel",
    "displayName",
    "pageName",
    "productName",
    "profileContextLabel",
    "settingsIcon",
    "settingsLabel",
    "showSettings",
    "showDisplayName",
    "settingsTo",
    "switchingWorkspaceId",
    "userInitials",
    "workspaceMemberships",
    "workspaceName",
  ],
  emits: ["signOut", "switchWorkspace"],
  template: `
    <header>
      <span data-testid="workspace-header-product-name">{{ productName }}</span>
      <span data-testid="workspace-header-page-name">{{ pageName }}</span>
      <span data-testid="workspace-header-profile-context">{{ profileContextLabel }}</span>
      <span data-testid="workspace-header-memberships">{{ workspaceMemberships?.length ?? 0 }}</span>
      <span v-if="showDisplayName" data-testid="workspace-header-display-name">{{ displayName }}</span>
      <span v-if="settingsIcon" data-testid="profile-menu-icon">custom icon</span>
      <RouterLink v-if="showSettings" data-testid="profile-menu-settings" :to="settingsTo">{{ settingsLabel }}</RouterLink>
      <button type="button" data-testid="profile-menu-switch-workspace" @click="$emit('switchWorkspace', '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002')">Switch workspace</button>
      <button type="button" data-testid="profile-menu-sign-out" @click="$emit('signOut')">Sign out</button>
    </header>
  `,
};

function setAuthenticatedShellUser(
  pinia: ReturnType<typeof createPinia>,
  role: WorkspaceRole = WorkspaceRoles.Admin,
): ReturnType<typeof useAuthStore> {
  const authStore = useAuthStore(pinia);
  authStore.accessToken = `${role}-access-token`;
  authStore.bootstrapComplete = true;
  authStore.profile = {
    avatarUrl: null,
    createdAt: "2026-05-01T10:00:00.000Z",
    displayName: "Admin User",
    email: `${role}@example.com`,
    id: "11111111-1111-4111-8111-111111111111",
    role,
    updatedAt: "2026-05-01T10:00:00.000Z",
  };

  return authStore;
}

describe("AdminAppShell", () => {
  beforeEach(() => {
    clearRefreshToken();
    resetAuthRuntimeForTesting();
    testMocks.errorToast.mockReset();
    testMocks.getWorkspace.mockReset();
    vi.mocked(navigateToExternalHref).mockReset();
    testMocks.getWorkspace.mockResolvedValue({
      createdAt: "2026-05-01T10:00:00.000Z",
      id: "11111111-1111-4111-8111-111111111111",
      name: "GiTiempo Studio",
      updatedAt: "2026-05-01T10:00:00.000Z",
    });
    vi.stubEnv("VITE_USER_APP_URL", "https://user.example.test/login");
    setAuthRuntimeForTesting(createRuntimeMock());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("preserves the profile menu and shared navigation", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = setAuthenticatedShellUser(pinia);
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
        plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          RouterView: RouterViewStub,
          WorkspaceHeader: WorkspaceHeaderStub,
        },
      },
    });
    const settingsLinks = wrapper.findAll('a[href="/settings"]');
    const settingsLink = wrapper.get('[data-testid="profile-menu-settings"]');

    expect(wrapper.find('[data-testid="profile-menu-icon"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="workspace-header-product-name"]').text()).toBe(
      "GiTiempo Admin",
    );
    expect(wrapper.get('[data-testid="workspace-header-page-name"]').text()).toBe(
      "Dashboard",
    );
    expect(wrapper.find('[data-testid="workspace-header-display-name"]').exists()).toBe(
      false,
    );
    expect(wrapper.text()).not.toContain("Admin User");
    expect(settingsLink.text()).toBe("Settings");
    expect(settingsLink.attributes("href")).toBe("/settings");
    expect(wrapper.find('[data-testid="workspace-header-center-row"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="top-bar-timer"]').exists()).toBe(false);
    expect(wrapper.findAll('a[aria-label="Reports"]')).toHaveLength(2);
    expect(wrapper.findAll('a[aria-label="Invoices"]')).toHaveLength(0);
    expect(wrapper.findAll('a[aria-label="Members"]')).toHaveLength(2);
    expect(wrapper.findAll('a[aria-label="Projects"]')).toHaveLength(2);
    expect(wrapper.findAll('a[aria-label="Settings"]')).toHaveLength(0);
    expect(settingsLinks).toHaveLength(1);

    await wrapper.get('[data-testid="profile-menu-sign-out"]').trigger("click");
    await flushPromises();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.name).toBe(routeNames.login);

    await flushPromises();

    expect(testMocks.getWorkspace).toHaveBeenCalledWith();
    expect(wrapper.text()).toContain("GiTiempo Studio");
    expect(wrapper.get('[data-testid="workspace-header-profile-context"]').text()).toBe(
      "GiTiempo Studio",
    );
    expect(wrapper.get('[data-testid="workspace-header-memberships"]').text()).toBe("2");
  });

  it("filters product navigation for project managers", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setAuthenticatedShellUser(pinia, WorkspaceRoles.PM);

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });
    await router.push("/reports");
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
        stubs: {
          RouterView: RouterViewStub,
          WorkspaceHeader: WorkspaceHeaderStub,
        },
      },
    });

    expect(wrapper.findAll('a[aria-label="Dashboard"]')).toHaveLength(2);
    expect(wrapper.findAll('a[aria-label="Reports"]')).toHaveLength(2);
    expect(wrapper.findAll('a[aria-label="Invoices"]')).toHaveLength(0);
    expect(wrapper.findAll('a[aria-label="Members"]')).toHaveLength(0);
    expect(wrapper.findAll('a[aria-label="Projects"]')).toHaveLength(0);
  });

  it("keeps the fallback workspace label and shows toast feedback when shell workspace load fails", async () => {
    testMocks.getWorkspace.mockRejectedValueOnce(new Error("Workspace unavailable"));
    const pinia = createPinia();
    setActivePinia(pinia);
    setAuthenticatedShellUser(pinia);

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

    expect(wrapper.text()).toContain("Workspace Alpha");
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      "Workspace unavailable",
      expect.objectContaining({
        logContext: { action: "load-workspace-context", feature: "admin-shell" },
      }),
    );
  });

  it("filters shell navigation and settings for PM users", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore(pinia);
    authStore.accessToken = "pm-access-token";
    authStore.bootstrapComplete = true;
    authStore.profile = createAuthProfile(WorkspaceRoles.PM);

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

    expect(wrapper.findAll('a[aria-label="Dashboard"]')).toHaveLength(2);
    expect(wrapper.findAll('a[aria-label="Reports"]')).toHaveLength(2);
    expect(wrapper.findAll('a[aria-label="Invoices"]')).toHaveLength(0);
    expect(wrapper.findAll('a[aria-label="Members"]')).toHaveLength(0);
    expect(wrapper.findAll('a[aria-label="Projects"]')).toHaveLength(0);
    expect(wrapper.find('[data-testid="profile-menu-settings"]').exists()).toBe(false);
    expect(wrapper.findAll('a[href="/settings"]')).toHaveLength(0);
  });

  it("keeps Projects active for admins on the add-project route", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore(pinia);
    authStore.accessToken = "admin-access-token";
    authStore.bootstrapComplete = true;
    authStore.profile = createAuthProfile();

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });
    await router.push("/projects/new");
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

    expect(wrapper.findAll('a[aria-label="Projects"][aria-current="page"]')).toHaveLength(2);
  });

  it("returns to the admin dashboard after switching to another admin-accessible workspace", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = setAuthenticatedShellUser(pinia, WorkspaceRoles.Admin);
    const switchWorkspaceSpy = vi
      .spyOn(authStore, "switchWorkspace")
      .mockImplementation(async () => {
        authStore.profile = createAuthProfile(WorkspaceRoles.PM);
        return {
          profileReloaded: true,
          profileReloadError: null,
          membershipsReloaded: true,
          reloadError: null,
        };
      });

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });
    await router.push("/403");
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

    await wrapper.get('[data-testid="profile-menu-switch-workspace"]').trigger("click");
    await flushPromises();

    expect(switchWorkspaceSpy).toHaveBeenCalledWith(
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
    );
    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
    expect(vi.mocked(navigateToExternalHref)).not.toHaveBeenCalled();
  });

  it("redirects to user-web after switching to a workspace without admin access", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = setAuthenticatedShellUser(pinia, WorkspaceRoles.Admin);
    vi.spyOn(authStore, "switchWorkspace").mockImplementation(async () => {
      authStore.profile = createAuthProfile(WorkspaceRoles.Member);
      return {
        profileReloaded: true,
        profileReloadError: null,
        membershipsReloaded: true,
        reloadError: null,
      };
    });

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });
    await router.push("/403");
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

    await wrapper.get('[data-testid="profile-menu-switch-workspace"]').trigger("click");
    await flushPromises();

    expect(vi.mocked(navigateToExternalHref)).toHaveBeenCalledWith(
      "https://user.example.test/",
    );
  });
});
