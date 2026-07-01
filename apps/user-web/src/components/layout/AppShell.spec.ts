import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import { createMemoryHistory } from "vue-router";
import { defineComponent } from "vue";
import type {
  CurrentUserWorkspaceMembershipListResponse,
  UserResponse,
} from "@gitiempo/shared";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import {
  resetAuthRuntimeForTesting,
  setAuthRuntimeForTesting,
  type AuthRuntime,
} from "@/services/auth-runtime";
import { waitForRoute } from "@gitiempo/web-shared/testing";
import AppShell from "./AppShell.vue";
import { useTopBarTimerDialogController } from "@/composables/timer/useTopBarTimerDialogController";
import { createAppRouter, routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const testMocks = vi.hoisted(() => ({
  getWorkspace: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({
    add: testMocks.toastAdd,
  }),
}));

vi.mock("@/services/workspace-client", () => ({
  getWorkspaceClient: () => ({
    getWorkspace: testMocks.getWorkspace,
  }),
}));

function createRuntimeMock(overrides?: Partial<AuthRuntime>): AuthRuntime {
  const currentUser: UserResponse = {
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Alexey Tsukanov",
    email: "alexey@example.com",
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    role: "member",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const workspaceMemberships: CurrentUserWorkspaceMembershipListResponse = {
    items: [
      {
        isCurrent: true,
        role: "member",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        workspaceName: "Workspace Alpha",
      },
      {
        isCurrent: false,
        role: "admin",
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

describe("AppShell", () => {
  beforeEach(() => {
    clearRefreshToken();
    resetAuthRuntimeForTesting();
    testMocks.getWorkspace.mockReset();
    testMocks.toastAdd.mockReset();
    testMocks.getWorkspace.mockResolvedValue({
      createdAt: "2026-05-01T10:00:00.000Z",
      id: "11111111-1111-4111-8111-111111111111",
      name: "GiTiempo Studio",
      updatedAt: "2026-05-01T10:00:00.000Z",
    });
    vi.stubEnv("VITE_ADMIN_APP_URL", "https://admin.example.test/login");
    setAuthRuntimeForTesting(createRuntimeMock());
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
          RouterView: defineComponent({
            setup() {
              const topBarTimerDialogController = useTopBarTimerDialogController();

              return {
                requestTimerDialog: topBarTimerDialogController.requestOpen,
              };
            },
            template: '<button data-testid="dashboard-overview" type="button" @click="requestTimerDialog">Open timer</button>',
          }),
          TopBarTimer: {
            props: ["openRequestId"],
            template: '<div data-testid="top-bar-timer">{{ openRequestId }}</div>',
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
              "switchingWorkspaceId",
              "userInitials",
              "workspaceMemberships",
              "workspaceName",
            ],
            emits: ["signOut", "switchWorkspace"],
            template: `
              <header>
                <span data-testid="workspace-header-page-name">{{ pageName }}</span>
                <span data-testid="workspace-header-workspace-name">{{ workspaceName }}</span>
                <span data-testid="workspace-header-memberships">{{ workspaceMemberships?.length ?? 0 }}</span>
                <span data-testid="workspace-header-center-align">{{ centerContentAlign }}</span>
                <span data-testid="workspace-header-page-name">{{ pageName }}</span>
                <span data-testid="workspace-header-show-display-name">{{ String(showDisplayName) }}</span>
                <div data-testid="workspace-header-center-row">
                  <slot name="center" />
                </div>
                <span v-if="settingsIcon" data-testid="profile-menu-icon">custom icon</span>
                <RouterLink data-testid="profile-menu-settings" :to="settingsTo">{{ settingsLabel }}</RouterLink>
                <button type="button" data-testid="profile-menu-switch-workspace" @click="$emit('switchWorkspace', '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002')">Switch workspace</button>
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
    expect(wrapper.get('[data-testid="workspace-header-page-name"]').text()).toBe("Dashboard");
    expect(wrapper.get('[data-testid="workspace-header-show-display-name"]').text()).toBe("false");
    expect(wrapper.find('[data-testid="dashboard-overview"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="workspace-header-center-row"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="top-bar-timer"]')).toHaveLength(1);
    expect(wrapper.get('[data-testid="top-bar-timer"]').text()).toBe("0");

    await wrapper.get('[data-testid="dashboard-overview"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="top-bar-timer"]').text()).toBe("1");
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
    expect(testMocks.getWorkspace).toHaveBeenCalledWith();
    expect(wrapper.get('[data-testid="workspace-header-workspace-name"]').text()).toBe(
      "GiTiempo Studio",
    );
    expect(wrapper.get('[data-testid="workspace-header-memberships"]').text()).toBe("2");
  });

  it("returns to the dashboard after switching workspace from the forbidden route", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore(pinia);
    authStore.accessToken = "user-access-token";
    authStore.bootstrapComplete = true;
    authStore.profile = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      role: "member",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const switchWorkspaceSpy = vi
      .spyOn(authStore, "switchWorkspace")
      .mockImplementation(async () => ({
        membershipsReloaded: true,
        reloadError: null,
      }));

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });
    await router.push("/403");
    await router.isReady();

    const wrapper = mount(AppShell, {
      global: {
        plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          RouterView: defineComponent({
            template: '<div data-testid="router-view" />',
          }),
          TopBarTimer: {
            props: ["openRequestId"],
            template: '<div data-testid="top-bar-timer">{{ openRequestId }}</div>',
          },
          WorkspaceHeader: {
            props: ["workspaceMemberships"],
            emits: ["signOut", "switchWorkspace"],
            template:
              '<button type="button" data-testid="profile-menu-switch-workspace" @click="$emit(\'switchWorkspace\', \'018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002\')">Switch workspace</button>',
          },
        },
      },
    });

    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.dashboard,
    );

    await wrapper.get('[data-testid="profile-menu-switch-workspace"]').trigger("click");
    await routeReady;

    expect(switchWorkspaceSpy).toHaveBeenCalledWith(
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
    );
    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });
});
