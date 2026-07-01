import { createAppToast, type ToastLike } from "@gitiempo/web-shared";
import { ref } from "vue";

import type { ProfileGitHubClient } from "@/services/profile-github-client";


interface UseProfileGithubAuthorizationRedirectOptions {
  client: Pick<ProfileGitHubClient, "getAuthUrl">;
  locationAssign: (url: string) => void;
  toast: ToastLike;
}


export function useProfileGithubAuthorizationRedirect({
  client,
  locationAssign,
  toast,
}: UseProfileGithubAuthorizationRedirectOptions) {
  const appToast = createAppToast(toast);
  const isConnecting = ref(false);

  let connectRequestId = 0;

  async function connect(): Promise<void> {
    const requestId = ++connectRequestId;

    isConnecting.value = true;

    try {
      const response = await client.getAuthUrl();

      if (requestId !== connectRequestId) {
        return;
      }

      locationAssign(response.authorizationUrl);
    } catch (error) {
      if (requestId !== connectRequestId) {
        return;
      }

      appToast.showErrorToast({
        detail: "Please try again.",
        error,
        logContext: { action: "start-connection", feature: "profile-github" },
        summary: "Could not start GitHub connection",
      });
      isConnecting.value = false;
    }
  }

  return {
    connect,
    isConnecting,
  };
}
