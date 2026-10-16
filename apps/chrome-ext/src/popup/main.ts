/* global chrome */

import "@/styles/popup.css";

import { getExtensionConfig } from "@/lib/config";
import type { PageContext } from "@/lib/github-context";
import { parseGitHubIssueUrl } from "@/lib/github-context";
import { signInWithEmailPassword } from "@/lib/firebase";
import {
  createRuntimeClient,
  getCurrentTrackingCapability,
  type RuntimeClient,
} from "@/lib/runtime";
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

  if (!activeTab) {
    return { kind: "error", message: "No active browser tab was found." };
  }

  // Tabs outside the granted hosts exist, but their URL is not exposed.
  if (!activeTab.url) {
    return { kind: "unsupported" };
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

    if (response?.kind === "supported" || response?.kind === "error") {
      return response;
    }
  } catch {
    // Reloading an unpacked extension disconnects scripts in existing tabs.
    // Do not guess context from the tab title; the page needs a fresh script.
  }

  return {
    kind: "error",
    message: "Refresh this GitHub issue page to reconnect GiTiempo, then try again.",
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
    isSwitchingWorkspace: false,
    pageContext: null,
    password: "",
    showEmailForm: false,
    snapshot: null,
    workspaceMemberships: null,
    workspaceMembershipsError: null,
    workspaceSwitchError: null,
    isWorkspaceMembershipsLoading: false,
  };

  let intervalHandle: ReturnType<typeof setInterval> | null = null;
  let capabilityRefreshError: string | null = null;
  let pageCapabilityRefreshSequence = 0;
  let isDestroyed = false;
  let workspaceMembershipRequestSequence = 0;
  let workspaceSwitchRequestSequence = 0;
  const unsubscribe = runtimeClient.onSnapshotUpdated((snapshot) => {
    pageCapabilityRefreshSequence += 1;
    state.snapshot = snapshot;
    render();

    if (state.isAccountMenuOpen) {
      void refreshPageTrackingCapability();
      return;
    }

    void load();
  });

  function clearCapabilityRefreshError(): void {
    if (state.errorMessage === capabilityRefreshError) {
      state.errorMessage = null;
    }
    capabilityRefreshError = null;
  }

  function isCurrentPageCapabilityRefresh(
    requestSequence: number,
    userEmail: string | null,
    workspaceId: string | null,
  ): boolean {
    return !isDestroyed &&
      requestSequence === pageCapabilityRefreshSequence &&
      state.snapshot?.authenticated === true &&
      (state.snapshot.user?.email ?? null) === userEmail &&
      (state.snapshot.workspace?.id ?? null) === workspaceId;
  }

  async function refreshPageTrackingCapability(): Promise<void> {
    const requestSequence = ++pageCapabilityRefreshSequence;
    const pageContext = state.pageContext;
    const snapshot = state.snapshot;

    if (!snapshot?.authenticated || pageContext?.kind !== "supported") return;

    const userEmail = snapshot.user?.email ?? null;
    const workspaceId = snapshot.workspace?.id ?? null;

    try {
      const refreshedSnapshot = await runtimeClient.getSnapshot(pageContext);
      if (!isCurrentPageCapabilityRefresh(requestSequence, userEmail, workspaceId)) return;

      state.snapshot = refreshedSnapshot;
      clearCapabilityRefreshError();
      render();
    } catch (error) {
      if (!isCurrentPageCapabilityRefresh(requestSequence, userEmail, workspaceId)) return;

      capabilityRefreshError =
        error instanceof Error ? error.message : "Unable to refresh workspace state.";
      state.errorMessage = capabilityRefreshError;
      render();
    }
  }

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
    // The browser prevents the event when Escape only dismisses an expanded
    // native select. A subsequent Escape remains available to dismiss this menu.
    if (event.key !== "Escape" || event.defaultPrevented || !state.isAccountMenuOpen) return;

    // Browser-action popups close by default on Escape. Once this menu owns the
    // key, keep the popup open while dismissing only the account menu.
    event.preventDefault();
    closeAccountMenu();
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
        const isOpening = !state.isAccountMenuOpen;
        state.isAccountMenuOpen = isOpening;
        render();

        if (isOpening) void loadWorkspaceMemberships();
      });
    root
      .querySelector<HTMLSelectElement>('[data-field="workspace-selector"]')
      ?.addEventListener("change", (event) => {
        void handleWorkspaceSelection((event.currentTarget as HTMLSelectElement).value);
      });
    root.querySelector('[data-action="retry-workspaces"]')?.addEventListener("click", () => {
      void loadWorkspaceMemberships();
    });
    root.querySelector('[data-action="open-profile"]')?.addEventListener("click", () => {
      closeAccountMenu();
    });
    root.querySelector('[data-action="sign-out"]')?.addEventListener("click", () => {
      void handleSignOut();
    });
    root.querySelector('[data-action="retry-sign-out"]')?.addEventListener("click", () => {
      void handleRetryProviderCleanup();
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
    const shouldRestoreWorkspaceFocus =
      state.isAccountMenuOpen &&
      document.activeElement?.getAttribute("data-field") === "workspace-selector";

    root.innerHTML = `
      <div class="bg-surface-primary text-text-dark flex h-[480px] min-h-[480px] w-[320px] flex-col p-5">
        ${renderPopupBody(state, now())}
      </div>
    `;
    syncTicker();
    bindEvents();

    if (shouldRestoreWorkspaceFocus) {
      root.querySelector<HTMLSelectElement>('[data-field="workspace-selector"]')?.focus();
    }
  }

  async function loadWorkspaceMemberships(): Promise<void> {
    if (!state.snapshot?.authenticated) return;

    const requestSequence = ++workspaceMembershipRequestSequence;
    const isCurrentRequest = () => requestSequence === workspaceMembershipRequestSequence;
    state.isWorkspaceMembershipsLoading = true;
    state.workspaceMembershipsError = null;
    render();

    try {
      const result = await runtimeClient.getWorkspaceMemberships();

      if (!isCurrentRequest()) return;

      state.snapshot = result.snapshot;
      if (result.ok) {
        state.workspaceMemberships = result.items;
        await refreshWorkspaceSnapshot(isCurrentRequest);
      } else {
        state.workspaceMemberships = null;
        state.workspaceMembershipsError = result.errorMessage ?? "Unable to load workspaces.";
      }
    } catch (error) {
      if (!isCurrentRequest()) return;

      state.workspaceMemberships = null;
      state.workspaceMembershipsError =
        error instanceof Error ? error.message : "Unable to load workspaces.";
    } finally {
      if (isCurrentRequest()) {
        state.isWorkspaceMembershipsLoading = false;
        render();
      }
    }
  }

  async function handleWorkspaceSelection(workspaceId: string): Promise<void> {
    const currentWorkspaceId = state.snapshot?.workspace?.id;

    if (!workspaceId || workspaceId === currentWorkspaceId || state.isSwitchingWorkspace || state.snapshot?.workspaceSwitching) return;

    const requestSequence = ++workspaceSwitchRequestSequence;
    const isCurrentRequest = () => requestSequence === workspaceSwitchRequestSequence;
    workspaceMembershipRequestSequence += 1;
    pageCapabilityRefreshSequence += 1;
    state.isWorkspaceMembershipsLoading = false;
    let shouldReloadMemberships = false;
    state.isSwitchingWorkspace = true;
    state.workspaceSwitchError = null;
    render();

    try {
      const result = await runtimeClient.switchWorkspace(workspaceId);

      if (!isCurrentRequest()) return;

      workspaceMembershipRequestSequence += 1;
      state.isWorkspaceMembershipsLoading = false;
      state.snapshot = result.snapshot;
      if (result.ok) {
        state.workspaceMemberships = state.workspaceMemberships?.map((membership) => ({
          ...membership,
          isCurrent: membership.workspaceId === result.snapshot.workspace?.id,
        })) ?? null;
        await refreshWorkspaceSnapshot(isCurrentRequest);
      } else {
        state.workspaceSwitchError = result.errorMessage ?? "Unable to switch workspace.";
        shouldReloadMemberships = true;
      }
    } catch (error) {
      if (!isCurrentRequest()) return;

      state.workspaceSwitchError =
        error instanceof Error ? error.message : "Unable to switch workspace.";
      shouldReloadMemberships = true;
    } finally {
      if (isCurrentRequest()) {
        state.isSwitchingWorkspace = false;
        render();
        if (shouldReloadMemberships) {
          void loadWorkspaceMemberships();
        }
      }
    }
  }

  async function refreshWorkspaceSnapshot(isCurrentRequest: () => boolean): Promise<void> {
    if (!state.snapshot || !isCurrentRequest()) return;
    const capabilityRequestSequence = ++pageCapabilityRefreshSequence;

    // The switch result proves the token pair and workspace only. A page-bound
    // capability from the previous workspace must never unlock Start while the
    // target workspace is still being reconciled.
    state.snapshot = { ...state.snapshot, trackingCapability: null };

    try {
      const snapshot = await runtimeClient.getSnapshot(
        state.pageContext?.kind === "supported" ? state.pageContext : undefined,
      );
      if (isCurrentRequest() && capabilityRequestSequence === pageCapabilityRefreshSequence) {
        state.snapshot = snapshot;
      }
    } catch (error) {
      if (isCurrentRequest() && capabilityRequestSequence === pageCapabilityRefreshSequence) {
        state.workspaceSwitchError =
          error instanceof Error ? error.message : "Unable to refresh workspace state.";
      }
    }
  }

  async function load(): Promise<void> {
    pageCapabilityRefreshSequence += 1;
    state.isLoading = true;
    state.errorMessage = null;
    render();

    try {
      const pageContext = await pageContextResolver();
      state.pageContext = pageContext;
      state.snapshot = await runtimeClient.getSnapshot(
        pageContext.kind === "supported" ? pageContext : undefined,
      );
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
    pageCapabilityRefreshSequence += 1;
    workspaceMembershipRequestSequence += 1;
    workspaceSwitchRequestSequence += 1;
    state.isSwitchingWorkspace = false;
    state.isWorkspaceMembershipsLoading = false;
    state.workspaceMemberships = null;
    state.workspaceMembershipsError = null;
    state.workspaceSwitchError = null;
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

  async function handleRetryProviderCleanup(): Promise<void> {
    state.isSubmitting = true;
    state.errorMessage = null;
    render();

    try {
      const result = await runtimeClient.retryProviderCleanup();

      state.snapshot = result.snapshot;
      state.errorMessage = result.ok
        ? null
        : result.errorMessage ?? "Unable to complete sign-out.";
    } catch (error) {
      state.errorMessage =
        error instanceof Error ? error.message : "Unable to complete sign-out.";
    } finally {
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
    if (state.isSubmitting || state.isSwitchingWorkspace || state.snapshot?.workspaceSwitching || state.pageContext?.kind !== "supported") return;
    const trackingCapability = getCurrentTrackingCapability(
      state.snapshot,
      state.pageContext,
    );
    if (!trackingCapability?.canStartTracking) {
      state.errorMessage = state.snapshot?.trackingCapability?.reason ??
        "Unable to confirm whether you can track this issue. Refresh and try again.";
      render();
      return;
    }
    const expectedWorkspaceId = state.snapshot?.workspace?.id;
    const expectedUserEmail = state.snapshot?.user?.email;
    if (!expectedWorkspaceId || !expectedUserEmail) {
      state.errorMessage = "Workspace context is unavailable. Refresh before starting.";
      render();
      return;
    }
    state.isSubmitting = true;
    render();
    try {
      const context = await pageContextResolver();
      state.pageContext = context;
      if (context.kind !== "supported") throw new Error(context.kind === "error" ? context.message : "Open a supported GitHub issue to start a timer.");
      const result = await runtimeClient.startTimer(context, expectedWorkspaceId, expectedUserEmail);
      state.snapshot = result.snapshot;
      state.errorMessage = result.ok ? null : result.errorMessage ?? "Unable to start timer.";
    } catch (error) {
      state.errorMessage = error instanceof Error ? error.message : "Unable to start timer.";
    } finally {
      state.isSubmitting = false;
      render();
    }
  }

  async function handleStopTimer(): Promise<void> {
    if (state.isSubmitting || state.isSwitchingWorkspace || state.snapshot?.workspaceSwitching) return;
    const expectedTimerId = state.snapshot?.currentTimer?.id;

    if (!expectedTimerId) {
      state.errorMessage = "Timer status changed. Please retry.";
      render();
      return;
    }

    state.isSubmitting = true;
    render();
    try {
      const result = await runtimeClient.stopTimer(expectedTimerId);

      state.snapshot = result.snapshot;
      state.errorMessage = result.ok ? null : result.errorMessage ?? "Unable to stop timer.";
    } catch (error) {
      state.errorMessage =
        error instanceof Error ? error.message : "Unable to stop timer.";
    } finally {
      state.isSubmitting = false;
      render();
    }
  }

  return {
    destroy() {
      isDestroyed = true;
      pageCapabilityRefreshSequence += 1;
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
