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

function renderBrandHeader(showAvatar: boolean): string {
  return `
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="bg-accent-tint text-brand flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold">GT</div>
        <div>
          <p class="m-0 text-sm font-semibold text-text-dark">GiTiempo</p>
          <p class="m-0 text-xs text-text-muted">GitHub timer</p>
        </div>
      </div>
      ${showAvatar ? '<div class="bg-accent-tint text-brand flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold">GT</div>' : ""}
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
      ${renderBrandHeader(false)}
      <div class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p class="m-0 text-lg font-semibold text-text-dark">Loading extension state</p>
        <p class="m-0 text-sm text-text-muted">Checking your session and timer context.</p>
      </div>
    `;
  }

  if (!state.snapshot.authenticated) {
    return `
      <div class="flex h-full flex-col gap-6">
        ${renderBrandHeader(false)}
        <div class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p class="m-0 text-lg font-semibold text-text-dark">Sign in to continue</p>
          <p class="m-0 max-w-[220px] text-sm text-text-muted">Connect your workspace account to start tracking time.</p>
          ${state.errorMessage ? `<p class="m-0 text-sm text-destructive">${escapeHtml(state.errorMessage)}</p>` : ""}
          <button data-action="google-sign-in" class="bg-brand w-full rounded-sm px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" ${state.isSubmitting ? "disabled" : ""}>Sign in with Google</button>
          <button data-action="toggle-email" class="border-brand text-brand w-full rounded-sm border px-4 py-3 text-sm font-semibold disabled:opacity-60" ${state.isSubmitting ? "disabled" : ""}>Sign in with email</button>
          ${state.showEmailForm ? `
            <form data-form="email-sign-in" class="flex w-full flex-col gap-3 text-left">
              <label class="flex flex-col gap-1 text-sm font-medium text-text-dark">
                <span>Email</span>
                <input data-field="email" type="email" value="${escapeHtml(state.email)}" class="border-divider rounded-sm border px-3 py-2 text-sm text-text-dark" />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-text-dark">
                <span>Password</span>
                <input data-field="password" type="password" value="${escapeHtml(state.password)}" class="border-divider rounded-sm border px-3 py-2 text-sm text-text-dark" />
              </label>
              <button class="bg-brand rounded-sm px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" ${state.isSubmitting ? "disabled" : ""}>Continue with email</button>
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
        ${renderBrandHeader(true)}
        <div class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div class="bg-[#ffebee] text-destructive flex h-[72px] w-[72px] items-center justify-center rounded-full text-xl font-semibold">!</div>
          <p class="m-0 text-lg font-semibold text-text-dark">Connection lost</p>
          <p class="m-0 max-w-[220px] text-sm text-text-muted">${escapeHtml(message)}</p>
          <button data-action="retry" class="text-brand bg-transparent text-sm font-semibold">Retry connection</button>
        </div>
      </div>
    `;
  }

  if (state.snapshot.currentTimer) {
    return `
      <div class="flex h-full flex-col gap-5">
        ${renderBrandHeader(true)}
        <div class="bg-app-bg flex flex-col items-center gap-3 rounded-lg p-5 text-center">
          <div class="flex items-center rounded-sm bg-[#e8f5e9] px-3 py-1 text-xs font-semibold text-[#2e7d32]">Running timer</div>
          <p class="m-0 text-2xl font-semibold text-brand">${formatElapsedTime(state.snapshot.currentTimer.startedAt, nowMs)}</p>
          <p class="m-0 text-sm font-medium text-text-dark">${escapeHtml(state.snapshot.currentTimer.task.title)}</p>
          <p class="m-0 text-xs text-text-muted">${escapeHtml(state.snapshot.currentTimer.project.name)} / ${escapeHtml(state.snapshot.currentTimer.task.title)}</p>
        </div>
        <div class="mt-auto flex flex-col gap-3">
          <button data-action="stop-timer" class="w-full rounded-sm bg-destructive px-4 py-3 text-sm font-semibold text-white">Stop Timer</button>
        </div>
      </div>
    `;
  }

  if (state.pageContext?.kind === "supported") {
    return `
      <div class="flex h-full flex-col gap-5">
        ${renderBrandHeader(true)}
        ${renderIssueCard(state.pageContext)}
        <div class="mt-auto flex flex-col gap-3">
          <button data-action="start-timer" class="bg-brand w-full rounded-sm px-4 py-3 text-sm font-semibold text-white">Start Timer</button>
          <a href="${escapeHtml(config.userSpaUrl)}" target="_blank" rel="noreferrer" class="text-brand text-center text-[13px] font-semibold no-underline">Open full workspace in GiTiempo</a>
        </div>
      </div>
    `;
  }

  return `
    <div class="flex h-full flex-col gap-5">
      ${renderBrandHeader(true)}
      <div class="bg-app-bg flex flex-col gap-2 rounded-lg p-4">
        <p class="m-0 text-xs font-medium text-text-muted">GitHub issue required</p>
        <p class="m-0 text-lg font-semibold text-text-dark">Open a GitHub issue page to start a timer.</p>
        <p class="m-0 text-xs text-text-muted">Timer start is unavailable on this tab.</p>
      </div>
      <div class="mt-auto flex flex-col gap-3">
        <a href="${escapeHtml(config.userSpaUrl)}" target="_blank" rel="noreferrer" class="bg-brand rounded-sm px-4 py-3 text-center text-sm font-semibold text-white no-underline">Open GiTiempo workspace</a>
        <p class="m-0 text-center text-[13px] font-semibold text-brand">Navigate to github.com/&lt;owner&gt;/&lt;repo&gt;/issues/&lt;number&gt;.</p>
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
    message: "Open a GitHub issue page to start a timer.",
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
      <div class="bg-surface text-text-dark flex h-[480px] w-[320px] flex-col p-5">
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

      state.snapshot = await runtimeClient.exchangeFirebaseToken(firebaseIdToken);
      await load();
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

      state.snapshot = await runtimeClient.exchangeFirebaseToken(firebaseIdToken);
      state.showEmailForm = false;
      state.password = "";
      await load();
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

    const result = await runtimeClient.startTimer(state.pageContext);

    state.snapshot = result.snapshot;
    state.errorMessage = result.ok ? null : result.errorMessage ?? "Unable to start timer.";
    render();
  }

  async function handleStopTimer(): Promise<void> {
    const result = await runtimeClient.stopTimer();

    state.snapshot = result.snapshot;
    state.errorMessage = result.ok ? null : result.errorMessage ?? "Unable to stop timer.";
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
