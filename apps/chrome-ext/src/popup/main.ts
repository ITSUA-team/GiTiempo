/* global chrome */

import "@/styles/extension.css";

import { getExtensionConfig } from "@/lib/config";
import { escapeHtml } from "@/lib/html";
import type { PageContext, SupportedGitHubIssueContext } from "@/lib/github-context";
import { parseGitHubIssueUrl } from "@/lib/github-context";
import { signInWithEmailPassword, signInWithGoogle } from "@/lib/firebase";
import { createRuntimeClient, type RuntimeClient, type RuntimeSnapshot } from "@/lib/runtime";
import { formatElapsedTime } from "@/lib/time";

interface PopupAppOptions {
  clearIntervalFn?: typeof clearInterval;
  now?: () => number;
  pageContextResolver?: () => Promise<PageContext>;
  root: HTMLElement;
  runtimeClient?: RuntimeClient;
  setIntervalFn?: typeof setInterval;
  signInWithEmailPasswordFn?: typeof signInWithEmailPassword;
  signInWithGoogleFn?: typeof signInWithGoogle;
}

interface PopupState {
  email: string;
  errorMessage: string | null;
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
const popupSecondaryButtonClass =
  "border-brand text-brand w-full rounded-sm border px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60";
const popupTextActionClass =
  "text-brand rounded-sm bg-transparent text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const popupLinkActionClass =
  "text-brand rounded-sm text-center text-[13px] font-semibold no-underline transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

function renderBrandHeader({
  badgeLabel,
  showBadge,
}: {
  badgeLabel?: string;
  showBadge: boolean;
}): string {
  return `
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="bg-accent-tint text-brand flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold">GT</div>
        <div>
          <p class="m-0 text-sm font-semibold text-text-dark">GiTiempo</p>
          <p class="m-0 text-xs text-text-muted">GitHub timer</p>
        </div>
      </div>
      ${showBadge ? `<div class="bg-accent-tint text-brand flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold">${escapeHtml(badgeLabel ?? "GT")}</div>` : ""}
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
      ${renderBrandHeader({ showBadge: false })}
      <div class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p class="m-0 text-lg font-semibold text-text-dark">Loading extension state</p>
        <p class="m-0 text-sm text-text-muted">Checking your session and timer context.</p>
      </div>
    `;
  }

  if (!state.snapshot.authenticated) {
    return `
      <div class="flex h-full flex-col gap-6">
        ${renderBrandHeader({ showBadge: false })}
        <div class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p class="m-0 text-lg font-semibold text-text-dark">Sign in to continue</p>
          <p class="m-0 max-w-[220px] text-sm text-text-muted">Connect your workspace account to start tracking time.</p>
          ${state.errorMessage ? `<p class="m-0 text-sm text-destructive">${escapeHtml(state.errorMessage)}</p>` : ""}
          <button data-action="google-sign-in" class="${popupPrimaryButtonClass}" ${state.isSubmitting ? "disabled" : ""}>Sign in with Google</button>
          <button data-action="toggle-email" class="${popupSecondaryButtonClass}" ${state.isSubmitting ? "disabled" : ""}>Sign in with email</button>
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
        ${renderBrandHeader({ showBadge: false })}
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
        ${renderBrandHeader({ showBadge: false })}
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
        ${renderBrandHeader({ showBadge: true })}
        ${renderIssueCard(state.pageContext)}
        <div class="mt-auto flex flex-col gap-3">
          <button data-action="start-timer" class="${popupPrimaryButtonClass}">Start Timer</button>
          <a href="${escapeHtml(config.userSpaUrl)}" target="_blank" rel="noreferrer" class="${popupLinkActionClass}">Open full workspace in GiTiempo</a>
        </div>
      </div>
    `;
  }

  return `
    <div class="flex h-full flex-col gap-5">
      ${renderBrandHeader({ showBadge: true })}
      <div class="bg-app-bg flex flex-col gap-2 rounded-lg p-4">
        <p class="m-0 text-xs font-medium text-text-muted">GitHub issue required</p>
        <p class="m-0 text-lg font-semibold text-text-dark">Open a supported GitHub issue to start a timer.</p>
        <p class="m-0 text-xs text-text-muted">Timer start is unavailable on this tab.</p>
      </div>
      <div class="mt-auto flex flex-col gap-3">
        <a href="${escapeHtml(config.userSpaUrl)}" target="_blank" rel="noreferrer" class="bg-brand text-text-inverse rounded-sm px-4 py-3 text-center text-sm font-semibold no-underline transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Open GiTiempo workspace</a>
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
  now = () => Date.now(),
  pageContextResolver = resolveActivePageContext,
  root,
  runtimeClient = createRuntimeClient(),
  setIntervalFn = setInterval,
  signInWithEmailPasswordFn = signInWithEmailPassword,
  signInWithGoogleFn = signInWithGoogle,
}: PopupAppOptions) {
  const state: PopupState = {
    email: "",
    errorMessage: null,
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
