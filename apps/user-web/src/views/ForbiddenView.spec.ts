// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory } from "vue-router";
import {
  type CurrentUserWorkspaceMembershipResponse,
  type UserResponse,
} from "@gitiempo/shared";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import { waitForRoute } from "@gitiempo/web-shared/testing";
import { createAppRouter, routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({
    add: vi.fn(),
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

function createAuthProfile(): UserResponse {
  return {
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Alexey Tsukanov",
    email: "alexey@example.com",
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    role: "member",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

async function mountForbiddenView(
  workspaceMemberships: CurrentUserWorkspaceMembershipResponse[] = [],
) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const authStore = useAuthStore(pinia);
  authStore.accessToken = "member-access-token";
  authStore.bootstrapComplete = true;
  authStore.profile = createAuthProfile();
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
  });

  it("shows the switch action only when another workspace is available", async () => {
    const withoutAlternatives = await mountForbiddenView([
      {
        isCurrent: true,
        role: "member",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        workspaceName: "Workspace Alpha",
      },
    ]);

    expect(withoutAlternatives.wrapper.find('[data-testid="secondary-action"]').exists()).toBe(
      false,
    );

    const withAlternatives = await mountForbiddenView([
      {
        isCurrent: true,
        role: "member",
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

    expect(withAlternatives.wrapper.get('[data-testid="secondary-action"]').text()).toBe(
      "Switch workspace",
    );
  });

  it("routes the primary action back to the dashboard", async () => {
    const { router, wrapper } = await mountForbiddenView();
    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.dashboard,
    );

    await wrapper.get('[data-testid="primary-action"]').trigger("click");
    await routeReady;

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("opens the workspace switcher and switches the selected workspace", async () => {
    const { router, wrapper } = await mountForbiddenView([
      {
        isCurrent: true,
        role: "member",
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
      .mockImplementation(async () => ({
        profileReloaded: true,
        profileReloadError: null,
        membershipsReloaded: true,
        reloadError: null,
      }));
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
  });
});
