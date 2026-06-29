import { mount } from "@vue/test-utils";
import { computed, ref, shallowRef } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GitHubConnectionStatusResponse } from "@gitiempo/shared";

import ProfileGithubConnectionCard from "./ProfileGithubConnectionCard.vue";

const githubState = ref<
  "connected" | "connecting" | "disconnected" | "loading" | "request-error"
>("connected");
const githubConnection = shallowRef<GitHubConnectionStatusResponse | null>(null);
const githubRequestErrorMessage = ref<string | null>(null);
const githubIsConnecting = ref(false);
const githubIsDisconnecting = ref(false);
const githubActions = {
  connect: vi.fn(),
  refreshConnectionStatus: vi.fn(async () => undefined),
  requestDisconnect: vi.fn(),
};

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

function mountCard() {
  return mount(ProfileGithubConnectionCard, {
    global: {
      stubs: {
        Avatar: {
          props: ["image"],
          template: '<div data-testid="github-avatar">{{ image }}</div>',
        },
        Button: {
          props: ["disabled", "label", "loading"],
          emits: ["click"],
          template:
            '<button :data-loading="String(loading === true || loading === \'\')" :disabled="disabled || loading" type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Skeleton: { template: '<div data-testid="github-skeleton" />' },
        SurfaceCard: { template: "<section><slot /></section>" },
        Tag: {
          props: ["value"],
          template: '<span data-testid="github-status">{{ value }}</span>',
        },
      },
    },
  });
}

describe("ProfileGithubConnectionCard", () => {
  beforeEach(() => {
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
    githubRequestErrorMessage.value = null;
    githubIsConnecting.value = false;
    githubIsDisconnecting.value = false;
    githubActions.connect.mockClear();
    githubActions.refreshConnectionStatus.mockClear();
    githubActions.requestDisconnect.mockClear();
  });

  it("renders the connected API contract fields", () => {
    const wrapper = mountCard();

    expect(wrapper.text()).toContain("Connected");
    expect(wrapper.text()).toContain("GitHub user ID");
    expect(wrapper.text()).toContain("123456");
    expect(wrapper.text()).toContain("Login");
    expect(wrapper.text()).toContain("alexeytsukanov");
    expect(wrapper.text()).toContain("Connected at");
    expect(wrapper.text()).toContain("May 1, 2026");
    expect(wrapper.text()).toContain("Updated at");
    expect(wrapper.text()).toContain("May 4, 2026");
    expect(wrapper.find('[data-testid="github-avatar"]').exists()).toBe(false);
  });

  it("keeps GitHub loading state scoped to the card", () => {
    githubState.value = "loading";
    githubConnection.value = null;

    const wrapper = mountCard();

    expect(wrapper.findAll('[data-testid="github-skeleton"]')).toHaveLength(4);
    expect(wrapper.text()).not.toContain("Connect GitHub");
  });

  it("routes card actions through the GitHub connection composable", async () => {
    const wrapper = mountCard();

    await wrapper.get("button:nth-of-type(1)").trigger("click");
    await wrapper.get("button:nth-of-type(2)").trigger("click");

    expect(githubActions.connect).toHaveBeenCalledTimes(1);
    expect(githubActions.requestDisconnect).toHaveBeenCalledTimes(1);
  });

  it("renders request errors with retry and connect actions", async () => {
    githubState.value = "request-error";
    githubConnection.value = null;
    githubRequestErrorMessage.value = "GitHub unavailable";

    const wrapper = mountCard();

    expect(wrapper.text()).toContain("Error");
    expect(wrapper.text()).toContain("GitHub unavailable");
    await wrapper.get("button:nth-of-type(1)").trigger("click");
    await wrapper.get("button:nth-of-type(2)").trigger("click");

    expect(githubActions.refreshConnectionStatus).toHaveBeenCalledTimes(1);
    expect(githubActions.connect).toHaveBeenCalledTimes(1);
  });
});
