/* global chrome */

import "@/styles/extension.css";

import { deriveProfileInitials } from "@gitiempo/shared";

import { getExtensionConfig } from "@/lib/config";
import { escapeHtml } from "@/lib/html";
import type { PageContext, SupportedGitHubIssueContext } from "@/lib/github-context";
import { parseGitHubIssueUrl } from "@/lib/github-context";
import { signInWithEmailPassword, signInWithGoogle } from "@/lib/firebase";
import { signInWithGithub } from "@/lib/github-signin";
import {
  createRuntimeClient,
  type RuntimeClient,
  type RuntimeSnapshot,
  type SnapshotUser,
} from "@/lib/runtime";
import { formatElapsedTime } from "@/lib/time";

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
  signInWithGithubFn?: typeof signInWithGithub;
  signInWithGoogleFn?: typeof signInWithGoogle;
}

interface PopupState {
  email: string;
  errorMessage: string | null;
  githubSignInEnabled: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  pageContext: PageContext | null;
  password: string;
  showEmailForm: boolean;
  snapshot: RuntimeSnapshot | null;
}

const config = getExtensionConfig();

const popupPrimaryButtonClass =
  "bg-brand text-text-inverse w-full rounded-sm px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60";
const popupTextActionClass =
  "text-brand rounded-sm bg-transparent text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
// The two provider actions wear their own brand marks, matching the web logins,
// rather than two identically brand-coloured buttons that read as one choice.
const popupOAuthButtonBaseClass =
  "flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-sm px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60";
const popupGoogleButtonClass = `${popupOAuthButtonBaseClass} border-divider bg-surface-primary text-text-dark border`;
const popupGithubButtonClass = `${popupOAuthButtonBaseClass} bg-github text-text-inverse`;
const popupGoogleMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45.12 24.5c0-1.56-0.14-3.06-0.4-4.5h-20.72v8.51h11.84c-0.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" /><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07h-7.35v5.7c3.62 7.19 11.06 12.12 19.66 12.12z" /><path fill="#FBBC05" d="M11.69 28.18c-0.44-1.32-0.69-2.73-0.69-4.18s0.25-2.86 0.69-4.18v-5.7h-7.35c-1.49 2.97-2.34 6.33-2.34 9.88s0.85 6.91 2.34 9.88l7.35-5.7z" /><path fill="#EA4335" d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31c-3.81-3.55-8.79-5.73-14.72-5.73-8.6 0-16.04 4.93-19.66 12.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" /></svg>`;
const popupGithubMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0c-4.42 0-8 3.58-8 8 0 3.54 2.29 6.53 5.47 7.59 0.4 0.07 0.55-0.17 0.55-0.38 0-0.19-0.01-0.82-0.01-1.49-2.01 0.37-2.53-0.49-2.69-0.94-0.09-0.23-0.48-0.94-0.82-1.13-0.28-0.15-0.68-0.52-0.01-0.53 0.63-0.01 1.08 0.58 1.23 0.82 0.72 1.21 1.87 0.87 2.33 0.66 0.07-0.52 0.28-0.87 0.51-1.07-1.78-0.2-3.64-0.89-3.64-3.95 0-0.87 0.31-1.59 0.82-2.15-0.08-0.2-0.36-1.02 0.08-2.12 0 0 0.67-0.21 2.2 0.82 0.64-0.18 1.32-0.27 2-0.27 0.68 0 1.36 0.09 2 0.27 1.53-1.04 2.2-0.82 2.2-0.82 0.44 1.1 0.16 1.92 0.08 2.12 0.51 0.56 0.82 1.27 0.82 2.15 0 3.07-1.87 3.75-3.65 3.95 0.29 0.25 0.54 0.73 0.54 1.48 0 1.07-0.01 1.93-0.01 2.2 0 0.21 0.15 0.46 0.55 0.38a8.013 8.013 0 0 0 5.45-7.59c0-4.42-3.58-8-8-8z" /></svg>`;

function renderAuthDivider(): string {
  return `
    <div class="flex w-full items-center gap-3" aria-hidden="true">
      <span class="bg-divider h-px flex-1"></span>
      <span class="text-text-muted text-xs font-medium">or</span>
      <span class="bg-divider h-px flex-1"></span>
    </div>
  `;
}

const popupHomeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10.5 9-7 9 7" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /><path d="M9.5 21v-6a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6" /></svg>`;

function getUserInitials(user: SnapshotUser): string {
  return deriveProfileInitials(user.displayName?.trim() || user.email, "GT");
}

function renderHomeButton(): string {
  return `
    <a
      href="${escapeHtml(config.userSpaHomeUrl)}"
      target="_blank"
      rel="noreferrer"
      aria-label="Open GiTiempo dashboard"
      class="text-brand flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >${popupHomeIconSvg}</a>
  `;
}

function renderUserAvatar(user: SnapshotUser): string {
  return `<div data-testid="popup-user-avatar" title="${escapeHtml(user.displayName ?? user.email)}" class="bg-accent-tint text-brand flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold">${escapeHtml(getUserInitials(user))}</div>`;
}

function renderBrandHeader({
  authenticated = false,
  user = null,
}: {
  authenticated?: boolean;
  user?: SnapshotUser | null;
} = {}): string {
  const headerActions = authenticated
    ? `<div class="flex items-center gap-2">${renderHomeButton()}${user ? renderUserAvatar(user) : ""}</div>`
    : "";

  return `
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="bg-accent-tint text-brand flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold">GT</div>
        <div>
          <p class="m-0 text-sm font-semibold text-text-dark">GiTiempo</p>
          <p class="m-0 text-xs text-text-muted">GitHub timer</p>
        </div>
      </div>
      ${headerActions}
    </div>
  `;
}

function renderIssueCard(pageContext: SupportedGitHubIssueContext): string {
  return `
    <div class="bg-app-bg flex flex-col gap-2 rounded-lg p-4">
      <p class="m-0 text-xs font-medium text-text-muted">Current task context</p>
      <p class="m-0 text-lg font-semibold text-text-dark">#${pageContext.issueNumber} ${escapeHtml(pageContext.issueTitle)}</p>
      <p class="m-0 text-xs text-text-muted">${escapeHtml(pageContext.githubRepo)}</p>
    </div>
  `;
}

function renderPopupBody(state: PopupState, nowMs: number): string {
  if (state.isLoading || state.snapshot === null) {
    return `
      ${renderBrandHeader()}
      <div class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p class="m-0 text-lg font-semibold text-text-dark">Loading extension state</p>
        <p class="m-0 text-sm text-text-muted">Checking your session and timer context.</p>
      </div>
    `;
  }

  if (!state.snapshot.authenticated) {
    return `
      <div class="flex h-full flex-col gap-6">
        ${renderBrandHeader()}
        <div class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p class="m-0 text-lg font-semibold text-text-dark">Sign in to continue</p>
          <p class="m-0 max-w-[220px] text-sm text-text-muted">Connect your workspace account to start tracking time.</p>
          ${state.errorMessage ? `<p class="m-0 text-sm text-destructive">${escapeHtml(state.errorMessage)}</p>` : ""}
          <button data-action="google-sign-in" class="${popupGoogleButtonClass}" ${state.isSubmitting ? "disabled" : ""}>${popupGoogleMarkSvg}Continue with Google</button>
          ${state.githubSignInEnabled ? `<button data-action="github-sign-in" class="${popupGithubButtonClass}" ${state.isSubmitting ? "disabled" : ""}>${popupGithubMarkSvg}Continue with GitHub</button>` : ""}
          ${renderAuthDivider()}
          <button data-action="toggle-email" class="${popupTextActionClass} cursor-pointer" ${state.isSubmitting ? "disabled" : ""}>Sign in with email</button>
          ${state.showEmailForm ? `
            <form data-form="email-sign-in" class="flex w-full flex-col gap-3 text-left">
              <label class="flex flex-col gap-1 text-sm font-medium text-text-dark">
                <span>Email</span>
                <input data-field="email" type="email" autocomplete="email" value="${escapeHtml(state.email)}" class="border-divider rounded-sm border px-3 py-2 text-sm text-text-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-text-dark">
                <span>Password</span>
                <input data-field="password" type="password" autocomplete="current-password" value="${escapeHtml(state.password)}" class="border-divider rounded-sm border px-3 py-2 text-sm text-text-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" />
              </label>
              <button class="${popupPrimaryButtonClass}" ${state.isSubmitting ? "disabled" : ""}>Continue with email</button>
            </form>
          ` : ""}
        </div>
      </div>
    `;
  }

  if (state.errorMessage || state.snapshot.errorMessage || state.pageContext?.kind === "error") {
    const message =
      state.errorMessage ??
      state.snapshot.errorMessage ??
      (state.pageContext?.kind === "error" ? state.pageContext.message : "Workspace sync is temporarily unavailable.");

    return `
      <div class="flex h-full flex-col gap-6">
        ${renderBrandHeader({ authenticated: true, user: state.snapshot.user })}
        <div class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div class="bg-status-error-bg text-status-error-text flex h-[72px] w-[72px] items-center justify-center rounded-full text-xl font-semibold">!</div>
          <p class="m-0 text-lg font-semibold text-text-dark">Connection lost</p>
          <p class="m-0 max-w-[220px] text-sm text-text-muted">${escapeHtml(message)}</p>
          <button data-action="retry" class="${popupTextActionClass}">Retry connection</button>
        </div>
      </div>
    `;
  }

  if (state.snapshot.currentTimer) {
    const runningRepo = state.snapshot.currentTimer.githubIssue?.githubRepo;
    const runningContext = runningRepo
      ? `${state.snapshot.currentTimer.project.name} / ${runningRepo}`
      : state.snapshot.currentTimer.project.name;

    return `
      <div class="flex h-full flex-col gap-5">
        ${renderBrandHeader({ authenticated: true, user: state.snapshot.user })}
        <div class="bg-app-bg flex flex-col items-center gap-3 rounded-lg p-5 text-center">
          <div class="bg-status-active-bg text-status-active-text flex items-center rounded-sm px-3 py-1 text-xs font-semibold">Running timer</div>
          <p class="m-0 text-2xl font-semibold text-brand">${formatElapsedTime(state.snapshot.currentTimer.startedAt, nowMs)}</p>
          <p class="m-0 text-sm font-medium text-text-dark">${escapeHtml(state.snapshot.currentTimer.task.title)}</p>
          <p class="m-0 text-xs text-text-muted">${escapeHtml(runningContext)}</p>
        </div>
        <div class="mt-auto flex flex-col gap-3">
          <button data-action="stop-timer" class="bg-destructive text-text-inverse w-full rounded-sm px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Stop Timer</button>
        </div>
      </div>
    `;
  }

  if (state.pageContext?.kind === "supported") {
    return `
      <div class="flex h-full flex-col gap-5">
        ${renderBrandHeader({ authenticated: true, user: state.snapshot.user })}
        ${renderIssueCard(state.pageContext)}
        <div class="mt-auto flex flex-col gap-3">
          <button data-action="start-timer" class="${popupPrimaryButtonClass}">Start Timer</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="flex h-full flex-col gap-5">
      ${renderBrandHeader({ authenticated: true, user: state.snapshot.user })}
      <div class="bg-app-bg flex flex-col gap-2 rounded-lg p-4">
        <p class="m-0 text-xs font-medium text-text-muted">GitHub issue required</p>
        <p class="m-0 text-lg font-semibold text-text-dark">Open a supported GitHub issue to start a timer.</p>
        <p class="m-0 text-xs text-text-muted">Timer start is unavailable on this tab.</p>
      </div>
      <div class="mt-auto flex flex-col gap-3">
        <a href="${escapeHtml(config.userSpaHomeUrl)}" target="_blank" rel="noreferrer" class="bg-brand text-text-inverse rounded-sm px-4 py-3 text-center text-sm font-semibold no-underline transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Open GiTiempo workspace</a>
        <p class="m-0 text-center text-[13px] font-semibold text-brand">Supported on direct GitHub issue pages and GitHub Projects issue panes.</p>
      </div>
    </div>
  `;
}

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
  signInWithGithubFn = signInWithGithub,
  signInWithGoogleFn = signInWithGoogle,
}: PopupAppOptions) {
  const state: PopupState = {
    email: "",
    errorMessage: null,
    githubSignInEnabled,
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

  function syncTicker(): void {
    if (intervalHandle) {
      clearIntervalFn(intervalHandle);
      intervalHandle = null;
    }

    if (state.snapshot?.currentTimer) {
      intervalHandle = setIntervalFn(() => {
        render();
      }, 1000);
    }
  }

  function bindEvents(): void {
    root.querySelector('[data-action="google-sign-in"]')?.addEventListener("click", () => {
      void handleGoogleSignIn();
    });
    root.querySelector('[data-action="github-sign-in"]')?.addEventListener("click", () => {
      void handleGithubSignIn();
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
      const firebaseIdToken = await signInWithGoogleFn();
      const result = await runtimeClient.exchangeFirebaseToken(firebaseIdToken);

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

  async function handleGithubSignIn(): Promise<void> {
    state.isSubmitting = true;
    state.errorMessage = null;
    render();

    try {
      // Firebase is not involved: the backend owns this flow and returns a
      // one-time handoff code, which the service worker exchanges for the same
      // token pair the other two actions produce.
      const { code, verifier } = await signInWithGithubFn();
      const result = await runtimeClient.exchangeGithubSession(code, verifier);

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
