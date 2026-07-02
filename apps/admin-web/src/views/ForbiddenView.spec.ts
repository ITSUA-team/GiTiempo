// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory } from "vue-router";
import {
  WorkspaceRoles,
  type UserResponse,
  type CurrentUserWorkspaceMembershipResponse,
  type WorkspaceRole,
} from "@gitiempo/shared";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import { waitForRoute } from "@gitiempo/web-shared/testing";
import { createAppRouter, routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const testMocks = vi.hoisted(() => ({
  navigateToExternalHref: vi.fn(),
}));

vi.mock("@/services/external-navigation", () => ({
  navigateToExternalHref: testMocks.navigateToExternalHref,
}));

vi.mock("@/composables/feedback/useToasts", () => ({
  useToasts: () => ({
    errorToast: vi.fn(),
    infoToast: vi.fn(),
  }),
}));

const RouteErrorPanelStub = {
  name: "RouteErrorPanel",
  props: [
    "copy",
    "eyebrow",
    "iconGlyph",
    "primaryActionLabel",
    "secondaryActionLabel",
    "title",
  ],
  emits: ["primaryAction", "secondaryAction"],
  template: `
    <section>
      <p data-testid="copy">{{ copy }}</p>
      <button data-testid="primary-action" type="button" @click="$emit('primaryAction')">
        {{ primaryActionLabel }}
      </button>
      <button
        v-if="secondaryActionLabel"
        data-testid="secondary-action"
        type="button"
        @click="$emit('secondaryAction')"
      >
        {{ secondaryActionLabel }}
      </button>
    </section>
  `,
};

const WorkspaceSwitchDialogStub = {
  name: "WorkspaceSwitchDialog",
  props: ["visible", "workspaceMemberships", "switchingWorkspaceId"],
  emits: ["switchWorkspace", "update:visible"],
  template: `
    <section v-if="visible" data-testid="workspace-switch-dialog">
      <button
        v-for="membership in workspaceMemberships"
        :key="membership.workspaceId"
        :data-testid="'workspace-switch-dialog-option-' + membership.workspaceId"
        type="button"
        @click="$emit('switchWorkspace', membership.workspaceId)"
      >
        {{ membership.workspaceName }}
      </button>
    </section>
  `,
};

function createAuthProfile(role: WorkspaceRole): UserResponse {
  return {
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Admin User",
    email: `${role}@example.com`,
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    role,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

async function mountForbiddenView(
  role: WorkspaceRole,
  workspaceMemberships: CurrentUserWorkspaceMembershipResponse[] = [],
) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const authStore = useAuthStore(pinia);
  authStore.accessToken = `${role}-access-token`;
  authStore.bootstrapComplete = true;
  authStore.profile = createAuthProfile(role);
  authStore.workspaceMemberships = workspaceMemberships;
  const router = createAppRouter({
    history: createMemoryHistory(),
    pinia,
  });
  await router.push("/403");
  await router.isReady();
  const ForbiddenView = (await import("./ForbiddenView.vue")).default;

  return {
    router,
    wrapper: mount(ForbiddenView, {
      global: {
        plugins: [pinia, router],
        stubs: {
          RouteErrorPanel: RouteErrorPanelStub,
          WorkspaceSwitchDialog: WorkspaceSwitchDialogStub,
        },
      },
    }),
  };
}

describe("ForbiddenView", () => {
  beforeEach(() => {
    clearRefreshToken();
    testMocks.navigateToExternalHref.mockReset();
    vi.stubEnv("VITE_USER_APP_URL", "https://user.example.test/login");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("always keeps dashboard recovery as the primary action", async () => {
    const { wrapper } = await mountForbiddenView(WorkspaceRoles.Member);

    expect(wrapper.get('[data-testid="primary-action"]').text()).toBe(
      "Back to dashboard",
    );
    expect(wrapper.find('[data-testid="secondary-action"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="copy"]').text()).toContain("dashboard");
  });

  it("shows the switch action only when another workspace membership is available", async () => {
    const { wrapper } = await mountForbiddenView(WorkspaceRoles.Admin, [
      {
        isCurrent: true,
        role: "admin",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        workspaceName: "Workspace Alpha",
      },
      {
        isCurrent: false,
        role: "member",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
        workspaceName: "Workspace Beta",
      },
    ]);

    expect(wrapper.get('[data-testid="secondary-action"]').text()).toBe(
      "Switch workspace",
    );
  });

  it("opens the workspace switcher and returns to the dashboard for admin-accessible workspaces", async () => {
    const { router, wrapper } = await mountForbiddenView(WorkspaceRoles.Admin, [
      {
        isCurrent: true,
        role: "admin",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        workspaceName: "Workspace Alpha",
      },
      {
        isCurrent: false,
        role: "pm",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
        workspaceName: "Workspace Beta",
      },
    ]);
    const authStore = useAuthStore();
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

    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.dashboard,
    );

    await wrapper.get('[data-testid="secondary-action"]').trigger("click");
    expect(wrapper.find('[data-testid="workspace-switch-dialog"]').exists()).toBe(true);

    await wrapper
      .get('[data-testid="workspace-switch-dialog-option-018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002"]')
      .trigger("click");
    await routeReady;

    expect(switchWorkspaceSpy).toHaveBeenCalledWith(
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
    );
    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
    expect(testMocks.navigateToExternalHref).not.toHaveBeenCalled();
  });

  it("redirects to user-web after switching to a non-admin workspace", async () => {
    const { wrapper } = await mountForbiddenView(WorkspaceRoles.Admin, [
      {
        isCurrent: true,
        role: "admin",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        workspaceName: "Workspace Alpha",
      },
      {
        isCurrent: false,
        role: "member",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
        workspaceName: "Workspace Beta",
      },
    ]);
    const authStore = useAuthStore();
    vi.spyOn(authStore, "switchWorkspace").mockImplementation(async () => {
      authStore.profile = createAuthProfile(WorkspaceRoles.Member);
      return {
        profileReloaded: true,
        profileReloadError: null,
        membershipsReloaded: true,
        reloadError: null,
      };
    });

    await wrapper.get('[data-testid="secondary-action"]').trigger("click");
    await wrapper
      .get('[data-testid="workspace-switch-dialog-option-018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002"]')
      .trigger("click");

    expect(testMocks.navigateToExternalHref).toHaveBeenCalledWith(
      "https://user.example.test/",
    );
  });

  it("routes the primary action back to the dashboard", async () => {
    const { router, wrapper } = await mountForbiddenView(WorkspaceRoles.Admin);
    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.dashboard,
    );

    await wrapper.get('[data-testid="primary-action"]').trigger("click");
    await routeReady;

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });
});
