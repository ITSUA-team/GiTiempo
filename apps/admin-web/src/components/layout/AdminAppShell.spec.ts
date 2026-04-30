import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
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
  });

  it("preserves the visible user workspace link in the authenticated shell", async () => {
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
    const workspaceLink = wrapper.get('a[href="http://localhost:5173"]');

    expect(workspaceLink.text()).toBe("User workspace");
  });
});
