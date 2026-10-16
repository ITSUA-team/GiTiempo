// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory } from "vue-router";
import type { UserResponse } from "@gitiempo/shared";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import App from "./App.vue";
import { createAppRouter, routeNames } from "@/router";
import { resetAuthRuntimeForTesting } from "@/services/auth-runtime";
import { useAuthStore } from "@/stores/auth";

const toastMocks = vi.hoisted(() => ({ errorToast: vi.fn() }));

vi.mock("@/composables/feedback/useToasts", () => ({
  useToasts: () => toastMocks,
}));

const ToastHostStub = {
  props: ["position", "pt"],
  template:
    '<div data-testid="toast-host" :data-position="position" :data-root-class="pt && pt.root" />',
};

const ConfirmDialogHostStub = {
  template: '<div data-testid="confirm-dialog-host" />',
};

const AuthIntroPanelStub = {
  template: '<section data-testid="auth-intro-panel" />',
};

const AuthSignInFormStub = {
  props: ["title"],
  template: '<form data-testid="auth-sign-in-form">{{ title }}</form>',
};

function createProfile(role: UserResponse["role"]): UserResponse {
  return {
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Admin User",
    email: "admin@example.com",
    id: "admin-user-id",
    role,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

async function mountAppAt(
  path: string,
  setupAuth?: (authStore: ReturnType<typeof useAuthStore>) => void,
) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const authStore = useAuthStore(pinia);
  setupAuth?.(authStore);
  const router = createAppRouter({
    history: createMemoryHistory(),
    pinia,
  });

  await router.push(path);
  await router.isReady();

  const wrapper = mount(App, {
    global: {
      plugins: [pinia, router],
      stubs: {
        AdminAppShell: {
          template: "<RouterView />",
        },
        AuthIntroPanel: AuthIntroPanelStub,
        AuthSignInForm: AuthSignInFormStub,
        ConfirmDialog: ConfirmDialogHostStub,
        ForbiddenView: {
          template: '<div data-testid="forbidden-view" />',
        },
        ReportsView: {
          template: '<div data-testid="reports-view" />',
        },
        Toast: ToastHostStub,
      },
    },
  });

  await flushPromises();

  return { authStore, router, wrapper };
}

describe("admin App", () => {
  beforeEach(() => {
    clearRefreshToken();
    resetAuthRuntimeForTesting();
    vi.stubEnv("VITE_USER_APP_URL", "https://user.example.test/login");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    toastMocks.errorToast.mockReset();
  });

  it("renders one root overlay host pair around the login route", async () => {
    const { router, wrapper } = await mountAppAt("/login");

    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(wrapper.find('[data-testid="auth-sign-in-form"]').text()).toBe(
      "Admin sign in",
    );
    expect(wrapper.findAll('[data-testid="toast-host"]')).toHaveLength(1);
    expect(wrapper.find('[data-testid="toast-host"]').attributes()).toMatchObject({
      "data-position": "top-right",
      "data-root-class": "w-80",
    });
    expect(wrapper.findAll('[data-testid="confirm-dialog-host"]')).toHaveLength(1);
    wrapper.unmount();
  });

  it("refreshes authorization on focus and redirects a demoted active report route", async () => {
    const { authStore, router, wrapper } = await mountAppAt(
      "/reports",
      (store) => {
        store.accessToken = "admin-access-token";
        store.bootstrapComplete = true;
        store.profile = createProfile("admin");
      },
    );
    const refreshAuthorizationContext = vi
      .spyOn(authStore, "refreshAuthorizationContext")
      .mockImplementation(async () => {
        authStore.profile = createProfile("member");
        return true;
      });

    window.dispatchEvent(new Event("focus"));
    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe(routeNames.forbidden);
    });

    expect(refreshAuthorizationContext).toHaveBeenCalledOnce();

    wrapper.unmount();
    window.dispatchEvent(new Event("focus"));

    expect(refreshAuthorizationContext).toHaveBeenCalledOnce();
  });

  it("keeps the protected route after a failed focus refresh and recovers on retry", async () => {
    const { authStore, router, wrapper } = await mountAppAt("/reports", (store) => {
      store.accessToken = "admin-access-token";
      store.bootstrapComplete = true;
      store.profile = createProfile("admin");
    });
    const replace = vi.spyOn(router, "replace");
    const refreshAuthorizationContext = vi
      .spyOn(authStore, "refreshAuthorizationContext")
      .mockImplementationOnce(async () => {
        authStore.profile = null;
        return true;
      })
      .mockImplementationOnce(async () => {
        authStore.profile = createProfile("admin");
        return true;
      });

    try {
      window.dispatchEvent(new Event("focus"));
      await vi.waitFor(() => expect(toastMocks.errorToast).toHaveBeenCalledOnce());

      expect(toastMocks.errorToast).toHaveBeenCalledWith(
        "Could not refresh your access. Please try again.",
        expect.any(Object),
      );
      expect(replace).not.toHaveBeenCalled();
      expect(router.currentRoute.value.path).toBe("/reports");

      window.dispatchEvent(new Event("focus"));
      await vi.waitFor(() => {
        expect(refreshAuthorizationContext).toHaveBeenCalledTimes(2);
        expect(authStore.profile?.role).toBe("admin");
      });

      expect(replace).not.toHaveBeenCalled();
      expect(router.currentRoute.value.path).toBe("/reports");
      expect(toastMocks.errorToast).toHaveBeenCalledOnce();
    } finally {
      wrapper.unmount();
    }
  });

  it("leaves the protected route when focus refresh expires the session", async () => {
    const { authStore, router, wrapper } = await mountAppAt("/reports", (store) => {
      store.accessToken = "admin-access-token";
      store.bootstrapComplete = true;
      store.profile = createProfile("admin");
    });
    vi.spyOn(authStore, "refreshAuthorizationContext").mockImplementation(async () => {
      authStore.accessToken = null;
      authStore.profile = null;
      return false;
    });

    window.dispatchEvent(new Event("focus"));
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(routeNames.login));

    expect(toastMocks.errorToast).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
