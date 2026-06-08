## 1. Source Alignment

- [x] 1.1 Update `docs/ui/layout.md`, `docs/ui/pages-user.md`, `docs/ui/patterns.md`, and `docs/ui/accessibility.md` so timer shell chrome, popup-owned timer actions, avatar-side alignment, and user-web avatar-only identity text all match this change.
- [x] 1.2 Build a parity checklist from the approved `GITiempo.pen` user Dashboard, Time Entries, Profile, Projects, and profile-dropdown-open user-shell variants before editing frontend files.

## 2. Shared Header Support

- [x] 2.1 Update `packages/web-shared/src/components/WorkspaceHeader.vue` so consuming apps can hide closed-trigger identity text while keeping the avatar trigger, dropdown menu, keyboard behavior, and sign-out emission intact.
- [x] 2.2 Update `WorkspaceHeader` center-content layout support so user-web can align compact center content toward the avatar/profile side at content width while admin-web remains stable with no timer content.
- [x] 2.3 Update shared header tests to cover user-web avatar-only trigger behavior, admin-web visible identity/scope text behavior, profile dropdown behavior, and stable empty-center layout.

## 3. User-Web Timer Chrome

- [x] 3.1 Update `apps/user-web` shell composition to pass the required shared-header options for avatar-only user identity and avatar-side compact timer alignment.
- [x] 3.2 Update `apps/user-web/src/components/timer/TopBarTimer.vue` so the desktop compact surface opens the task-picker popup and no separate visible Start or Stop button renders in the top bar.
- [x] 3.3 Update the mobile timer strip so the `Task & timer` opener opens the task-picker popup and no separate visible Stop or Change task button renders in shell chrome.
- [x] 3.4 Update the task-picker popup flow so visible `Start timer`, `Stop timer`, and running-task change confirmation actions live inside the popup while reusing existing timer, task, and time-entry client behavior.
- [x] 3.5 Preserve elapsed timer display, loading, error, no-eligible-task, idle, running, running-entry reassignment, and new-task-created-inside-project behavior.

## 4. Tests And Visual Parity

- [x] 4.1 Update `TopBarTimer` tests to assert compact surface/opener behavior, popup-owned timer actions, and absence of shell-visible Start, Stop, and Change task action buttons.
- [x] 4.2 Update user shell tests to cover avatar-side timer alignment and avatar-only user-web profile trigger behavior.
- [x] 4.3 Verify dropdown-open user-shell variants against the approved `.pen` screens so the timer opener, elapsed status, and profile menu remain usable together.

## 5. Verification

- [x] 5.1 Run `pnpm --filter @gitiempo/web-shared lint`, `pnpm --filter @gitiempo/web-shared typecheck`, and `pnpm --filter @gitiempo/web-shared test`.
- [x] 5.2 Run `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, and `pnpm --filter user-web test`.
- [x] 5.3 Because `packages/web-shared` changes are in scope, run `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test`.
- [x] 5.4 Run the smallest practical browser or screenshot parity check for the affected user-web top bars at desktop and mobile widths. Verified in the Codex in-app browser at `http://localhost:5173/` with an active user session: desktop `1280x720` compact timer surface aligned next to the avatar-only profile trigger with timer actions only inside the popup, and mobile `390x844` `Task & timer` strip with metadata plus popup-owned `Stop timer`/`Change task` actions.
