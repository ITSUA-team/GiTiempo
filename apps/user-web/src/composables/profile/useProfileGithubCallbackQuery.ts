import type {
  LocationQueryRaw,
  RouteLocationNormalizedLoaded,
  Router,
} from "vue-router";
import type { ToastLike } from "@gitiempo/web-shared";


interface UseProfileGithubCallbackQueryOptions {
  route: Pick<RouteLocationNormalizedLoaded, "query">;
  router: Pick<Router, "replace">;
  toast: ToastLike;
}

interface ProfileGithubCallbackToast {
  detail: string;
  life?: number;
  severity: "error" | "success";
  summary: string;
}


const callbackErrorMessages: Record<string, string> = {
  github_config: "GitHub is not configured for this environment yet.",
  github_denied: "GitHub authorization was cancelled before the connection completed.",
  github_exchange_failed: "GitHub could not complete the authorization exchange.",
  invalid_callback: "GitHub returned an incomplete callback response.",
  invalid_state: "The GitHub callback could not be validated. Start the connection again.",
};
const genericCallbackErrorMessage = "GitHub could not complete the connection flow.";

function getCallbackToast(
  route: Pick<RouteLocationNormalizedLoaded, "query">,
): ProfileGithubCallbackToast | null {
  const github = route.query.github;
  const code = route.query.code;

  if (github === "connected") {
    return {
      detail: "Your GitHub account is now connected.",
      life: 4000,
      severity: "success",
      summary: "GitHub connected",
    };
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

export function useProfileGithubCallbackQuery({
  route,
  router,
  toast,
}: UseProfileGithubCallbackQueryOptions) {
  async function handleCallbackQuery(): Promise<void> {
    const callbackToast = getCallbackToast(route);

    if (!callbackToast) {
      return;
    }

    toast.add(callbackToast);
    await router.replace({ query: getCleanQuery(route) });
  }

  return {
    handleCallbackQuery,
  };
}
