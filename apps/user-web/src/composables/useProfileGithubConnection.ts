import { computed, onMounted, shallowRef } from "vue";
import type {
  LocationQueryRaw,
  RouteLocationNormalizedLoaded,
  Router,
} from "vue-router";
import { useRoute, useRouter } from "vue-router";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import type { GitHubConnectionStatusResponse } from "@gitiempo/shared";

import {
  createProfileGitHubClient,
  type ProfileGitHubClient,
} from "@/services/profile-github-client";
import { useAuthStore } from "@/stores/auth";

/* eslint-disable no-unused-vars */

interface ConfirmLike {
  require(options: {
    accept: () => void | Promise<void>;
    acceptLabel: string;
    acceptProps: { severity: "danger" };
    header: string;
    message: string;
    rejectLabel: string;
  }): void;
}

interface ToastLike {
  add(message: {
    detail: string;
    life?: number;
    severity: "error" | "success";
    summary: string;
  }): void;
}

interface UseProfileGithubConnectionOptions {
  authStore?: ReturnType<typeof useAuthStore>;
  client?: ProfileGitHubClient;
  confirm?: ConfirmLike;
  locationAssign?: (url: string) => void;
  route?: Pick<RouteLocationNormalizedLoaded, "query">;
  router?: Pick<Router, "replace">;
  toast?: ToastLike;
}

/* eslint-enable no-unused-vars */

const defaultClient = createProfileGitHubClient({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
});
const successToastLife = 4000;

const callbackErrorMessages: Record<string, string> = {
  github_config: "GitHub is not configured for this environment yet.",
  github_denied: "GitHub authorization was cancelled before the connection completed.",
  github_exchange_failed: "GitHub could not complete the authorization exchange.",
  invalid_callback: "GitHub returned an incomplete callback response.",
  invalid_state: "The GitHub callback could not be validated. Start the connection again.",
};
const genericCallbackErrorMessage = "GitHub could not complete the connection flow.";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function getCallbackToast(route: Pick<RouteLocationNormalizedLoaded, "query">): {
  detail: string;
  life?: number;
  severity: "error" | "success";
  summary: string;
} | null {
  const github = route.query.github;
  const code = route.query.code;

  if (github === "connected") {
    return {
      detail: "Your GitHub account is now connected.",
      life: successToastLife,
      severity: "success",
      summary: "GitHub connected",
    } as const;
  }

  if (github === "error") {
    const detail =
      typeof code === "string" && code in callbackErrorMessages
        ? callbackErrorMessages[code]
        : genericCallbackErrorMessage;

    return {
      detail,
      severity: "error",
      summary: "GitHub connection failed",
    };
  }

  return null;
}

function getCleanQuery(
  route: Pick<RouteLocationNormalizedLoaded, "query">,
): LocationQueryRaw {
  const nextQuery: LocationQueryRaw = { ...route.query };

  delete nextQuery.github;
  delete nextQuery.code;

  return nextQuery;
}

export function useProfileGithubConnection(
  options: UseProfileGithubConnectionOptions = {},
) {
  const authStore = options.authStore ?? useAuthStore();
  const client = options.client ?? defaultClient;
  const confirm = options.confirm ?? useConfirm();
  const route = options.route ?? useRoute();
  const router = options.router ?? useRouter();
  const toast = options.toast ?? useToast();
  const locationAssign =
    options.locationAssign ?? ((url: string) => window.location.assign(url));

  const connection = shallowRef<GitHubConnectionStatusResponse | null>(null);
  const isConnecting = shallowRef(false);
  const isDisconnecting = shallowRef(false);
  const isLoading = shallowRef(true);
  const requestErrorMessage = shallowRef<string | null>(null);

  let connectRequestId = 0;

  const state = computed(() => {
    if (isConnecting.value) {
      return "connecting" as const;
    }

    if (isLoading.value && connection.value === null) {
      return "loading" as const;
    }

    if (requestErrorMessage.value) {
      return "request-error" as const;
    }

    return connection.value?.status === "connected"
      ? ("connected" as const)
      : ("disconnected" as const);
  });

  function showErrorToast(summary: string, detail: string): void {
    toast.add({ detail, severity: "error", summary });
  }

  function showSuccessToast(summary: string, detail: string): void {
    toast.add({ detail, life: successToastLife, severity: "success", summary });
  }

  function requireAccessToken(): string {
    if (!authStore.accessToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    return authStore.accessToken;
  }

  async function refreshConnectionStatus(): Promise<void> {
    isLoading.value = true;
    requestErrorMessage.value = null;

    try {
      connection.value = await client.getConnectionStatus(requireAccessToken());
    } catch (error) {
      const message = getErrorMessage(error);

      requestErrorMessage.value = message;
      showErrorToast("Could not load GitHub connection", message);
    } finally {
      isLoading.value = false;
    }
  }

  async function handleCallbackQuery(): Promise<void> {
    const callbackToast = getCallbackToast(route);

    if (!callbackToast) {
      return;
    }

    toast.add(callbackToast);
    await router.replace({ query: getCleanQuery(route) });
  }

  async function connect(): Promise<void> {
    const requestId = ++connectRequestId;

    isConnecting.value = true;

    try {
      const response = await client.getAuthUrl(requireAccessToken());

      if (requestId !== connectRequestId) {
        return;
      }

      locationAssign(response.authorizationUrl);
    } catch (error) {
      if (requestId !== connectRequestId) {
        return;
      }

      showErrorToast("Could not start GitHub connection", getErrorMessage(error));
      isConnecting.value = false;
    }
  }

  async function disconnect(): Promise<void> {
    isDisconnecting.value = true;

    try {
      await client.disconnect(requireAccessToken());
      showSuccessToast(
        "GitHub disconnected",
        "Your GitHub account has been disconnected.",
      );
      await refreshConnectionStatus();
    } catch (error) {
      showErrorToast("Could not disconnect GitHub", getErrorMessage(error));
    } finally {
      isDisconnecting.value = false;
    }
  }

  function requestDisconnect(): void {
    confirm.require({
      accept: disconnect,
      acceptLabel: "Disconnect",
      acceptProps: { severity: "danger" },
      header: "Disconnect GitHub?",
      message: "This will remove your current GitHub connection from the profile.",
      rejectLabel: "Cancel",
    });
  }

  onMounted(async () => {
    await handleCallbackQuery();
    await refreshConnectionStatus();
  });

  return {
    connect,
    connection,
    isConnecting,
    isDisconnecting,
    refreshConnectionStatus,
    requestDisconnect,
    requestErrorMessage,
    state,
  };
}
