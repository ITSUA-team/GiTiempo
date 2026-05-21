/* global chrome */

import { getExtensionConfig } from "@/lib/config";
import { createExtensionApiClient } from "@/lib/api";
import type { BackgroundMessage, RuntimeMutationResult, RuntimeSnapshot } from "@/lib/runtime";
import { getStoredSession } from "@/lib/session";

const config = getExtensionConfig();
const apiClient = createExtensionApiClient({ config });
const contentScriptMatches = [
  "https://github.com/*/*/issues/*",
  "https://github.com/*/*/pull/*",
];

async function loadSnapshot(): Promise<RuntimeSnapshot> {
  const session = await getStoredSession();

  if (!session) {
    return {
      authenticated: false,
      currentTimer: null,
      errorMessage: null,
    };
  }

  try {
    const response = await apiClient.getCurrentTimer();

    return {
      authenticated: true,
      currentTimer: response.timeEntry,
      errorMessage: null,
    };
  } catch (error) {
    const nextSession = await getStoredSession();

    return {
      authenticated: nextSession !== null,
      currentTimer: null,
      errorMessage: error instanceof Error ? error.message : "Unable to load timer state.",
    };
  }
}

export async function broadcastSnapshot(snapshot: RuntimeSnapshot): Promise<void> {
  const event = {
    type: "runtime/snapshot-updated",
    snapshot,
  } as const;

  try {
    await chrome.runtime.sendMessage(event);
  } catch {
    // Snapshot broadcast is best-effort for cross-surface sync.
  }

  try {
    const tabs = await chrome.tabs.query({ url: contentScriptMatches });

    await Promise.all(
      tabs.map(async (tab) => {
        if (tab.id === undefined) {
          return;
        }

        try {
          await chrome.tabs.sendMessage(tab.id, event);
        } catch {
          // Content scripts are injected per-tab, so absent listeners are expected.
        }
      }),
    );
  } catch {
    // Tab broadcast is also best-effort.
  }
}

async function handleMutation(
  run: () => Promise<unknown>,
): Promise<RuntimeMutationResult> {
  try {
    await run();
    const snapshot = await loadSnapshot();

    await broadcastSnapshot(snapshot);

    return {
      ok: true,
      snapshot,
    };
  } catch (error) {
    const snapshot = await loadSnapshot();

    await broadcastSnapshot(snapshot);

    return {
      ok: false,
      errorMessage:
        error instanceof Error ? error.message : "Unable to update timer state.",
      snapshot,
    };
  }
}

async function openExtension(): Promise<void> {
  try {
    if (chrome.action.openPopup) {
      await chrome.action.openPopup();
      return;
    }
  } catch {
    // Fallback below keeps sign-in reachable on browsers without openPopup support.
  }

  await chrome.tabs.create({ url: config.userSpaUrl });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const request = message as BackgroundMessage;

  void (async () => {
    switch (request.type) {
      case "auth/exchange-firebase-token": {
        await apiClient.loginWithFirebaseToken(request.firebaseIdToken);
        const snapshot = await loadSnapshot();

        await broadcastSnapshot(snapshot);
        sendResponse(snapshot);
        return;
      }
      case "runtime/get-snapshot": {
        sendResponse(await loadSnapshot());
        return;
      }
      case "timer/start": {
        sendResponse(
          await handleMutation(() => apiClient.startTimerFromGitHub(request.pageContext)),
        );
        return;
      }
      case "timer/stop": {
        sendResponse(await handleMutation(() => apiClient.stopTimer()));
        return;
      }
      case "ui/open-extension": {
        await openExtension();
        sendResponse(undefined);
        return;
      }
      default: {
        sendResponse(undefined);
      }
    }
  })();

  return true;
});
