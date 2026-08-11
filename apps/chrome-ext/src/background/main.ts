/* global chrome */

import type { TimeEntryResponse, TokenPairResponse } from "@gitiempo/shared";

import { getExtensionConfig } from "@/lib/config";
import { createExtensionApiClient } from "@/lib/api";
import { signInWithGoogle } from "@/lib/firebase";
import { signInWithGithub } from "@/lib/github-signin";
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

/**
 * Runs an interactive provider flow here rather than in the popup. Chrome tears
 * the popup down the moment the provider's authorization window takes focus, so
 * a flow awaited there dies mid-redirect and the session is never exchanged even
 * though the provider succeeded. The worker outlives the popup, and reopening it
 * afterwards is what makes the round trip look uninterrupted.
 */
async function handleInteractiveSignIn(
  exchange: () => Promise<RuntimeAuthResult>,
): Promise<RuntimeAuthResult> {
  const result = await exchange();

  if (result.ok) {
    await reopenPopupIfPossible();
  }

  return result;
}

/**
 * Best-effort only, and deliberately without the tab fallback `openExtension`
 * carries. `chrome.action.openPopup` needs a user gesture, which is long gone by
 * the time an interactive flow returns, so it usually throws here. Falling back
 * to the web app would land a member who just signed in on a login page, which
 * reads as the sign-in having failed. Their session already exists; the popup
 * shows it the next time they open it.
 */
async function reopenPopupIfPossible(): Promise<void> {
  try {
    await chrome.action.openPopup?.();
  } catch {
    // Nothing to recover: the session is stored and the snapshot broadcast.
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
      case "auth/sign-in-github": {
        sendResponse(
          await handleInteractiveSignIn(async () => {
            const { code, verifier } = await signInWithGithub();

            return handleMutation(() =>
              apiClient.exchangeGithubSession(code, verifier),
            );
          }),
        );
        return;
      }
      case "auth/sign-in-google": {
        sendResponse(
          await handleInteractiveSignIn(async () =>
            handleAuthExchange(await signInWithGoogle()),
          ),
        );
        return;
      }
      case "auth/sign-out": {
        // Through the mutation wrapper so the snapshot is rebuilt after the
        // session is gone and broadcast to the popup and any injected control,
        // rather than each surface being told separately.
        //
        // The await is deliberate, not something to optimise away. Storage is
        // already clear before the revoke runs, so nothing here waits for
        // correctness — but a pending handler keeps this MV3 worker alive, which
        // is what lets the best-effort revoke actually leave the machine.
        // Responding first would let the worker idle-terminate mid-request, and
        // the wait is bounded by the revoke's own five-second abort.
        sendResponse(await handleMutation(() => apiClient.exitSession()));
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
        sendResponse(
          await handleMutation(async () => {
            const { timeEntry } = await apiClient.getCurrentTimer();

            if (!timeEntry) {
              throw new Error("No running timer found.");
            }

            return apiClient.stopTimer({ expectedTimerId: timeEntry.id });
          }),
        );
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
