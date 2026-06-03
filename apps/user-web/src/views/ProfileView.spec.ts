import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import { computed, ref, shallowRef } from "vue";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type * as VueRouterModule from "vue-router";
import type {
  GitHubConnectionStatusResponse,
  UpdateUserInput,
  UserResponse,
} from "@gitiempo/shared";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import {
  resetAuthRuntimeForTesting,
  setAuthRuntimeForTesting,
  type AuthRuntime,
} from "@/services/auth-runtime";
import { useAuthStore } from "@/stores/auth";

const replaceSpy = vi.fn(async () => undefined);
const toastAddSpy = vi.fn();

const githubState = ref<
  "connected" | "connecting" | "disconnected" | "loading" | "request-error"
>("disconnected");
const githubConnection = shallowRef<GitHubConnectionStatusResponse | null>({
  account: null,
  status: "disconnected",
});
const githubRequestErrorMessage = ref<string | null>(null);
const githubIsConnecting = ref(false);
const githubIsDisconnecting = ref(false);
const githubActions = {
  connect: vi.fn(),
  refreshConnectionStatus: vi.fn(async () => undefined),
  requestDisconnect: vi.fn(),
};

vi.mock("vue-router", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof VueRouterModule;

  return {
    ...actual,
    useRouter: () => ({ replace: replaceSpy }),
  };
});

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({ add: toastAddSpy }),
}));

vi.mock("@/composables/profile/useProfileGithubConnection", () => ({
  useProfileGithubConnection: () => ({
    connect: githubActions.connect,
    connection: computed(() => githubConnection.value),
    isConnecting: computed(() => githubIsConnecting.value),
    isDisconnecting: computed(() => githubIsDisconnecting.value),
    refreshConnectionStatus: githubActions.refreshConnectionStatus,
    requestDisconnect: githubActions.requestDisconnect,
    requestErrorMessage: computed(() => githubRequestErrorMessage.value),
    state: computed(() => githubState.value),
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

  return {
    getCurrentUser: async () => currentUser,
    loginWithFirebaseToken: async () => ({
      accessToken: "access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token-next",
    }),
    logoutSession: async () => undefined,
    refreshSession: async () => ({
      accessToken: "restored-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "restored-refresh-token",
    }),
    signInWithEmailPassword: async () => "firebase-email-token",
    signInWithGoogle: async () => "firebase-google-token",
    signOutIdentityProvider: async () => undefined,
    updateCurrentUser: async (_accessToken, input: UpdateUserInput) => ({
      ...currentUser,
      ...input,
      updatedAt: "2026-01-02T00:00:00.000Z",
    }),
    ...overrides,
  };
}

async function mountProfileView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const authStore = useAuthStore();
  authStore.accessToken = "access-token";
  authStore.profile = {
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Alexey Tsukanov",
    email: "alexey@example.com",
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    role: "member",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const ProfileView = (await import("./ProfileView.vue")).default;

  return {
    authStore,
    wrapper: mount(ProfileView, {
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
      },
    }),
  };
}

describe("ProfileView", () => {
  beforeAll(() => {
    vi.stubEnv("TZ", "Europe/Kiev");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    resetAuthRuntimeForTesting();
    setAuthRuntimeForTesting(createRuntimeMock());
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    replaceSpy.mockClear();
    toastAddSpy.mockClear();
    githubActions.connect.mockClear();
    githubActions.refreshConnectionStatus.mockClear();
    githubActions.requestDisconnect.mockClear();
    githubState.value = "connected";
    githubConnection.value = {
      account: {
        avatarUrl: null,
        connectedAt: "2026-05-01T10:15:00.000Z",
        githubUserId: "123456",
        login: "alexeytsukanov",
        updatedAt: "2026-05-04T08:45:00.000Z",
      },
      status: "connected",
    };
    githubIsConnecting.value = false;
    githubIsDisconnecting.value = false;
    githubRequestErrorMessage.value = null;
  });

  it("wires the identity form and GitHub surface without a duplicate sign-out action", async () => {
    const { wrapper } = await mountProfileView();
    const connectedAt = new Date("2026-05-01T10:15:00.000Z");
    const updatedAt = new Date("2026-05-04T08:45:00.000Z");
    const formatDate = (value: Date) =>
      new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(value);
    const formatTime = (value: Date) =>
      value.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        hour12: false,
        minute: "2-digit",
      });

    expect(wrapper.text()).toContain("Profile");
    expect(wrapper.text()).toContain("GitHub Connection");
    expect(wrapper.text()).toContain(`${formatDate(connectedAt)}, ${formatTime(connectedAt)}`);
    expect(wrapper.text()).toContain(`${formatDate(updatedAt)}, ${formatTime(updatedAt)}`);
    expect(wrapper.text()).not.toContain("2026-05-01T10:15:00.000Z");
    expect(wrapper.text()).not.toContain("Avatar");
    expect(wrapper.find('[data-testid="profile-signout"]').exists()).toBe(false);
  });

  it("saves a new display name, updates the rendered identity, and shows a success toast", async () => {
    const { authStore, wrapper } = await mountProfileView();

    await wrapper.get('[data-testid="profile-display-name-input"]').setValue("Alexey Updated");
    await wrapper.get('[data-testid="profile-save"]').trigger("click");
    await flushPromises();

    expect(authStore.profile?.displayName).toBe("Alexey Updated");
    expect(toastAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "success",
        summary: "Profile saved",
      }),
    );
  });

  it("keeps the identity form retryable when saving fails", async () => {
    setAuthRuntimeForTesting(
      createRuntimeMock({
        updateCurrentUser: async () => {
          throw new Error("Display name update failed");
        },
      }),
    );

    const { wrapper } = await mountProfileView();

    await wrapper.get('[data-testid="profile-display-name-input"]').setValue("Alexey Retry");
    await wrapper.get('[data-testid="profile-save"]').trigger("click");
    await flushPromises();

    expect(toastAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Please try again.",
        severity: "error",
        summary: "Could not save profile",
      }),
    );
    expect(console.error).toHaveBeenCalledWith("Could not save profile", {
      context: { action: "save-profile", feature: "profile" },
      error: expect.any(Error),
    });
    expect((wrapper.get('[data-testid="profile-display-name-input"]').element as HTMLInputElement).value).toBe(
      "Alexey Retry",
    );
  });

  it("restores the persisted display name when canceling dirty edits", async () => {
    const { wrapper } = await mountProfileView();

    await wrapper.get('[data-testid="profile-display-name-input"]').setValue("Alexey Dirty");
    await wrapper.get('[data-testid="profile-cancel"]').trigger("click");

    expect((wrapper.get('[data-testid="profile-display-name-input"]').element as HTMLInputElement).value).toBe(
      "Alexey Tsukanov",
    );
  });

  it("keeps dirty display-name edits when the profile refreshes externally", async () => {
    const { authStore, wrapper } = await mountProfileView();

    await wrapper.get('[data-testid="profile-display-name-input"]').setValue("Alexey Draft");
    authStore.profile = {
      ...authStore.profile!,
      displayName: "Alexey Server Refresh",
      updatedAt: "2026-01-03T00:00:00.000Z",
    };
    await flushPromises();

    expect(
      (wrapper.get('[data-testid="profile-display-name-input"]').element as HTMLInputElement).value,
    ).toBe("Alexey Draft");
  });
});
