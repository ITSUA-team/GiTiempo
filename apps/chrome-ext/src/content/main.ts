/* global chrome */

import contentStyles from "@/styles/extension.css?inline";

import { escapeHtml } from "@/lib/html";
import {
  findGitHubIssueMountTarget,
  resolveGitHubIssueContext,
  type PageContext,
  type SupportedGitHubIssueContext,
} from "@/lib/github-context";
import { createRuntimeClient, type RuntimeClient, type RuntimeSnapshot } from "@/lib/runtime";
import { formatElapsedTime } from "@/lib/time";

interface InjectedAppOptions {
  clearIntervalFn?: typeof clearInterval;
  now?: () => number;
  pageContext: SupportedGitHubIssueContext;
  root: HTMLElement;
  runtimeClient?: RuntimeClient;
  setIntervalFn?: typeof setInterval;
}

interface InjectedState {
  actionErrorMessage: string | null;
  isLoading: boolean;
  snapshot: RuntimeSnapshot | null;
}

function renderInjectedBody(
  pageContext: SupportedGitHubIssueContext,
  state: InjectedState,
  nowMs: number,
): string {
  const issueHeader = `
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="m-0 text-xs font-medium text-text-muted">${escapeHtml(pageContext.githubRepo)} · #${pageContext.issueNumber}</p>
        <p class="m-0 mt-1 text-lg font-semibold text-text-dark">${escapeHtml(pageContext.issueTitle)}</p>
      </div>
      ${state.snapshot?.currentTimer ? '<span class="rounded-sm bg-[#e8f5e9] px-2 py-1 text-xs font-semibold text-[#2e7d32]">Running</span>' : ""}
    </div>
  `;

  if (state.isLoading || state.snapshot === null) {
    return `
      ${issueHeader}
      <p class="m-0 text-sm text-text-muted">Checking your GiTiempo timer state.</p>
    `;
  }

  if (state.actionErrorMessage || state.snapshot.errorMessage) {
    return `
      ${issueHeader}
      <div class="flex items-center justify-between gap-3">
        <p class="m-0 text-sm text-text-muted">${escapeHtml(state.actionErrorMessage ?? state.snapshot.errorMessage ?? "Unable to update timer state.")}</p>
        <button type="button" data-action="retry" class="text-brand bg-transparent text-sm font-semibold">Retry</button>
      </div>
    `;
  }

  if (!state.snapshot.authenticated) {
    return `
      ${issueHeader}
      <div class="flex items-center justify-between gap-3">
        <p class="m-0 text-sm text-text-muted">Sign in to GiTiempo to start tracking this issue.</p>
        <button type="button" data-action="open-extension" class="bg-brand rounded-sm px-4 py-2 text-sm font-semibold text-white">Open extension</button>
      </div>
    `;
  }

  if (state.snapshot.currentTimer) {
    return `
      ${issueHeader}
      <div class="flex items-center justify-between gap-3">
        <p class="m-0 text-lg font-semibold text-brand">${formatElapsedTime(state.snapshot.currentTimer.startedAt, nowMs)}</p>
        <button type="button" data-action="stop-timer" class="rounded-sm bg-destructive px-4 py-2 text-sm font-semibold text-white">Stop Timer</button>
      </div>
    `;
  }

  return `
    ${issueHeader}
    <div class="flex items-center justify-between gap-3">
      <p class="m-0 text-sm text-text-muted">Start tracking directly from this GitHub issue.</p>
      <button type="button" data-action="start-timer" class="bg-brand rounded-sm px-4 py-2 text-sm font-semibold text-white">Start Timer</button>
    </div>
  `;
}

export function createInjectedIssueApp({
  clearIntervalFn = clearInterval,
  now = () => Date.now(),
  pageContext,
  root,
  runtimeClient = createRuntimeClient(),
  setIntervalFn = setInterval,
}: InjectedAppOptions) {
  const state: InjectedState = {
    actionErrorMessage: null,
    isLoading: true,
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
    root.querySelector('[data-action="start-timer"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void handleStartTimer();
    });
    root.querySelector('[data-action="stop-timer"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void handleStopTimer();
    });
    root.querySelector('[data-action="retry"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void load();
    });
    root.querySelector('[data-action="open-extension"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void runtimeClient.openExtension();
    });
  }

  function render(): void {
    root.innerHTML = `
      <div class="mx-auto w-full max-w-[1280px] px-6 pt-4 text-white">
        <section class="bg-surface border-divider shadow-card flex w-full max-w-[760px] flex-col gap-4 rounded-lg border p-5">
          ${renderInjectedBody(pageContext, state, now())}
        </section>
      </div>
    `;
    syncTicker();
    bindEvents();
  }

  async function load(): Promise<void> {
    state.isLoading = true;
    state.actionErrorMessage = null;
    render();

    try {
      state.snapshot = await runtimeClient.getSnapshot();
    } catch (error) {
      state.snapshot = {
        authenticated: false,
        currentTimer: null,
        errorMessage: null,
      };
      state.actionErrorMessage =
        error instanceof Error ? error.message : "Unable to load timer state.";
    } finally {
      state.isLoading = false;
      render();
    }
  }

  async function handleStartTimer(): Promise<void> {
    try {
      const result = await runtimeClient.startTimer(pageContext);

      state.snapshot = result.snapshot;
      state.actionErrorMessage = result.ok
        ? null
        : result.errorMessage ?? "Unable to start timer.";
    } catch (error) {
      state.actionErrorMessage =
        error instanceof Error ? error.message : "Unable to start timer.";
    }

    render();
  }

  async function handleStopTimer(): Promise<void> {
    try {
      const result = await runtimeClient.stopTimer();

      state.snapshot = result.snapshot;
      state.actionErrorMessage = result.ok
        ? null
        : result.errorMessage ?? "Unable to stop timer.";
    } catch (error) {
      state.actionErrorMessage =
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

export function mountInjectedIssueControl(
  doc: Document,
  pageContext: SupportedGitHubIssueContext,
  runtimeClient = createRuntimeClient(),
): { destroy(): void; load(): Promise<void> } | null {
  const target = findGitHubIssueMountTarget(doc);

  if (!target || doc.getElementById("gitiempo-extension-root")) {
    return null;
  }

  const host = doc.createElement("div");

  host.id = "gitiempo-extension-root";
  host.className = "mb-4";
  target.prepend(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = doc.createElement("style");
  const root = doc.createElement("div");

  style.textContent = contentStyles;
  shadowRoot.append(style, root);

  const app = createInjectedIssueApp({
    pageContext,
    root,
    runtimeClient,
  });

  return {
    destroy() {
      app.destroy();
      host.remove();
    },
    load: app.load,
  };
}

if (typeof chrome !== "undefined") {
  const pageContext = resolveGitHubIssueContext(document, window.location.href);

  if (pageContext.kind === "supported") {
    const mountedApp = mountInjectedIssueControl(document, pageContext);

    if (mountedApp) {
      void mountedApp.load();
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if ((message as { type?: string }).type === "page-context/get") {
      sendResponse(
        resolveGitHubIssueContext(document, window.location.href) as PageContext,
      );
    }
  });
}
