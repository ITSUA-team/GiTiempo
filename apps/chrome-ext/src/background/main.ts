/* global chrome */

import {
  githubTrackingErrorMessages,
  type TimeEntryResponse,
  type TokenPairResponse,
} from '@gitiempo/shared';

import { getExtensionConfig } from '@/lib/config';
import { createExtensionApiClient } from '@/lib/api';
import { signInWithGoogle, signOutFromFirebase } from '@/lib/firebase';
import { signInWithGithub } from '@/lib/github-signin';
import type {
  BackgroundMessage,
  RuntimeAuthResult,
  RuntimeMutationResult,
  RuntimeSnapshot,
  RuntimeTrackingCapability,
  RuntimeWorkspaceMembershipsResult,
  SnapshotUser,
} from '@/lib/runtime';
import {
  clearPendingProviderCleanup,
  getStoredSession,
  hasPendingProviderCleanup,
  setPendingProviderCleanup,
} from '@/lib/session';
import {
  decodeAccessTokenEmail,
  decodeAccessTokenWorkspaceId,
} from '@/lib/token';
import { getGitHubTrackingErrorCode } from '@/lib/github-tracking-error';
import type { SupportedGitHubIssueContext } from '@/lib/github-context';

const config = getExtensionConfig();
const apiClient = createExtensionApiClient({ config });
const contentScriptMatches = [
  'https://github.com/*/*/issues/*',
  'https://github.com/orgs/*/projects/*',
];

function deriveSnapshotUser(
  session: TokenPairResponse,
  timeEntry: TimeEntryResponse | null,
): SnapshotUser | null {
  const email =
    decodeAccessTokenEmail(session.accessToken) ??
    timeEntry?.user.email ??
    null;

  if (!email) {
    return null;
  }

  return {
    displayName: timeEntry?.user.displayName ?? null,
    email,
  };
}

let lastSnapshot: RuntimeSnapshot | null = null;
let lastSnapshotGeneration: number | null = null;
let workspaceSwitching = false;
let pendingTimerMutation: Promise<void> = Promise.resolve();
let sessionGeneration = 0;
let interactiveSignInInFlight = false;

const WORKSPACE_CHANGED_MESSAGE =
  'Your session or workspace changed. Refresh and review the destination before starting.';
const INTERACTIVE_SIGN_IN_IN_FLIGHT_MESSAGE =
  'Sign-in is already open. Finish or close the provider window before trying again.';

function withWorkspaceSwitching(snapshot: RuntimeSnapshot): RuntimeSnapshot {
  return workspaceSwitching ? { ...snapshot, workspaceSwitching: true } : snapshot;
}

function clearLastSnapshot(): void {
  lastSnapshot = null;
  lastSnapshotGeneration = null;
}

function storeLastSnapshot(snapshot: RuntimeSnapshot): void {
  lastSnapshot = snapshot;
  lastSnapshotGeneration = sessionGeneration;
}

function getSessionIdentity(session: TokenPairResponse): {
  email: string | null;
  workspaceId: string | null;
} {
  return {
    email: decodeAccessTokenEmail(session.accessToken),
    workspaceId: decodeAccessTokenWorkspaceId(session.accessToken),
  };
}

async function loadSnapshot(
  pageContext?: SupportedGitHubIssueContext,
): Promise<RuntimeSnapshot> {
  const [session, providerCleanupPending] = await Promise.all([
    getStoredSession(),
    getProviderCleanupPending(),
  ]);

  if (!session) {
    clearLastSnapshot();
    return withWorkspaceSwitching({
      authenticated: false,
      currentTimer: null,
      errorMessage: null,
      providerCleanupPending,
      user: null,
    });
  }

  const email = decodeAccessTokenEmail(session.accessToken);
  const workspaceId = decodeAccessTokenWorkspaceId(session.accessToken);
  const expectedContext = email && workspaceId
    ? { email, workspaceId }
    : undefined;
  const [timerResult, workspaceResult, capabilityResult] = await Promise.allSettled([
    apiClient.getCurrentTimer(),
    apiClient.getWorkspace(),
    pageContext
      ? apiClient.getTrackingCapability(pageContext, expectedContext)
      : Promise.resolve(null),
  ]);
  const nextSession = await getStoredSession();
  if (!nextSession) {
    clearLastSnapshot();
    return withWorkspaceSwitching({
      authenticated: false,
      currentTimer: null,
      errorMessage: null,
      providerCleanupPending,
      user: null,
    });
  }
  const nextEmail = decodeAccessTokenEmail(nextSession.accessToken);
  const nextWorkspaceId = decodeAccessTokenWorkspaceId(nextSession.accessToken);
  const sessionChanged =
    nextEmail !== email ||
    nextWorkspaceId !== workspaceId;
  if (sessionChanged) {
    clearLastSnapshot();
    return withWorkspaceSwitching({
      authenticated: true,
      currentTimer: null,
      workspace: null,
      user: deriveSnapshotUser(nextSession, null),
      providerCleanupPending,
      errorMessage:
        WORKSPACE_CHANGED_MESSAGE,
    });
  }
  const sameUser = nextEmail !== null && lastSnapshot?.user?.email === nextEmail;
  const returnedTimer =
    timerResult.status === 'fulfilled' ? timerResult.value.timeEntry : null;
  const timerMatches =
    returnedTimer === null || returnedTimer.user.email === nextEmail;
  const workspaceMatches =
    workspaceResult.status === 'fulfilled' &&
    (nextWorkspaceId === null || workspaceResult.value.id === nextWorkspaceId);
  const trackingCapability: RuntimeTrackingCapability | null =
    pageContext && capabilityResult.status === 'fulfilled' && capabilityResult.value
      ? {
          ...capabilityResult.value,
          githubRepo: pageContext.githubRepo,
          issueNumber: pageContext.issueNumber,
        }
      : null;
  const currentTimer =
    timerResult.status === 'fulfilled'
      ? timerMatches
        ? returnedTimer
        : null
      : sameUser
        ? (lastSnapshot?.currentTimer ?? null)
        : null;
  const failure =
    timerResult.status === 'rejected'
      ? timerResult.reason
      : workspaceResult.status === 'rejected'
        ? workspaceResult.reason
        : capabilityResult.status === 'rejected'
          ? capabilityResult.reason
        : null;
  const snapshot: RuntimeSnapshot = withWorkspaceSwitching({
    authenticated: true,
    currentTimer,
    workspace:
      workspaceMatches && workspaceResult.status === 'fulfilled'
        ? { id: workspaceResult.value.id, name: workspaceResult.value.name }
        : null,
    errorMessage:
      !timerMatches ||
      (workspaceResult.status === 'fulfilled' && !workspaceMatches)
        ? WORKSPACE_CHANGED_MESSAGE
        : failure
          ? failure instanceof Error
            ? failure.message
            : 'Unable to load timer state.'
          : null,
    providerCleanupPending,
    ...(pageContext ? { trackingCapability } : {}),
    user: deriveSnapshotUser(nextSession, currentTimer),
  });
  storeLastSnapshot(snapshot);
  return snapshot;
}

async function loadWorkspaceMemberships(): Promise<RuntimeWorkspaceMembershipsResult> {
  if (!(await getStoredSession())) {
    const snapshot = await loadSnapshot();
    return {
      errorMessage: 'Your session has expired. Please sign in again.',
      items: [],
      ok: false,
      snapshot,
    };
  }

  try {
    const response = await apiClient.getWorkspaceMemberships();
    const currentSnapshot = await loadSnapshot();
    const currentMembership = response.items.find((item) => item.isCurrent);

    if (
      !currentSnapshot.authenticated ||
      !currentSnapshot.workspace ||
      currentMembership?.workspaceId !== currentSnapshot.workspace.id
    ) {
      return {
        errorMessage: WORKSPACE_CHANGED_MESSAGE,
        items: [],
        ok: false,
        snapshot: currentSnapshot,
      };
    }

    return { items: response.items, ok: true, snapshot: currentSnapshot };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unable to load workspaces.',
      items: [],
      ok: false,
      snapshot: await loadSnapshot(),
    };
  }
}

export async function broadcastSnapshot(
  snapshot: RuntimeSnapshot,
): Promise<void> {
  const event = {
    type: 'runtime/snapshot-updated',
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
    const errorCode = getGitHubTrackingErrorCode(error);

    await broadcastSnapshot(snapshot);

    return {
      ok: false,
      ...(errorCode ? { errorCode } : {}),
      errorMessage: errorCode
        ? githubTrackingErrorMessages[errorCode]
        : error instanceof Error
          ? error.message
          : 'Unable to update timer state.',
      snapshot,
    };
  }
}

async function handleTimerMutation(
  run: () => Promise<unknown>,
): Promise<RuntimeMutationResult> {
  if (workspaceSwitching) {
    const snapshot = await loadSnapshot();
    return {
      errorMessage: 'Workspace switching is in progress. Wait for the destination to refresh.',
      ok: false,
      snapshot,
    };
  }

  const mutation = pendingTimerMutation.then(async () => {
    if (workspaceSwitching) {
      throw new Error('Workspace switching is in progress. Wait for the destination to refresh.');
    }

    await run();
  });
  const result = handleMutation(() => mutation);
  pendingTimerMutation = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

export async function handleWorkspaceSwitch(
  workspaceId: string,
): Promise<RuntimeMutationResult> {
  if (workspaceSwitching) {
    const snapshot = await loadSnapshot();
    return {
      errorMessage: 'Workspace switching is already in progress.',
      ok: false,
      snapshot,
    };
  }

  const initialGeneration = sessionGeneration;
  workspaceSwitching = true;

  let ok = false;
  let errorMessage: string | undefined;

  try {
    const initialSession = await getStoredSession();
    const initialIdentity = initialSession
      ? getSessionIdentity(initialSession)
      : null;
    await broadcastSnapshot(await loadSnapshot());

    await pendingTimerMutation;
    const session = await getStoredSession();

    if (
      !session ||
      !initialIdentity ||
      sessionGeneration !== initialGeneration ||
      getSessionIdentity(session).email !== initialIdentity.email ||
      getSessionIdentity(session).workspaceId !== initialIdentity.workspaceId
    ) {
      throw new Error(WORKSPACE_CHANGED_MESSAGE);
    }

    if (decodeAccessTokenWorkspaceId(session.accessToken) !== workspaceId) {
      await apiClient.switchWorkspace(workspaceId);
    }

    if (sessionGeneration !== initialGeneration) {
      throw new Error(WORKSPACE_CHANGED_MESSAGE);
    }

    ok = true;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unable to switch workspace.';
  }

  let snapshot: RuntimeSnapshot;
  let shouldBroadcastSnapshot = true;
  try {
    // Keep timer mutations blocked while the target timer and capability state
    // are fetched. Publishing an unlocked snapshot before this completes would
    // let an old control send a Start against an unreconciled destination.
    const reconcilingSnapshot = await loadSnapshot();
    snapshot = {
      ...reconcilingSnapshot,
      workspaceSwitching: undefined,
    };
  } catch (error) {
    // The rotation may have succeeded even though its final storage read did
    // not. Do not expose a prior workspace, timer, or capability in that case.
    // The stored session remains intact so a later snapshot refresh can recover.
    ok = false;
    errorMessage = error instanceof Error ? error.message : 'Unable to switch workspace.';
    const sessionWasSuperseded = sessionGeneration !== initialGeneration;
    const currentSnapshot =
      sessionWasSuperseded && lastSnapshotGeneration === sessionGeneration
        ? lastSnapshot
        : null;
    if (currentSnapshot) {
      snapshot = {
        ...currentSnapshot,
        workspaceSwitching: undefined,
      };
    } else {
      if (!sessionWasSuperseded) {
        clearLastSnapshot();
      }
      shouldBroadcastSnapshot = !sessionWasSuperseded;
      snapshot = {
        authenticated: !sessionWasSuperseded,
        currentTimer: null,
        errorMessage,
        providerCleanupPending: false,
        trackingCapability: null,
        user: null,
        workspace: null,
        workspaceSwitching: undefined,
      };
    }
  } finally {
    workspaceSwitching = false;
  }

  if (ok && (!snapshot.authenticated || snapshot.workspace?.id !== workspaceId)) {
    ok = false;
    errorMessage = WORKSPACE_CHANGED_MESSAGE;
  }
  if (shouldBroadcastSnapshot) {
    await broadcastSnapshot(snapshot);
  }

  return {
    ...(errorMessage ? { errorMessage } : {}),
    ok,
    snapshot,
  };
}

async function handleAuthExchange(
  firebaseIdToken: string,
  googleIdToken?: string,
): Promise<RuntimeAuthResult> {
  return handleMutation(() =>
    googleIdToken
      ? apiClient.loginWithFirebaseToken(firebaseIdToken, googleIdToken)
      : apiClient.loginWithFirebaseToken(firebaseIdToken),
  );
}

const PROVIDER_CLEANUP_ERROR_MESSAGE =
  'Sign-out was incomplete. Retry to remove the remaining provider session.';
const CLEANUP_MARKER_ERROR_MESSAGE =
  'Sign-out completed, but its recovery status could not be stored.';

let providerCleanupPendingInMemory = false;

async function getProviderCleanupPending(): Promise<boolean> {
  try {
    return (
      providerCleanupPendingInMemory || (await hasPendingProviderCleanup())
    );
  } catch {
    return providerCleanupPendingInMemory;
  }
}

async function retryProviderCleanup(): Promise<void> {
  try {
    await signOutFromFirebase();
  } catch (error) {
    providerCleanupPendingInMemory = true;
    throw new Error(PROVIDER_CLEANUP_ERROR_MESSAGE, { cause: error });
  }

  try {
    await clearPendingProviderCleanup();
    providerCleanupPendingInMemory = false;
  } catch (error) {
    providerCleanupPendingInMemory = true;
    throw new Error(CLEANUP_MARKER_ERROR_MESSAGE, { cause: error });
  }
}

/**
 * Keeps the independently-owned GiTiempo and Firebase stores from making each
 * other conditional. The credential-free marker is started before either
 * cleanup begins, but its storage failure never blocks either cleanup. A failed
 * provider sign-out remains recoverable after a worker restart when the marker
 * can persist, and in the current worker otherwise.
 */
async function signOutEverywhere(): Promise<void> {
  const markerPromise = setPendingProviderCleanup();
  const sessionPromise = apiClient.exitSession();
  const providerPromise = signOutFromFirebase();
  let markerClearError: unknown = null;
  let markerWasWritten = false;

  // Start marker removal as soon as Firebase has completed. It therefore does
  // not wait for a slow but still bounded backend revoke.
  const providerCompletionPromise = providerPromise.then(
    async () => {
      try {
        await markerPromise;
        markerWasWritten = true;
        await clearPendingProviderCleanup();
        providerCleanupPendingInMemory = false;
      } catch (error) {
        markerClearError = error;
        // A failed initial write has no stale marker to recover, while a failed
        // removal leaves the already-written marker reachable for retry.
        providerCleanupPendingInMemory = markerWasWritten;
      }
    },
    (error) => {
      providerCleanupPendingInMemory = true;
      throw error;
    },
  );

  const [sessionResult, providerResult, markerResult] =
    await Promise.allSettled([
      sessionPromise,
      providerCompletionPromise,
      markerPromise,
    ]);

  if (providerResult.status === 'rejected') {
    if (markerResult.status === 'rejected') {
      throw new Error(
        `${PROVIDER_CLEANUP_ERROR_MESSAGE} Recovery status could not be stored.`,
        {
          cause: providerResult.reason,
        },
      );
    }

    throw new Error(PROVIDER_CLEANUP_ERROR_MESSAGE, {
      cause: providerResult.reason,
    });
  }

  if (sessionResult.status === 'rejected') {
    throw sessionResult.reason;
  }

  if (markerResult.status === 'rejected' || markerClearError !== null) {
    throw new Error(CLEANUP_MARKER_ERROR_MESSAGE, { cause: markerClearError });
  }
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
  if (interactiveSignInInFlight) {
    return {
      errorMessage: INTERACTIVE_SIGN_IN_IN_FLIGHT_MESSAGE,
      ok: false,
      snapshot: await loadSnapshot(),
    };
  }

  interactiveSignInInFlight = true;
  try {
    const result = await exchange();

    if (result.ok) {
      await reopenPopupIfPossible();
    }

    return result;
  } finally {
    interactiveSignInInFlight = false;
  }
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
      case 'auth/exchange-firebase-token': {
        sessionGeneration += 1;
        sendResponse(await handleAuthExchange(request.firebaseIdToken));
        return;
      }
      case 'auth/exchange-github-session': {
        sessionGeneration += 1;
        sendResponse(
          await handleMutation(() =>
            apiClient.exchangeGithubSession(request.code, request.verifier),
          ),
        );
        return;
      }
      case 'auth/sign-in-github': {
        sendResponse(
          await handleInteractiveSignIn(() => {
            sessionGeneration += 1;
            return handleMutation(async () => {
              const { code, verifier } = await signInWithGithub();
              await apiClient.exchangeGithubSession(code, verifier);
            });
          }),
        );
        return;
      }
      case 'auth/sign-in-google': {
        sendResponse(
          await handleInteractiveSignIn(() => {
            sessionGeneration += 1;
            return handleMutation(async () => {
              const signInResult = await signInWithGoogle();
              const { firebaseIdToken, googleIdToken } = typeof signInResult === 'string'
                ? { firebaseIdToken: signInResult }
                : signInResult;

              if (googleIdToken) {
                await apiClient.loginWithFirebaseToken(firebaseIdToken, googleIdToken);
              } else {
                await apiClient.loginWithFirebaseToken(firebaseIdToken);
              }
            });
          }),
        );
        return;
      }
      case 'auth/sign-out': {
        sessionGeneration += 1;
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
        sendResponse(await handleMutation(signOutEverywhere));
        return;
      }
      case 'auth/retry-provider-cleanup': {
        sendResponse(await handleMutation(retryProviderCleanup));
        return;
      }
      case 'runtime/get-snapshot': {
        sendResponse(await loadSnapshot(request.pageContext));
        return;
      }
      case 'workspace/get-memberships': {
        sendResponse(await loadWorkspaceMemberships());
        return;
      }
      case 'workspace/switch': {
        sendResponse(await handleWorkspaceSwitch(request.workspaceId));
        return;
      }
      case 'timer/start': {
        sendResponse(
          await handleTimerMutation(async () => {
            const snapshot = await loadSnapshot(request.pageContext);
            if (
              !snapshot.authenticated ||
              !snapshot.workspace ||
              snapshot.workspace.id !== request.expectedWorkspaceId ||
              snapshot.user?.email !== request.expectedUserEmail
            ) {
              throw new Error(
                WORKSPACE_CHANGED_MESSAGE,
              );
            }
            if (!snapshot.trackingCapability?.canStartTracking) {
              throw new Error(
                snapshot.trackingCapability?.reason ??
                  'Tracking permission could not be confirmed. Refresh and try again.',
              );
            }
            await apiClient.startTimerFromGitHub(request.pageContext, {
              workspaceId: snapshot.workspace.id,
              email: request.expectedUserEmail!,
            });
          }),
        );
        return;
      }
      case 'timer/stop': {
        sendResponse(
          await handleTimerMutation(() =>
            apiClient.stopTimer({ expectedTimerId: request.expectedTimerId }),
          ),
        );
        return;
      }
      case 'ui/open-extension': {
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
