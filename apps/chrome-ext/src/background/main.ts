/* global chrome */

import type { TimeEntryResponse, TokenPairResponse } from "@gitiempo/shared";

import { getExtensionConfig } from "@/lib/config";
import { createExtensionApiClient } from "@/lib/api";
import type {
  BackgroundMessage,
  RuntimeAuthResult,
  RuntimeMutationResult,
  RuntimeSnapshot,
  SnapshotUser,
} from "@/lib/runtime";
import { getStoredSession } from "@/lib/session";
import { decodeAccessTokenEmail } from "@/lib/token";

const config = getExtensionConfig();
const apiClient = createExtensionApiClient({ config });
const contentScriptMatches = [
  "https://github.com/*/*/issues/*",
  "https://github.com/*/*/pull/*",
  "https://github.com/orgs/*/projects/*",
];

function deriveSnapshotUser(
  session: TokenPairResponse,
  timeEntry: TimeEntryResponse | null,
): SnapshotUser | null {
  const email = decodeAccessTokenEmail(session.accessToken) ?? timeEntry?.user.email ?? null;

  if (!email) {
    return null;
  }

  return {
    displayName: timeEntry?.user.displayName ?? null,
    email,
  };
}

async function loadSnapshot(): Promise<RuntimeSnapshot> {
  const session = await getStoredSession();

  if (!session) {
    return {
      authenticated: false,
      currentTimer: null,
      errorMessage: null,
      user: null,
    };
  }

  try {
    const response = await apiClient.getCurrentTimer();

    return {
      authenticated: true,
      currentTimer: response.timeEntry,
      errorMessage: null,
      user: deriveSnapshotUser(session, response.timeEntry),
    };
  } catch (error) {
    const nextSession = await getStoredSession();

    return {
      authenticated: nextSession !== null,
      currentTimer: null,
      errorMessage: error instanceof Error ? error.message : "Unable to load timer state.",
      user: nextSession ? deriveSnapshotUser(nextSession, null) : null,
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

async function handleAuthExchange(
  firebaseIdToken: string,
): Promise<RuntimeAuthResult> {
  return handleMutation(() => apiClient.loginWithFirebaseToken(firebaseIdToken));
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
        sendResponse(await handleAuthExchange(request.firebaseIdToken));
        return;
      }
      case "auth/exchange-github-session": {
        sendResponse(
          await handleMutation(() =>
            apiClient.exchangeGithubSession(request.code, request.verifier),
          ),
        );
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
