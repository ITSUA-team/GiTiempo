import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Component } from "vue";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { UpdateUserInput, UserResponse } from "@gitiempo/shared";

import {
  resetAuthRuntimeForTesting,
  setAuthRuntimeForTesting,
  type AuthRuntime,
} from "@/services/auth-runtime";
import { useAuthStore } from "@/stores/auth";

const toastAddSpy = vi.fn();
const mountedWrappers: Array<{ unmount: () => void }> = [];
const useProfileGithubConnectionMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("ProfileView must not own GitHub connection state.");
  }),
);
let ProfileView: Component;

function createUserProfile(): UserResponse {
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

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({ add: toastAddSpy }),
}));

vi.mock("@/composables/profile/useProfileGithubConnection", () => ({
  useProfileGithubConnection: useProfileGithubConnectionMock,
}));

function createRuntimeMock(overrides?: Partial<AuthRuntime>): AuthRuntime {
  const currentUser = createUserProfile();

  return {
    getCurrentUser: async () => currentUser,
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

async function mountProfileView(options: { profile?: UserResponse | null } = {}) {
  const pinia = createPinia();

  setActivePinia(pinia);

  const authStore = useAuthStore();
  authStore.accessToken = "access-token";
  authStore.profile = "profile" in options
    ? options.profile ?? null
    : createUserProfile();

  const wrapper = mount(ProfileView, {
    global: {
      plugins: [pinia],
      stubs: {
        Avatar: {
          props: ["label"],
          template: '<div data-testid="profile-avatar">{{ label }}</div>',
        },
        Button: {
          props: ["disabled", "label", "loading"],
          emits: ["click"],
          template:
            '<button type="button" :disabled="disabled || loading" @click="$emit(\'click\')">{{ label }}</button>',
        },
        InputText: {
          props: ["disabled", "inputId", "invalid", "modelValue"],
          emits: ["update:modelValue"],
          template: `
            <input
              :id="inputId"
              :disabled="disabled"
              :value="modelValue"
              @input="$emit('update:modelValue', $event.target.value)"
            />
          `,
        },
        ProfileGithubConnectionCard: {
          template: '<section data-testid="profile-github-section">GitHub Connection</section>',
        },
        Skeleton: { template: '<div data-testid="profile-skeleton" />' },
        SurfaceCard: { template: "<section><slot /></section>" },
      },
    },
  });

  mountedWrappers.push(wrapper);

  return {
    authStore,
    wrapper,
  };
}

describe("ProfileView", () => {
  beforeAll(async () => {
    vi.stubEnv("TZ", "Europe/Kiev");
    ProfileView = (await import("./ProfileView.vue")).default;
  }, 20_000);

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    resetAuthRuntimeForTesting();
    setAuthRuntimeForTesting(createRuntimeMock());
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    toastAddSpy.mockClear();
    useProfileGithubConnectionMock.mockClear();
  });

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount();
    }
  });

  it("renders full profile skeletons while the profile prerequisite loads", async () => {
    const { wrapper } = await mountProfileView({ profile: null });

    expect(wrapper.find('[data-testid="profile-loading"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="profile-form-loading"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="profile-github-loading"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="profile-display-name-input"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="profile-email-input"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="profile-github-section"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Alexey Tsukanov");
    expect(wrapper.text()).not.toContain("GitHub Connection");
    expect(useProfileGithubConnectionMock).not.toHaveBeenCalled();
  });

  it("keeps page rendering independent from GitHub section state", async () => {
    const { wrapper } = await mountProfileView();

    expect(wrapper.find('[data-testid="profile-loading"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="profile-display-name-input"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="profile-email-input"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="profile-github-section"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Alexey Tsukanov");
    expect(wrapper.text()).toContain("GitHub Connection");
    expect(useProfileGithubConnectionMock).not.toHaveBeenCalled();
  });

  it("wires the identity form without a duplicate sign-out action", async () => {
    const { wrapper } = await mountProfileView();
    const text = wrapper.text();

    expect(text).not.toContain("Manage your personal settings and session access.");
    expect(text).toContain("GitHub Connection");
    expect(text).not.toContain("Avatar");
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
