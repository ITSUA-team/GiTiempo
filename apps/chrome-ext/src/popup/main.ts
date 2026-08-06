/* global chrome */

import "@/styles/extension.css";

import { getExtensionConfig } from "@/lib/config";
import type { PageContext } from "@/lib/github-context";
import { parseGitHubIssueUrl } from "@/lib/github-context";
import { signInWithEmailPassword } from "@/lib/firebase";
import { createRuntimeClient, type RuntimeClient } from "@/lib/runtime";
import { formatElapsedTime } from "@/lib/time";
import { renderPopupBody, type PopupState } from "./render";

interface PopupAppOptions {
  clearIntervalFn?: typeof clearInterval;
  /** Defaults to the build's flag; injectable so both branches are testable. */
  githubSignInEnabled?: boolean;
  now?: () => number;
  pageContextResolver?: () => Promise<PageContext>;
  root: HTMLElement;
  runtimeClient?: RuntimeClient;
  setIntervalFn?: typeof setInterval;
  signInWithEmailPasswordFn?: typeof signInWithEmailPassword;
}

const config = getExtensionConfig();

export async function resolveActivePageContext(): Promise<PageContext> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!activeTab?.url) {
    return { kind: "error", message: "No active browser tab was found." };
  }

  const parsed = parseGitHubIssueUrl(activeTab.url);

  if (!parsed) {
    return { kind: "unsupported" };
  }

  if (activeTab.id === undefined) {
    return { kind: "error", message: "The active GitHub tab could not be inspected." };
  }

  try {
    const response = (await chrome.tabs.sendMessage(activeTab.id, {
      type: "page-context/get",
    })) as PageContext;

    if (response?.kind === "supported") {
      return response;
    }
  } catch {
    const fallbackTitle = activeTab.title?.split("·")[0]?.trim();

    if (fallbackTitle) {
      return {
        ...parsed,
        issueTitle: fallbackTitle,
        issueUrl: activeTab.url,
        kind: "supported",
      };
    }
  }

  return {
    kind: "error",
    message: "Open a supported GitHub issue to start a timer.",
  };
}

export function createPopupApp({
  clearIntervalFn = clearInterval,
  githubSignInEnabled = config.githubSignInEnabled,
  now = () => Date.now(),
  pageContextResolver = resolveActivePageContext,
  root,
  runtimeClient = createRuntimeClient(),
  setIntervalFn = setInterval,
  signInWithEmailPasswordFn = signInWithEmailPassword,
}: PopupAppOptions) {
  const state: PopupState = {
    email: "",
    errorMessage: null,
    githubSignInEnabled,
    isAccountMenuOpen: false,
    isLoading: true,
    isSubmitting: false,
    pageContext: null,
    password: "",
    showEmailForm: false,
    snapshot: null,
  };

  let intervalHandle: ReturnType<typeof setInterval> | null = null;
  const unsubscribe = runtimeClient.onSnapshotUpdated((snapshot) => {
    state.snapshot = snapshot;
    render();
  });

  function closeAccountMenu(): void {
    if (!state.isAccountMenuOpen) {
      return;
    }

    state.isAccountMenuOpen = false;
    render();
  }

  // Registered once on the document rather than inside `bindEvents`, which runs on
  // every render — once a second while a timer ticks — and would otherwise stack a
  // new listener per frame.
  function handleDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      closeAccountMenu();
    }
  }

  function handleDocumentPointerDown(event: Event): void {
    if (!state.isAccountMenuOpen) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Node)) {
      closeAccountMenu();
      return;
    }

    // The trigger has its own toggle handler, so ignoring it here keeps a click on
    // the avatar from closing and reopening in the same gesture.
    const withinMenu = root
      .querySelector('[data-region="account-menu"]')
      ?.contains(target);
    const withinTrigger = root
      .querySelector('[data-action="toggle-account-menu"]')
      ?.contains(target);

    if (!withinMenu && !withinTrigger) {
      closeAccountMenu();
    }
  }

  document.addEventListener("keydown", handleDocumentKeydown);
  document.addEventListener("pointerdown", handleDocumentPointerDown);

  function syncTicker(): void {
    if (intervalHandle) {
      clearIntervalFn(intervalHandle);
      intervalHandle = null;
    }

    if (state.snapshot?.currentTimer) {
      intervalHandle = setIntervalFn(() => {
        advanceElapsed();
      }, 1000);
    }
  }

  /**
   * The ticker advances the clock and nothing else. It used to call `render()`,
   * which reassigns `root.innerHTML` and so destroyed and rebuilt every node once
   * a second — taking hover, focus, and text selection with it. On the account
   * menu that showed up as a pulse: each fresh item started at its un-hovered
   * background and transitioned back under a cursor that had never moved.
   *
   * Everything except the elapsed value changes through a snapshot update, which
   * still renders in full, so there is nothing else for a tick to redraw.
   */
  function advanceElapsed(): void {
    const startedAt = state.snapshot?.currentTimer?.startedAt;

    if (!startedAt) {
      return;
    }

    const elapsed = formatElapsedTime(startedAt, now());

    for (const node of root.querySelectorAll<HTMLElement>("[data-elapsed]")) {
      node.textContent = elapsed;
    }
  }

  function bindEvents(): void {
    root.querySelector('[data-action="google-sign-in"]')?.addEventListener("click", () => {
      void handleGoogleSignIn();
    });
    root.querySelector('[data-action="github-sign-in"]')?.addEventListener("click", () => {
      void handleGithubSignIn();
    });
    root
      .querySelector('[data-action="toggle-account-menu"]')
      ?.addEventListener("click", () => {
        state.isAccountMenuOpen = !state.isAccountMenuOpen;
        render();
      });
    root.querySelector('[data-action="open-profile"]')?.addEventListener("click", () => {
      closeAccountMenu();
    });
    root.querySelector('[data-action="sign-out"]')?.addEventListener("click", () => {
      void handleSignOut();
    });
    root.querySelector('[data-action="toggle-email"]')?.addEventListener("click", () => {
      state.showEmailForm = !state.showEmailForm;
      render();
    });
    root.querySelector('[data-action="start-timer"]')?.addEventListener("click", () => {
      void handleStartTimer();
    });
    root.querySelector('[data-action="stop-timer"]')?.addEventListener("click", () => {
      void handleStopTimer();
    });
    root.querySelector('[data-action="retry"]')?.addEventListener("click", () => {
      void load();
    });
    root.querySelector('[data-form="email-sign-in"]')?.addEventListener("submit", (event) => {
      event.preventDefault();
      void handleEmailSignIn();
    });
    root
      .querySelector<HTMLInputElement>('[data-field="email"]')
      ?.addEventListener("input", (event) => {
        state.email = (event.currentTarget as HTMLInputElement).value;
      });
    root
      .querySelector<HTMLInputElement>('[data-field="password"]')
      ?.addEventListener("input", (event) => {
        state.password = (event.currentTarget as HTMLInputElement).value;
      });
  }

  function render(): void {
    root.innerHTML = `
      <div class="bg-surface-primary text-text-dark flex min-h-[480px] w-[320px] flex-col p-5">
        ${renderPopupBody(state, now())}
      </div>
    `;
    syncTicker();
    bindEvents();
  }

  async function load(): Promise<void> {
    state.isLoading = true;
    state.errorMessage = null;
    render();

    try {
      const [snapshot, pageContext] = await Promise.all([
        runtimeClient.getSnapshot(),
        pageContextResolver(),
      ]);

      state.snapshot = snapshot;
      state.pageContext = pageContext;
    } catch (error) {
      state.snapshot = {
        authenticated: false,
        currentTimer: null,
        errorMessage: null,
        user: null,
      };
      state.pageContext = null;
      state.errorMessage =
        error instanceof Error ? error.message : "Unable to load extension state.";
    } finally {
      state.isLoading = false;
      render();
    }
  }

  async function handleGoogleSignIn(): Promise<void> {
    state.isSubmitting = true;
    state.errorMessage = null;
    render();

    try {
      // Delegated to the service worker rather than awaited here: Chrome closes
      // this popup as soon as Google's window takes focus, and a flow owned by a
      // destroyed page never reaches the token exchange.
      const result = await runtimeClient.signInWithGoogle();

      state.snapshot = result.snapshot;
      state.errorMessage = result.ok
        ? null
        : result.errorMessage ?? "Unable to sign in with Google.";

      if (result.ok) {
        await load();
      }
    } catch (error) {
      state.errorMessage =
        error instanceof Error ? error.message : "Unable to sign in with Google.";
    } finally {
      state.isSubmitting = false;
      render();
    }
  }

  async function handleSignOut(): Promise<void> {
    state.isSubmitting = true;
    state.errorMessage = null;
    render();

    try {
      const result = await runtimeClient.signOut();

      // The snapshot the service worker rebuilt after clearing the session is what
      // returns the popup to its unauthenticated state, rather than this handler
      // asserting that state itself and risking a different answer.
      state.snapshot = result.snapshot;
      state.errorMessage = result.ok
        ? null
        : result.errorMessage ?? "Unable to sign out.";
    } catch (error) {
      state.errorMessage =
        error instanceof Error ? error.message : "Unable to sign out.";
    } finally {
      state.isAccountMenuOpen = false;
      state.isSubmitting = false;
      render();
    }
  }

  async function handleGithubSignIn(): Promise<void> {
    state.isSubmitting = true;
    state.errorMessage = null;
    render();

    try {
      // Firebase is not involved: the backend owns this flow and returns a
      // one-time handoff code. The service worker runs it and exchanges the code,
      // because this popup is gone the moment the authorization window opens.
      const result = await runtimeClient.signInWithGithub();

      state.snapshot = result.snapshot;
      state.errorMessage = result.ok
        ? null
        : result.errorMessage ?? "Unable to sign in with GitHub.";

      if (result.ok) {
        await load();
      }
    } catch (error) {
      // A cancelled window and a returned error indicator both land here already
      // carrying copy that names what happened, so it is surfaced as-is.
      state.errorMessage =
        error instanceof Error ? error.message : "Unable to sign in with GitHub.";
    } finally {
      state.isSubmitting = false;
      render();
    }
  }

  async function handleEmailSignIn(): Promise<void> {
    state.isSubmitting = true;
    state.errorMessage = null;
    render();

    try {
      const firebaseIdToken = await signInWithEmailPasswordFn(
        state.email.trim(),
        state.password,
      );
      const result = await runtimeClient.exchangeFirebaseToken(firebaseIdToken);

      state.snapshot = result.snapshot;
      state.errorMessage = result.ok
        ? null
        : result.errorMessage ?? "Unable to sign in with email.";

      if (result.ok) {
        state.showEmailForm = false;
        state.password = "";
        await load();
      }
    } catch (error) {
      state.errorMessage =
        error instanceof Error ? error.message : "Unable to sign in with email.";
    } finally {
      state.isSubmitting = false;
      render();
    }
  }

  async function handleStartTimer(): Promise<void> {
    if (state.pageContext?.kind !== "supported") {
      return;
    }

    try {
      const result = await runtimeClient.startTimer(state.pageContext);

      state.snapshot = result.snapshot;
      state.errorMessage = result.ok ? null : result.errorMessage ?? "Unable to start timer.";
    } catch (error) {
      state.errorMessage =
        error instanceof Error ? error.message : "Unable to start timer.";
    }

    render();
  }

  async function handleStopTimer(): Promise<void> {
    try {
      const result = await runtimeClient.stopTimer();

      state.snapshot = result.snapshot;
      state.errorMessage = result.ok ? null : result.errorMessage ?? "Unable to stop timer.";
    } catch (error) {
      state.errorMessage =
        error instanceof Error ? error.message : "Unable to stop timer.";
    }

    render();
  }

  return {
    destroy() {
      unsubscribe();
      document.removeEventListener("keydown", handleDocumentKeydown);
      document.removeEventListener("pointerdown", handleDocumentPointerDown);

      if (intervalHandle) {
        clearIntervalFn(intervalHandle);
      }
    },
    load,
  };
}

const root = document.querySelector<HTMLElement>("#app");

if (root) {
  const app = createPopupApp({ root });

  void app.load();
}
