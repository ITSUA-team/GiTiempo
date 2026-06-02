// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "vue";
import { createMemoryHistory } from "vue-router";
import {
  WorkspaceRoles,
  type UserResponse,
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
  options: { errorHandler?: AppConfig["errorHandler"] } = {},
) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const authStore = useAuthStore(pinia);
  authStore.accessToken = `${role}-access-token`;
  authStore.bootstrapComplete = true;
  authStore.profile = createAuthProfile(role);
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
        config: {
          errorHandler: options.errorHandler,
        },
        plugins: [pinia, router],
        stubs: {
          RouteErrorPanel: RouteErrorPanelStub,
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

  it("switches member users to the user workspace instead of showing a dashboard recovery", async () => {
    const { wrapper } = await mountForbiddenView(WorkspaceRoles.Member);

    expect(wrapper.get('[data-testid="primary-action"]').text()).toBe(
      "Switch workspace",
    );
    expect(wrapper.find('[data-testid="secondary-action"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Back to dashboard");
    expect(wrapper.get('[data-testid="copy"]').text()).not.toContain("dashboard");
  });

  it("switches member users to the configured user workspace URL", async () => {
    const { wrapper } = await mountForbiddenView(WorkspaceRoles.Member);

    await wrapper.get('[data-testid="primary-action"]').trigger("click");

    expect(testMocks.navigateToExternalHref).toHaveBeenCalledOnce();
    expect(testMocks.navigateToExternalHref).toHaveBeenCalledWith(
      "https://user.example.test/login",
    );
  });

  it("fails fast instead of falling back to the admin origin when the user workspace URL is missing", async () => {
    vi.stubEnv("VITE_USER_APP_URL", "");
    const errorHandler = vi.fn();
    const { wrapper } = await mountForbiddenView(WorkspaceRoles.Member, {
      errorHandler,
    });

    await wrapper.get('[data-testid="primary-action"]').trigger("click");

    const handledError = errorHandler.mock.calls[0]?.[0];

    expect(handledError).toBeInstanceOf(Error);
    expect((handledError as Error).message).toBe(
      "VITE_USER_APP_URL is required for admin /403 workspace recovery.",
    );
    expect(testMocks.navigateToExternalHref).not.toHaveBeenCalled();
  });

  it.each([WorkspaceRoles.Admin, WorkspaceRoles.PM])(
    "allows %s users to return to the admin dashboard",
    async (role) => {
      const { router, wrapper } = await mountForbiddenView(role);

      expect(wrapper.get('[data-testid="primary-action"]').text()).toBe(
        "Back to dashboard",
      );
      expect(wrapper.get('[data-testid="secondary-action"]').text()).toBe(
        "Switch workspace",
      );
      expect(wrapper.get('[data-testid="copy"]').text()).toContain("dashboard");

      const routeReady = waitForRoute(
        router,
        () => router.currentRoute.value.name === routeNames.dashboard,
      );

      await wrapper.get('[data-testid="primary-action"]').trigger("click");
      await routeReady;

      expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
    },
  );
});
