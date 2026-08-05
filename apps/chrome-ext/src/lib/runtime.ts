/* global chrome */

import type { CurrentTimeEntryResponse, TimeEntryResponse } from "@gitiempo/shared";

import type { SupportedGitHubIssueContext } from "./github-context";


export interface SnapshotUser {
  displayName: string | null;
  email: string;
}

export interface RuntimeSnapshot {
  authenticated: boolean;
  currentTimer: TimeEntryResponse | null;
  errorMessage: string | null;
  user: SnapshotUser | null;
}

export interface RuntimeActionResult {
  errorMessage?: string;
  ok: boolean;
  snapshot: RuntimeSnapshot;
}

export type RuntimeAuthResult = RuntimeActionResult;
export type RuntimeMutationResult = RuntimeActionResult;

export interface RuntimeClient {
  exchangeFirebaseToken(firebaseIdToken: string): Promise<RuntimeAuthResult>;
  signInWithGithub(): Promise<RuntimeAuthResult>;
  signInWithGoogle(): Promise<RuntimeAuthResult>;
  exchangeGithubSession(
    code: string,
    verifier: string,
  ): Promise<RuntimeAuthResult>;
  getSnapshot(): Promise<RuntimeSnapshot>;
  onSnapshotUpdated(listener: (snapshot: RuntimeSnapshot) => void): () => void;
  openExtension(): Promise<void>;
  signOut(): Promise<RuntimeAuthResult>;
  startTimer(pageContext: SupportedGitHubIssueContext): Promise<RuntimeMutationResult>;
  stopTimer(): Promise<RuntimeMutationResult>;
}


export type BackgroundMessage =
  | { type: "auth/exchange-firebase-token"; firebaseIdToken: string }
  | { type: "auth/exchange-github-session"; code: string; verifier: string }
  | { type: "auth/sign-in-github" }
  | { type: "auth/sign-in-google" }
  | { type: "auth/sign-out" }
  | { type: "runtime/get-snapshot" }
  | { type: "timer/start"; pageContext: SupportedGitHubIssueContext }
  | { type: "timer/stop" }
  | { type: "ui/open-extension" };

type BackgroundEvent = {
  type: "runtime/snapshot-updated";
  snapshot: RuntimeSnapshot;
};

export function createRuntimeSnapshot(
  currentTimerResponse: CurrentTimeEntryResponse | null,
  overrides?: Partial<RuntimeSnapshot>,
): RuntimeSnapshot {
  return {
    authenticated: currentTimerResponse !== null,
    currentTimer: currentTimerResponse?.timeEntry ?? null,
    errorMessage: null,
    user: null,
    ...overrides,
  };
}

async function sendRuntimeMessage<TResponse>(
  message: BackgroundMessage,
): Promise<TResponse> {
  return chrome.runtime.sendMessage(message) as Promise<TResponse>;
}

export function createRuntimeClient(): RuntimeClient {
  return {
    exchangeFirebaseToken(firebaseIdToken) {
      return sendRuntimeMessage<RuntimeAuthResult>({
        type: "auth/exchange-firebase-token",
        firebaseIdToken,
      });
    },
    exchangeGithubSession(code, verifier) {
      return sendRuntimeMessage<RuntimeAuthResult>({
        type: "auth/exchange-github-session",
        code,
        verifier,
      });
    },
    signInWithGithub() {
      return sendRuntimeMessage<RuntimeAuthResult>({
        type: "auth/sign-in-github",
      });
    },
    signInWithGoogle() {
      return sendRuntimeMessage<RuntimeAuthResult>({
        type: "auth/sign-in-google",
      });
    },
    getSnapshot() {
      return sendRuntimeMessage<RuntimeSnapshot>({ type: "runtime/get-snapshot" });
    },
    onSnapshotUpdated(listener) {
      const runtimeListener = (message: unknown) => {
        const event = message as BackgroundEvent;

        if (event?.type === "runtime/snapshot-updated") {
          listener(event.snapshot);
        }
      };

      chrome.runtime.onMessage.addListener(runtimeListener);

      return () => {
        chrome.runtime.onMessage.removeListener(runtimeListener);
      };
    },
    async openExtension() {
      await sendRuntimeMessage<void>({ type: "ui/open-extension" });
    },
    signOut() {
      return sendRuntimeMessage<RuntimeAuthResult>({ type: "auth/sign-out" });
    },
    startTimer(pageContext) {
      return sendRuntimeMessage<RuntimeMutationResult>({
        type: "timer/start",
        pageContext,
      });
    },
    stopTimer() {
      return sendRuntimeMessage<RuntimeMutationResult>({ type: "timer/stop" });
    },
  };
}
