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
  doc?: Document;
  matchMediaFn?: typeof window.matchMedia;
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
  theme: "dark" | "light";
}

const injectedActionButtonClass =
  "cursor-pointer rounded-sm px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const injectedTextActionClass =
  "text-brand cursor-pointer rounded-sm bg-transparent text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

function createFallbackMediaQuery(): MediaQueryList {
  return {
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => true,
    matches: false,
    media: "",
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  };
}

function resolveGitHubColorMode(
  doc: Document,
  matchMediaFn: InjectedAppOptions["matchMediaFn"],
): "dark" | "light" {
  const colorMode = doc.documentElement.getAttribute("data-color-mode");

  if (colorMode === "dark") {
    return "dark";
  }

  if (colorMode === "light") {
    return "light";
  }

  return matchMediaFn?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function renderInjectedBody(
  pageContext: SupportedGitHubIssueContext,
  state: InjectedState,
  nowMs: number,
): string {
  const headlineTextClass = state.theme === "dark" ? "text-text-inverse" : "text-text-dark";
  const mutedTextClass = state.theme === "dark" ? "text-text-inverse-muted" : "text-text-muted";

  if (state.isLoading || state.snapshot === null) {
    return `
      <div>
        <p class="m-0 text-xs font-medium ${mutedTextClass}">${escapeHtml(pageContext.githubRepo)} · #${pageContext.issueNumber}</p>
        <p class="m-0 mt-1 text-lg font-semibold ${headlineTextClass}">${escapeHtml(pageContext.issueTitle)}</p>
      </div>
      <p class="m-0 text-sm ${mutedTextClass}">Checking your GiTiempo timer state.</p>
    `;
  }

  if (state.actionErrorMessage || state.snapshot.errorMessage) {
    return `
      <div>
        <p class="m-0 text-xs font-medium ${mutedTextClass}">${escapeHtml(pageContext.githubRepo)} · #${pageContext.issueNumber}</p>
        <p class="m-0 mt-1 text-lg font-semibold ${headlineTextClass}">${escapeHtml(pageContext.issueTitle)}</p>
      </div>
      <div class="flex items-center justify-between gap-3">
        <p class="m-0 text-sm ${mutedTextClass}">${escapeHtml(state.actionErrorMessage ?? state.snapshot.errorMessage ?? "Unable to update timer state.")}</p>
        <button type="button" data-action="retry" class="${injectedTextActionClass}">Retry</button>
      </div>
    `;
  }

  if (!state.snapshot.authenticated) {
    return `
      <div>
        <p class="m-0 text-xs font-medium ${mutedTextClass}">${escapeHtml(pageContext.githubRepo)} · #${pageContext.issueNumber}</p>
        <p class="m-0 mt-1 text-lg font-semibold ${headlineTextClass}">${escapeHtml(pageContext.issueTitle)}</p>
      </div>
      <div class="flex items-center justify-between gap-3">
        <p class="m-0 text-sm ${mutedTextClass}">Sign in to GiTiempo to start tracking this issue.</p>
        <button type="button" data-action="open-extension" class="bg-brand text-text-inverse ${injectedActionButtonClass}">Open extension</button>
      </div>
    `;
  }

  const currentTimer = state.snapshot.currentTimer;
  const isCurrentIssueTimer = currentTimer
    ? currentTimer.githubIssue?.githubRepo === pageContext.githubRepo
      && currentTimer.githubIssue.issueNumber === pageContext.issueNumber
    : false;

  if (currentTimer && isCurrentIssueTimer) {
    return `
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="m-0 text-xs font-medium ${mutedTextClass}">${escapeHtml(pageContext.githubRepo)} · #${pageContext.issueNumber}</p>
          <p class="m-0 mt-1 text-lg font-semibold ${headlineTextClass}">${escapeHtml(pageContext.issueTitle)}</p>
        </div>
        <span class="bg-status-active-bg text-status-active-text rounded-sm px-2 py-1 text-xs font-semibold">Running</span>
      </div>
      <div class="flex items-center justify-between gap-3">
        <p class="m-0 text-lg font-semibold text-brand">${formatElapsedTime(currentTimer.startedAt, nowMs)}</p>
        <button type="button" data-action="stop-timer" class="bg-destructive text-text-inverse ${injectedActionButtonClass}">Stop Timer</button>
      </div>
    `;
  }

  if (currentTimer) {
    return `
      <div>
        <p class="m-0 text-xs font-medium ${mutedTextClass}">${escapeHtml(pageContext.githubRepo)} · #${pageContext.issueNumber}</p>
        <p class="m-0 mt-1 text-lg font-semibold ${headlineTextClass}">${escapeHtml(pageContext.issueTitle)}</p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-1">
          <p class="m-0 text-sm font-semibold ${headlineTextClass}">Timer running elsewhere</p>
          <p class="m-0 text-sm ${mutedTextClass}">${escapeHtml(currentTimer.task.title)} · ${escapeHtml(currentTimer.project.name)}</p>
          <p class="m-0 text-xs ${mutedTextClass}">${formatElapsedTime(currentTimer.startedAt, nowMs)}</p>
        </div>
        <button type="button" data-action="open-extension" class="bg-brand text-text-inverse ${injectedActionButtonClass}">Open extension</button>
      </div>
    `;
  }

  return `
    <div>
      <p class="m-0 text-xs font-medium ${mutedTextClass}">${escapeHtml(pageContext.githubRepo)} · #${pageContext.issueNumber}</p>
      <p class="m-0 mt-1 text-lg font-semibold ${headlineTextClass}">${escapeHtml(pageContext.issueTitle)}</p>
    </div>
    <div class="flex items-center justify-between gap-3">
      <p class="m-0 text-sm ${mutedTextClass}">Start tracking directly from this GitHub issue.</p>
      <button type="button" data-action="start-timer" class="bg-brand text-text-inverse ${injectedActionButtonClass}">Start Timer</button>
    </div>
  `;
}

export function createInjectedIssueApp({
  clearIntervalFn = clearInterval,
  doc,
  matchMediaFn,
  now = () => Date.now(),
  pageContext,
  root,
  runtimeClient = createRuntimeClient(),
  setIntervalFn = setInterval,
}: InjectedAppOptions) {
  const ownerDocument = doc ?? root.ownerDocument;
  const resolveMatchMedia =
    matchMediaFn ??
    ((query: string) =>
      ownerDocument.defaultView?.matchMedia(query) ?? createFallbackMediaQuery());
  const state: InjectedState = {
    actionErrorMessage: null,
    isLoading: true,
    snapshot: null,
    theme: "light",
  };

  let intervalHandle: ReturnType<typeof setInterval> | null = null;
  const themeMediaQuery = resolveMatchMedia("(prefers-color-scheme: dark)");
  const unsubscribe = runtimeClient.onSnapshotUpdated((snapshot) => {
    state.snapshot = snapshot;
    render();
  });

  function syncTheme(): void {
    state.theme = resolveGitHubColorMode(ownerDocument, resolveMatchMedia);
  }

  const handleThemeChange = () => {
    syncTheme();
    render();
  };

  const themeObserver = new MutationObserver(() => {
    handleThemeChange();
  });

  themeObserver.observe(ownerDocument.documentElement, {
    attributeFilter: ["data-color-mode", "data-dark-theme", "data-light-theme"],
    attributes: true,
  });

  themeMediaQuery.addEventListener?.("change", handleThemeChange);

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
    syncTheme();
    root.innerHTML = `
      <div class="mx-auto w-full max-w-[1280px] pt-4">
        <section class="flex w-full flex-col gap-4 p-5">
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
      themeObserver.disconnect();
      themeMediaQuery.removeEventListener?.("change", handleThemeChange);

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
    doc,
    matchMediaFn: (query: string) =>
      typeof doc.defaultView?.matchMedia === "function"
        ? doc.defaultView.matchMedia(query)
        : createFallbackMediaQuery(),
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

export function bootstrapInjectedIssueControl(
  doc: Document,
  win: Window,
  runtimeClient = createRuntimeClient(),
): { destroy(): void } {
  let mountedApp: { destroy(): void; load(): Promise<void> } | null = null;
  let currentUrl = "";

  function syncToLocation(): void {
    const nextUrl = win.location.href;

    if (nextUrl === currentUrl && mountedApp) {
      return;
    }

    currentUrl = nextUrl;
    mountedApp?.destroy();
    mountedApp = null;

    const pageContext = resolveGitHubIssueContext(doc, nextUrl);

    if (pageContext.kind !== "supported") {
      return;
    }

    mountedApp = mountInjectedIssueControl(doc, pageContext, runtimeClient);

    if (mountedApp) {
      void mountedApp.load();
    }
  }

  const observer = new MutationObserver(() => {
    syncToLocation();
  });

  syncToLocation();
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  win.addEventListener("popstate", syncToLocation);
  win.addEventListener("hashchange", syncToLocation);

  return {
    destroy() {
      observer.disconnect();
      win.removeEventListener("popstate", syncToLocation);
      win.removeEventListener("hashchange", syncToLocation);
      mountedApp?.destroy();
      mountedApp = null;
    },
  };
}

if (typeof chrome !== "undefined") {
  bootstrapInjectedIssueControl(document, window);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if ((message as { type?: string }).type === "page-context/get") {
      sendResponse(
        resolveGitHubIssueContext(document, window.location.href) as PageContext,
      );
    }
  });
}
