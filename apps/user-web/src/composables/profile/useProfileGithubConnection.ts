import { computed, onMounted, ref, shallowRef } from "vue";
import type {
  RouteLocationNormalizedLoaded,
  Router,
} from "vue-router";
import { useRoute, useRouter } from "vue-router";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import type { GitHubConnectionStatusResponse } from "@gitiempo/shared";
import {
  createAppConfirm,
  createAppToast,
  getErrorMessage,
  type ConfirmLike,
  type ToastLike,
} from "@gitiempo/web-shared";

import { createDefaultProfileGitHubClient } from "@/config/clients";
import type { ProfileGitHubClient } from "@/services/profile-github-client";

import { useProfileGithubAuthorizationRedirect } from "./useProfileGithubAuthorizationRedirect";
import { useProfileGithubCallbackQuery } from "./useProfileGithubCallbackQuery";


interface UseProfileGithubConnectionOptions {
  client?: ProfileGitHubClient;
  confirm?: ConfirmLike;
  locationAssign?: (url: string) => void;
  route?: Pick<RouteLocationNormalizedLoaded, "query">;
  router?: Pick<Router, "replace">;
  toast?: ToastLike;
}


export function useProfileGithubConnection(
  options: UseProfileGithubConnectionOptions = {},
) {
  const client = options.client ?? createDefaultProfileGitHubClient();
  const confirm = options.confirm ?? useConfirm();
  const route = options.route ?? useRoute();
  const router = options.router ?? useRouter();
  const toast = options.toast ?? useToast();
  const appConfirm = createAppConfirm(confirm);
  const appToast = createAppToast(toast);
  const locationAssign =
    options.locationAssign ?? ((url: string) => window.location.assign(url));
  const authorizationRedirect = useProfileGithubAuthorizationRedirect({
    client,
    locationAssign,
    toast,
  });
  const callbackQuery = useProfileGithubCallbackQuery({
    route,
    router,
    toast,
  });

  const connection = shallowRef<GitHubConnectionStatusResponse | null>(null);
  const isDisconnecting = ref(false);
  const isLoading = ref(true);
  const requestErrorMessage = ref<string | null>(null);

  const state = computed(() => {
    if (authorizationRedirect.isConnecting.value) {
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

  async function refreshConnectionStatus(): Promise<void> {
    isLoading.value = true;
    requestErrorMessage.value = null;

    try {
      connection.value = await client.getConnectionStatus();
    } catch (error) {
      const message = getErrorMessage(error);

      requestErrorMessage.value = message;
      appToast.showErrorToast({
        detail: "Refresh and try again.",
        error,
        logContext: { action: "load-connection", feature: "profile-github" },
        summary: "Could not load GitHub connection",
      });
    } finally {
      isLoading.value = false;
    }
  }

  async function disconnect(): Promise<void> {
    isDisconnecting.value = true;

    try {
      await client.disconnect();
      appToast.showSuccessToast(
        "GitHub disconnected",
        "Your GitHub account has been disconnected.",
      );
      await refreshConnectionStatus();
    } catch (error) {
      appToast.showErrorToast({
        detail: "Please try again.",
        error,
        logContext: { action: "disconnect", feature: "profile-github" },
        summary: "Could not disconnect GitHub",
      });
    } finally {
      isDisconnecting.value = false;
    }
  }

  function requestDisconnect(): void {
    appConfirm.confirmDestructive({
      accept: disconnect,
      acceptLabel: "Disconnect",
      header: "Disconnect GitHub?",
      message: "This will remove your current GitHub connection from the profile.",
    });
  }

  onMounted(async () => {
    await callbackQuery.handleCallbackQuery();
    await refreshConnectionStatus();
  });

  return {
    connect: authorizationRedirect.connect,
    connection,
    isConnecting: authorizationRedirect.isConnecting,
    isDisconnecting,
    refreshConnectionStatus,
    requestDisconnect,
    requestErrorMessage,
    state,
  };
}
