// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { LocationQuery } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import type { GitHubConnectionStatusResponse } from "@gitiempo/shared";

import { useProfileGithubConnection } from "./useProfileGithubConnection";
import type { ProfileGitHubClient } from "@/services/profile-github-client";

function createConnectedStatus(avatarUrl: string | null = "https://avatars.example.test/octo.png"): GitHubConnectionStatusResponse {
  return {
    account: {
      avatarUrl,
      connectedAt: "2026-05-01T10:15:00.000Z",
      githubUserId: "123456",
      login: "alexeytsukanov",
      updatedAt: "2026-05-04T08:45:00.000Z",
    },
    status: "connected",
  };
}

function createClientMock(): ProfileGitHubClient & {
  disconnect: ReturnType<typeof vi.fn<ProfileGitHubClient["disconnect"]>>;
  getAuthUrl: ReturnType<typeof vi.fn<ProfileGitHubClient["getAuthUrl"]>>;
  getConnectionStatus: ReturnType<
    typeof vi.fn<ProfileGitHubClient["getConnectionStatus"]>
  >;
} {
  return {
    disconnect: vi.fn<ProfileGitHubClient["disconnect"]>(async () => undefined),
    getAuthUrl: vi.fn<ProfileGitHubClient["getAuthUrl"]>(async () => ({
      authorizationUrl: "https://github.com/login/oauth/authorize",
    })),
    getConnectionStatus: vi.fn<ProfileGitHubClient["getConnectionStatus"]>(
      async () => ({ account: null, status: "disconnected" }),
    ),
  };
}

function mountProfileGithub(options?: {
  client?: ReturnType<typeof createClientMock>;
  query?: LocationQuery;
}) {
  const pinia = createPinia();

  setActivePinia(pinia);

  const client = options?.client ?? createClientMock();
  const confirm = { require: vi.fn() };
  const toast = { add: vi.fn() };
  const locationAssign = vi.fn();
  const route = { query: options?.query ?? {} };
  const router = { replace: vi.fn(async () => undefined) };
  let profileGithub!: ReturnType<typeof useProfileGithubConnection>;

  const Harness = defineComponent({
    setup() {
      profileGithub = useProfileGithubConnection({
        client,
        confirm,
        locationAssign,
        route,
        router,
        toast,
      });

      return () => h("div");
    },
  });

  mount(Harness, {
    global: {
      plugins: [pinia],
    },
  });

  return {
    client,
    confirm,
    locationAssign,
    profileGithub,
    router,
    toast,
  };
}

describe("useProfileGithubConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the loading state before the initial GitHub request settles", () => {
    const client = createClientMock();
    client.getConnectionStatus.mockImplementation(
      () => new Promise<GitHubConnectionStatusResponse>(() => undefined),
    );

    const { profileGithub } = mountProfileGithub({ client });

    expect(profileGithub.state.value).toBe("loading");
  });

  it("settles into the disconnected state after a successful load", async () => {
    const { client, profileGithub } = mountProfileGithub();

    await flushPromises();

    expect(client.getConnectionStatus).toHaveBeenCalledWith();
    expect(profileGithub.state.value).toBe("disconnected");
  });

  it("renders the connected state from the API contract fields", async () => {
    const client = createClientMock();
    client.getConnectionStatus.mockResolvedValueOnce(createConnectedStatus());

    const { profileGithub } = mountProfileGithub({ client });

    await flushPromises();

    expect(profileGithub.state.value).toBe("connected");
    expect(profileGithub.connection.value?.status).toBe("connected");
  });

  it("keeps request failures distinct from disconnected and shows an error toast", async () => {
    const client = createClientMock();
    client.getConnectionStatus.mockRejectedValueOnce(
      new Error("GitHub connection could not be loaded"),
    );

    const { profileGithub, toast } = mountProfileGithub({ client });

    await flushPromises();

    expect(profileGithub.state.value).toBe("request-error");
    expect(profileGithub.requestErrorMessage.value).toBe(
      "GitHub connection could not be loaded",
    );
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Refresh and try again.",
        severity: "error",
        summary: "Could not load GitHub connection",
      }),
    );
    expect(console.error).toHaveBeenCalledWith("Could not load GitHub connection", {
      context: { action: "load-connection", feature: "profile-github" },
      error: expect.any(Error),
    });
  });

  it("handles a success callback toast, cleans the URL, and can still fall back to request-error", async () => {
    const client = createClientMock();
    client.getConnectionStatus.mockRejectedValueOnce(new Error("network down"));

    const { profileGithub, router, toast } = mountProfileGithub({
      client,
      query: { github: "connected", keep: "1" },
    });

    await flushPromises();

    expect(router.replace).toHaveBeenCalledWith({ query: { keep: "1" } });
    expect(toast.add).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        severity: "success",
        summary: "GitHub connected",
      }),
    );
    expect(profileGithub.state.value).toBe("request-error");
  });

  it("handles callback error toasts and removes handled query params", async () => {
    const { router, toast } = mountProfileGithub({
      query: { code: "invalid_state", github: "error", redirect: "/timer" },
    });

    await flushPromises();

    expect(router.replace).toHaveBeenCalledWith({ query: { redirect: "/timer" } });
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        detail:
          "The GitHub callback could not be validated. Start the connection again.",
        severity: "error",
        summary: "GitHub connection failed",
      }),
    );
  });

  it("falls back to a generic error toast for unknown callback codes", async () => {
    const { router, toast } = mountProfileGithub({
      query: { code: "unexpected_code", github: "error", redirect: "/timer" },
    });

    await flushPromises();

    expect(router.replace).toHaveBeenCalledWith({ query: { redirect: "/timer" } });
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "GitHub could not complete the connection flow.",
        severity: "error",
        summary: "GitHub connection failed",
      }),
    );
  });

  it("requests the GitHub auth URL and navigates away on connect", async () => {
    const { client, locationAssign, profileGithub } = mountProfileGithub();

    await flushPromises();

    const connectPromise = profileGithub.connect();

    expect(profileGithub.state.value).toBe("connecting");
    await connectPromise;

    expect(client.getAuthUrl).toHaveBeenCalledWith();
    expect(locationAssign).toHaveBeenCalledWith(
      "https://github.com/login/oauth/authorize",
    );
  });

  it("returns to a retryable state when connect fails before redirect", async () => {
    const client = createClientMock();
    client.getAuthUrl.mockRejectedValueOnce(new Error("GitHub auth flow failed"));

    const { profileGithub, toast } = mountProfileGithub({ client });

    await flushPromises();
    await profileGithub.connect();

    expect(profileGithub.state.value).toBe("disconnected");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Please try again.",
        severity: "error",
        summary: "Could not start GitHub connection",
      }),
    );
    expect(console.error).toHaveBeenCalledWith("Could not start GitHub connection", {
      context: { action: "start-connection", feature: "profile-github" },
      error: expect.any(Error),
    });
  });

  it("disconnects GitHub after confirmation and refetches the authoritative state", async () => {
    const client = createClientMock();
    client.getConnectionStatus.mockResolvedValueOnce(createConnectedStatus());

    const { confirm, profileGithub, toast } = mountProfileGithub({ client });

    await flushPromises();
    profileGithub.requestDisconnect();

    const confirmOptions = confirm.require.mock.calls[0]?.[0];
    expect(confirmOptions).toBeTruthy();

    await confirmOptions.accept();

    expect(client.disconnect).toHaveBeenCalledWith();
    expect(client.getConnectionStatus).toHaveBeenCalledTimes(2);
    expect(profileGithub.state.value).toBe("disconnected");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "success",
        summary: "GitHub disconnected",
      }),
    );
  });

  it("keeps the previous connected state when disconnect fails", async () => {
    const client = createClientMock();
    client.getConnectionStatus.mockResolvedValueOnce(createConnectedStatus());
    client.disconnect.mockRejectedValueOnce(new Error("Disconnect failed"));

    const { confirm, profileGithub, toast } = mountProfileGithub({ client });

    await flushPromises();
    profileGithub.requestDisconnect();

    const confirmOptions = confirm.require.mock.calls[0]?.[0];
    await confirmOptions.accept();

    expect(profileGithub.state.value).toBe("connected");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Please try again.",
        severity: "error",
        summary: "Could not disconnect GitHub",
      }),
    );
    expect(console.error).toHaveBeenCalledWith("Could not disconnect GitHub", {
      context: { action: "disconnect", feature: "profile-github" },
      error: expect.any(Error),
    });
  });
});
