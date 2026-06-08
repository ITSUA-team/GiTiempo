// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory } from "vue-router";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import App from "./App.vue";
import { createAppRouter, routeNames } from "@/router";
import { resetAuthRuntimeForTesting } from "@/services/auth-runtime";

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

async function mountAppAt(path: string) {
  const pinia = createPinia();
  setActivePinia(pinia);
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
        AuthIntroPanel: AuthIntroPanelStub,
        AuthSignInForm: AuthSignInFormStub,
        ConfirmDialog: ConfirmDialogHostStub,
        Toast: ToastHostStub,
      },
    },
  });

  await flushPromises();

  return { router, wrapper };
}

describe("user App", () => {
  beforeEach(() => {
    clearRefreshToken();
    resetAuthRuntimeForTesting();
    vi.stubEnv("VITE_ADMIN_APP_URL", "https://admin.example.test/login");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders one root overlay host pair around routed content", async () => {
    const { router, wrapper } = await mountAppAt("/login");

    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(wrapper.find('[data-testid="auth-sign-in-form"]').text()).toBe("Sign in");
    expect(wrapper.findAll('[data-testid="toast-host"]')).toHaveLength(1);
    expect(wrapper.find('[data-testid="toast-host"]').attributes()).toMatchObject({
      "data-position": "top-right",
      "data-root-class": "w-80",
    });
    expect(wrapper.findAll('[data-testid="confirm-dialog-host"]')).toHaveLength(1);
  });
});
