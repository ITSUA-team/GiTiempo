import { deriveProfileInitials } from "@gitiempo/shared";

import { getExtensionConfig } from "@/lib/config";
import { escapeHtml } from "@/lib/html";
import type { PageContext, SupportedGitHubIssueContext } from "@/lib/github-context";
import type { RuntimeSnapshot, SnapshotUser } from "@/lib/runtime";
import { formatElapsedTime } from "@/lib/time";

/**
 * Everything the popup renders from. Owned and mutated by `createPopupApp` in
 * `main.ts`; this module only reads it. The interface lives here because it is
 * the render contract — the renderers are pure `(state) => string` and this is
 * their entire input.
 */
export interface PopupState {
  email: string;
  errorMessage: string | null;
  githubSignInEnabled: boolean;
  isAccountMenuOpen: boolean;
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
const popupGithubButtonClass = `${popupOAuthButtonBaseClass} bg-[#24292f] text-text-inverse`;
const popupGoogleMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45.12 24.5c0-1.56-0.14-3.06-0.4-4.5h-20.72v8.51h11.84c-0.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" /><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07h-7.35v5.7c3.62 7.19 11.06 12.12 19.66 12.12z" /><path fill="#FBBC05" d="M11.69 28.18c-0.44-1.32-0.69-2.73-0.69-4.18s0.25-2.86 0.69-4.18v-5.7h-7.35c-1.49 2.97-2.34 6.33-2.34 9.88s0.85 6.91 2.34 9.88l7.35-5.7z" /><path fill="#EA4335" d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31c-3.81-3.55-8.79-5.73-14.72-5.73-8.6 0-16.04 4.93-19.66 12.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" /></svg>`;
const popupGithubMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0c-4.42 0-8 3.58-8 8 0 3.54 2.29 6.53 5.47 7.59 0.4 0.07 0.55-0.17 0.55-0.38 0-0.19-0.01-0.82-0.01-1.49-2.01 0.37-2.53-0.49-2.69-0.94-0.09-0.23-0.48-0.94-0.82-1.13-0.28-0.15-0.68-0.52-0.01-0.53 0.63-0.01 1.08 0.58 1.23 0.82 0.72 1.21 1.87 0.87 2.33 0.66 0.07-0.52 0.28-0.87 0.51-1.07-1.78-0.2-3.64-0.89-3.64-3.95 0-0.87 0.31-1.59 0.82-2.15-0.08-0.2-0.36-1.02 0.08-2.12 0 0 0.67-0.21 2.2 0.82 0.64-0.18 1.32-0.27 2-0.27 0.68 0 1.36 0.09 2 0.27 1.53-1.04 2.2-0.82 2.2-0.82 0.44 1.1 0.16 1.92 0.08 2.12 0.51 0.56 0.82 1.27 0.82 2.15 0 3.07-1.87 3.75-3.65 3.95 0.29 0.25 0.54 0.73 0.54 1.48 0 1.07-0.01 1.93-0.01 2.2 0 0.21 0.15 0.46 0.55 0.38a8.013 8.013 0 0 0 5.45-7.59c0-4.42-3.58-8-8-8z" /></svg>`;
const popupHomeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10.5 9-7 9 7" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /><path d="M9.5 21v-6a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6" /></svg>`;
const popupProfileIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>`;
const popupSignOutIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>`;
const popupMenuItemClass =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

function renderAuthDivider(): string {
  return `
    <div class="flex w-full items-center gap-3" aria-hidden="true">
      <span class="bg-divider h-px flex-1"></span>
      <span class="text-text-muted text-xs font-medium">or</span>
      <span class="bg-divider h-px flex-1"></span>
    </div>
  `;
}

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

function renderUserAvatar(user: SnapshotUser, isMenuOpen: boolean): string {
  // Expanded state swaps the tint for the brand fill, so the trigger reads as
  // held open rather than merely hovered.
  const stateClass = isMenuOpen
    ? "bg-brand text-text-inverse"
    : "bg-accent-tint text-brand";

  return `<button data-action="toggle-account-menu" data-testid="popup-user-avatar" type="button" aria-expanded="${isMenuOpen ? "true" : "false"}" aria-label="Open account menu for ${escapeHtml(user.displayName ?? user.email)}" title="${escapeHtml(user.displayName ?? user.email)}" class="${stateClass} flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">${escapeHtml(getUserInitials(user))}</button>`;
}

/**
 * Warns that signing out leaves the timer running. Deliberately a sentence and
 * not a second clock: the popup already shows the elapsed value, and repeating it
 * inside a panel that sits directly over it made the menu read as a second timer
 * rather than as a warning about the one already running.
 */
function renderAccountMenuTimerNotice(): string {
  return `
    <p class="bg-status-active-bg text-status-active-text m-0 rounded-sm px-2.5 py-2 text-[11px] font-semibold">Timer keeps running after sign out</p>
  `;
}

function renderAccountMenu(state: PopupState): string {
  const user = state.snapshot?.user;

  if (!user) {
    return "";
  }

  const timer = state.snapshot?.currentTimer ?? null;
  const displayName = user.displayName?.trim();

  return `
    <div data-region="account-menu" data-testid="popup-account-menu" role="menu" class="border-divider bg-surface-primary absolute right-0 top-9 z-10 flex w-[220px] flex-col gap-0.5 rounded-md border p-1.5 shadow-lg">
      <div class="flex flex-col gap-0.5 px-2.5 py-2">
        ${displayName ? `<p class="m-0 truncate text-[13px] font-semibold text-text-dark">${escapeHtml(displayName)}</p>` : ""}
        <p class="m-0 truncate text-xs text-text-muted">${escapeHtml(user.email)}</p>
      </div>
      ${timer ? renderAccountMenuTimerNotice() : ""}
      <div class="bg-divider my-0.5 h-px" aria-hidden="true"></div>
      <a href="${escapeHtml(config.userSpaProfileUrl)}" target="_blank" rel="noreferrer" role="menuitem" data-action="open-profile" class="${popupMenuItemClass} text-text-dark hover:bg-app-bg">${popupProfileIconSvg}Open profile</a>
      <button type="button" role="menuitem" data-action="sign-out" class="${popupMenuItemClass} text-destructive hover:bg-destructive/5" ${state.isSubmitting ? "disabled" : ""}>${popupSignOutIconSvg}Sign out</button>
    </div>
  `;
}

function renderBrandHeader(
  {
    authenticated = false,
    user = null,
  }: {
    authenticated?: boolean;
    user?: SnapshotUser | null;
  } = {},
  menu = "",
  isMenuOpen = false,
): string {
  const headerActions = authenticated
    ? `<div class="relative flex items-center gap-2">${renderHomeButton()}${user ? renderUserAvatar(user, isMenuOpen) : ""}${menu}</div>`
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

export function renderPopupBody(state: PopupState, nowMs: number): string {
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
        ${renderBrandHeader({ authenticated: true, user: state.snapshot.user }, state.isAccountMenuOpen ? renderAccountMenu(state) : "", state.isAccountMenuOpen)}
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
        ${renderBrandHeader({ authenticated: true, user: state.snapshot.user }, state.isAccountMenuOpen ? renderAccountMenu(state) : "", state.isAccountMenuOpen)}
        <div class="bg-app-bg flex flex-col items-center gap-3 rounded-lg p-5 text-center">
          <div class="bg-status-active-bg text-status-active-text flex items-center rounded-sm px-3 py-1 text-xs font-semibold">Running timer</div>
          <p data-elapsed class="m-0 text-2xl font-semibold text-brand">${formatElapsedTime(state.snapshot.currentTimer.startedAt, nowMs)}</p>
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
        ${renderBrandHeader({ authenticated: true, user: state.snapshot.user }, state.isAccountMenuOpen ? renderAccountMenu(state) : "", state.isAccountMenuOpen)}
        ${renderIssueCard(state.pageContext)}
        <div class="mt-auto flex flex-col gap-3">
          <button data-action="start-timer" class="${popupPrimaryButtonClass}">Start Timer</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="flex h-full flex-col gap-5">
      ${renderBrandHeader({ authenticated: true, user: state.snapshot.user }, state.isAccountMenuOpen ? renderAccountMenu(state) : "", state.isAccountMenuOpen)}
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
