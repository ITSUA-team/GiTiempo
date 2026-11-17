# Design

## Context

See `proposal.md` for motivation and scope. The read-only inventory below was established on revision `187946f3`; line numbers are discovery anchors and must be checked against the implementation revision.

Both SPAs use one root Toast and ConfirmDialog host. `packages/web-shared/src/feedback.ts` exposes explicit success/info/error emissions; `runWithFeedback` already makes `onSuccess` copy optional. Admin's `composables/feedback/useToasts.ts` wraps the same primitive, while User flows also call it directly. No global filter or replacement notification system is needed.

Follow `apps/user-web/AGENTS.md`, `apps/admin-web/AGENTS.md`, `packages/web-shared/AGENTS.md`, `docs/ui/INDEX.md`, and the relevant `patterns.md`, `pages-user.md`, `pages-admin.md`, `components.md`, and `accessibility.md` sections. The current `gitiempo-frontend-rules` skill's blanket mutation-success-toast rule conflicts with #513 and must be updated during implementation rather than silently followed or copied elsewhere.

The relevant `GITiempo.pen` top-level frames were identified through read-only structure/text inspection: User Dashboard `qAq9X`, Projects `Z0XM0S`, Time Entries `U1DtrB`, timer picker `zETXA`, Profile `b9mwO`; Admin Projects `aEsu1`, Add Project `P7tkrI`, Members `l2wnhv`, Reports `o5LW1`, Invoices `EGHj0`, Settings `pqByk`; shared patterns `lmYlu` and login `ZVw4a`. Persistent connection and saved/unsaved states exist in those references. This is not a rendered design-parity review: implementation must inspect the actual approved frames and derive a concrete checklist for changed states before code edits.

## Goals / Non-Goals

**Goals:** Remove selected emissions with small diffs; retain functional callbacks, request ownership, state transitions, essential instructions, and error observability. Establish one notification policy and explicit exceptions with consumer-level regression evidence.

**Non-Goals:** No new feedback abstraction, dependency, notification preference UI, generic toast deduplication, cross-origin flash-message transport, auth/permission/API redesign, report export redesign, invoice calculations, or global query/cache changes. Backend work and #498/#499 remain separate. Do not turn this into a general component extraction/refactor.

## Decisions

### 1. Remove emissions at the owning action

Delete only the selected success/info call or optional success-copy configuration. Keep the mutation, success handler, form reset, close/collapse, authoritative reconciliation, and navigation. For `ProfileView`, omit `runWithFeedback.onSuccess` while retaining the runner and its error path.

`InvoiceDetailView` success callbacks also clear saved title/notes dirty flags or navigate after deletion; retain those effects. Query-layer `onSuccess` handlers are cache owners, not notification noise. No extra read is introduced to compensate for a removed message, and existing necessary reads are not removed by this change.

Alternative rejected: making `showSuccessToast`/`showInfoToast` no-ops or filtering severities at the root host. Meaningful exceptions use those primitives too, and global suppression would conceal partial failures and invisible outcomes. Root overlay placement, count, dismiss rules, and logger behavior stay intact.

On 2026-11-06 the owner additionally requested removing the duplicated error toast for invitation email/password authentication failures observed during task5.8. This narrow pre-acceptance branch retains the existing inline error, diagnostic context/error logging, token, busy reset and retry. Other provider, acceptance and accepted-but-session-failed error feedback stays unchanged. The authorization supersedes the original blanket error-toast preservation only for this owning branch; no global error suppression or layout change is introduced.

### 2. Use this explicit remove/retain inventory

Each row identifies a current message family and the concrete reason. The implementation pass must mark every inventoried site as removed or retained, attach its final test/evidence, and account for any newly discovered site before completion. A missing optional message on a later checkout is recorded as already absent, not recreated.

#### User SPA: remove

Paths below are relative to `apps/user-web/src/`.

| ID | Source / discovery anchor | Current message | Decision and reason |
|---|---|---|---|
| U1 | `composables/time-entries/useTimeEntryMutations.ts:99,105,146` | Time entry updated / created / deleted | REMOVE: existing list reconciliation shows the result. |
| U2 | `composables/projects/useProjectTaskMutations.ts:71,82,121` | Task updated / created / deleted | REMOVE: task rows change through the existing saved/deleted callbacks. |
| U3 | `composables/time-entries/useTimeEntryDialogTaskCreation.ts:110`; `composables/timer/useTopBarTaskCreation.ts:65` | Task created / ready to use | REMOVE: the created task becomes the selected option. |
| U4 | `composables/timer/useTopBarTimerActions.ts:85,150`; `useTopBarTimerSelectionUpdate.ts:154` | Timer stopped / started / updated | REMOVE: top-bar timer and selected context change visibly. |
| U5 | `composables/time-entries/useTimeEntryDirectTimerActions.ts:88,129` | Timer started / stopped | REMOVE: used by Dashboard and Time Entries; retain reconciliation in both consumers. |
| U6 | `composables/projects/useProjectTaskDirectTimerActions.ts:84,138` | Timer started / stopped | REMOVE: task row and shared timer state communicate completion. |
| U7 | `views/ProfileView.vue:81` | Profile saved | REMOVE: authoritative identity is rendered; keep error handling. |
| U8 | `composables/profile/useProfileGithubConnection.ts:129` | GitHub disconnected | REMOVE: refreshed card shows disconnected; retain confirmation and revocation exception. |
| U9 | `composables/profile/useProfileGithubCallbackQuery.ts:40` | GitHub connected | REMOVE: normal status loading owns the card; preserve URL cleanup even if the read fails. |
| U10 | `views/ForgotPasswordView.vue:66` | Check your email | REMOVE toast: preserve the persistent neutral email-instruction panel. |
| U11 | `views/InvitePasswordSetupView.vue:214` | Password saved / return to invite | REMOVE toast: preserve the persistent success panel and contextual continuation action. |
| U12 | `views/InviteAcceptView.vue:241,278` | Workspace access already exists / Invitation accepted | REMOVE toast: preserve terminal instructions, navigation, and accepted-but-session-failed recovery. |
| U13 | `views/InviteAcceptView.vue:473` | Workspace access created. Redirecting to dashboard. | REMOVE transient inline success only: preserve `isRedirecting`, busy/disabled controls, and any accessible completion semantics. |
| U14 | `composables/timer/useTopBarTimerActions.ts:102` | Timer already stopped / status refreshed | REMOVE: authoritative idle state confirms idempotent recovery; keep refresh and successful return value. |
| U15 (owner follow-up) | `views/InviteAcceptView.vue`, `handleEmailAccept` catch | Could not sign in (duplicate error toast) | REMOVE only pre-acceptance email/password authentication toast: owner requested on 2026-11-06; inline error, diagnostics and retry remain. |

#### Admin SPA: remove

Paths below are relative to `apps/admin-web/src/`.

| ID | Source / discovery anchor | Current message | Decision and reason |
|---|---|---|---|
| A1 | `views/AddProjectView.vue:316` | Project created successfully | REMOVE: successful manual/import flow navigates to the updated list. |
| A2 | `composables/projects/useProjectEditActions.ts:95` | Project updated | REMOVE: row/summary change; preserve follow-up backfill dialog. |
| A3 | `composables/projects/useProjectArchiveActions.ts:46,78` | Project archived / now active | REMOVE ordinary branch: activity state changes. Retain automatic-rename explanation below. |
| A4 | `composables/members/useMemberAssignmentActions.ts:68` | Project assignments saved | REMOVE: assignments and counts update; preserve refresh/collapse. |
| A5 | `composables/members/useMemberPermissionActions.ts:43` | Invoice view permission updated | REMOVE: persisted permission control/list represents the result. No permission semantics change. |
| A6 | `composables/members/useMemberRemovalAction.ts:50` | Member removed | REMOVE: member disappears; preserve destructive confirmation. |
| A7 | `components/forms/MemberInviteDialog.vue:55` | Invitation sent | REMOVE: created pending row/counter and dialog close confirm acceptance of the request. A toast is not proof of delivery. |
| A8 | `composables/members/usePendingInviteActions.ts:78` | Invitation canceled | REMOVE: pending row disappears; preserve confirmation and refresh. |
| A9 | `views/InvoicesView.vue:268`; `views/InvoiceDetailView.vue:75,90` | Invoice created / updated / deleted | REMOVE: row/detail/navigation shows outcome. Keep dirty flags and navigation callbacks. |
| A10 | `views/ReportsView.vue:120,125,130,135` | Saved / renamed / report deleted | REMOVE: saved-report bar, selection, and dirty baseline update. |
| A11 | `views/SettingsView.vue:193` | Settings saved | REMOVE: authoritative values and workspace label are applied. |
| A12 | `composables/settings/useAdminWorkspaceGitHubOrganizations.ts:264,284` | GitHub organization added / removed | REMOVE: rendered allow-list changes; preserve selection/recovery cleanup. |
| A13 | `composables/settings/useAdminWorkspaceGitHubInstallations.ts:181` | GitHub App access confirmed | REMOVE for automatic, manual, and callback completion when normal authoritative card refresh communicates result; failures remain visible. |
| A14 | `views/ForgotPasswordView.vue:70` | Check your email | REMOVE toast: retain account-safe persistent panel and instructions. |

#### Both SPAs: retain

| ID | Source / flow | Message or surface | Reason |
|---|---|---|---|
| K1 | User `AppShell.vue:68`, `ForbiddenView.vue:66`; Admin `AdminAppShell.vue:129`, `ForbiddenView.vue:85` | Workspace active but list could not be refreshed | KEEP: partial failure and potentially stale membership information. |
| K2 | User direct timer helpers `:121` / `:130`; top-bar actions `:95` | Running timer changed; retry / stop current timer first | KEEP: requested action did not execute and requires recovery. |
| K3 | User `useProjectTaskBackfillFlow.ts:90`; Admin `useProjectBillableBackfillFlow.ts:102` | Existing records updated, with returned counts | KEEP: changes extend beyond records shown on Projects. |
| K4 | Admin `useProjectArchiveActions.ts:78`, renamed branch | Active under another name because original name is occupied | KEEP: explains an unexpected automatic consequence. |
| K5 | Admin `usePendingInviteActions.ts:51` | Invitation resent | KEEP: resend has no equivalent visible list change; no delivery/read guarantee. |
| K6 | Both `ResetPasswordView.vue`, User `:151`, Admin `:161` | Password updated; sign in with new password | KEEP: credential change is invisible and the flow navigates to login. |
| K7 | Admin `ReportsView.vue:265` | Export result / filename | KEEP one acknowledgement explicitly stating export ready or download started; never claim disk completion. |
| K8 | Profile unlink, provider callbacks, all request-error owners | Revocation warning, safe callback errors, read/write failures | KEEP: error details, logging, manual-dismiss behavior, retries and drafts remain unchanged. |
| K9 | Persistent auth and access surfaces | Check-email, password-setup and membership terminal panels; accepted-but-session-failed recovery; GitHub prerequisites | KEEP: required next steps and access/state information. |
| K10 | Page status and action surfaces | Connected/invoice-status badges; Saved/Unsaved indicators; empty/loading/busy states; validation; confirms | KEEP: functional UI, not transient notifications. |

Current `MemberEditForm` emits intents and contains no role-update success toast on this revision. Its older spec still requires one; update the requirement without inventing a new role-edit implementation. User list/query owners already avoid ordinary refresh-success notifications; protect that behavior rather than introducing replacement work.

### 3. Separate callback handling from notification selection

`useProfileGithubCallbackQuery` currently returns early when no toast descriptor exists, so simply deleting its success descriptor would also leave `github`/`code` in the URL. Recognize supported outcomes separately: consume and clean up supported success/error query keys with `router.replace`; emit only the error toast. Preserve current handling of unknown/missing safe error codes and unsupported callback-like values.

On success, the existing connection-status request remains authoritative. If it fails, consume the success callback anyway and render the request-error card with retry/error feedback. Do not show a success toast, invent connected/disconnected data, or add a second read. Disconnect still refetches normally and retains the provider-revocation warning when local unlink succeeded but remote revocation is unconfirmed.

Installation `completeSetup` is reached by automatic discovery, explicit setup, and callback handling. Remove its redundant success emission while retaining the existing verification/refetch, loading guards, organization scope checks, and callback cleanup. The existing refreshed card is the manual completion result. Verify that follow-up read failure reaches the existing error/retry surface; if it does not, connect that existing query error to the card rather than reporting confirmed access or making another request.

Alternative rejected: suppressing only automatic calls with a new intent flag. All successful paths already have an authoritative card, so an additional public helper option is unnecessary. Showing success on a failed follow-up read would also contradict the chosen outcome policy.

### 4. Preserve instructions and the existing reset boundary

Forgot-password and invite-password-setup success toasts duplicate persistent panels; remove only the duplicate emission. Keep neutral known/unknown-account wording, invite context, terminal and partial-success recovery panels, and Firebase failure logging. Invite acceptance retains busy/disabled controls when its layout-shifting redirect notice is removed.

Reset-password completion keeps its current success toast and login destination. An external-origin redirect can unload the toast; this is an existing limitation to record in acceptance, not a new persistence guarantee. Do not add query flash messages, session storage, delay the redirect, or redesign the login page in #513.

### 5. Keep accessibility and layout verification proportional

PrimeVue v4 Toast and Message use alert semantics; severity alone does not make routine success announcements polite. WCAG 4.1.3 does not require a toast for every mutation, but a visually obvious update is not automatically accessible. Preserve focus restoration after modal close, useful busy semantics, field associations, and necessary status exposure. Never put the live timer's per-second elapsed text in an assertive region.

Do not replace every removed message with a generic live region. If a checked flow needs an announcement to communicate completion, use the smallest flow-specific accessible state treatment consistent with the existing docs. Leave error live regions and confirmation infrastructure intact.

Sources checked during research on 2026-11-04: [PrimeVue v4 Toast](https://v4.primevue.org/toast/#accessibility), [PrimeVue v4 Message](https://v4.primevue.org/message#accessibility), [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [WAI-ARIA alert pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/).

### 6. Resolve specification precedence explicitly

The notification policy belongs to `frontend-notifications`; existing page capabilities retain their complete requirement blocks with only their conflicting notification clauses changed. Do not rewrite unrelated behavior to shrink a delta. Existing `frontend-overlays` root-host ownership and shared presentation remain valid.

| Predecessor | Base used by this proposal | Integration rule |
|---|---|---|
| `improve-spa-data-refresh` | Its complete MODIFIED `Existing Page Behavior Is Preserved During Query Migration` | Preserve its content-retention changes. Synchronize that base before this change's later notification-policy replacement; do not let a late #496 sync restore blanket notification preservation. |
| `add-password-recovery` | Pending `frontend-password-recovery`, two notification-related requirements | Synchronize the capability first; then apply the included MODIFIED deltas. Reset-completion behavior remains intact. |
| `add-admin-invoices-ui` | Pending `admin-invoices-page`, create/detail/delete/loading-feedback requirements | Synchronize the capability first; then apply the included MODIFIED deltas without changing role or domain behavior. |
| `add-pm-invoice-view-permission` | Pending PM permission-toggle requirement in `admin-members-page` | Synchronize that requirement first; only its success-toast clauses change here. Keep its authorization fixes and unfinished acceptance separate. |

These bases do not all exist in main specs yet. Strict change validation checks artifact structure; it is not evidence that these MODIFIED blocks can already synchronize onto the current main specs. Before apply, compare with the current main/source requirements and rebase only this change's deltas if predecessors evolved. Before synchronization, require the named bases to exist. Use the normal source-change sync process only when its evidence is sufficient; never mark incomplete tasks complete or archive an unfinished predecessor merely to satisfy ordering. Other change directories stay untouched by this proposal.

Documentation during implementation must update `docs/ui/patterns.md`, affected notification clauses in `pages-user.md` and `pages-admin.md`, and the notification clauses in `.agents/skills/gitiempo-frontend-rules/SKILL.md`. Keep canonical rules in the UI docs and have project guidance follow them, including the accepted quiet-success policy, retained errors/exceptions, and root-host ownership.

## Planned File Areas

- **user-web:** Inventory U1-U14 owners, auth/Profile/timer consumers, and corresponding feature/view specs. `useTimeEntryDirectTimerActions` must be checked through both Dashboard and Time Entries. Keep route and feature ownership app-local.
- **admin-web:** Inventory A1-A14 owners, `useToasts` call sites, and corresponding project/member/settings/report/invoice/auth view specs. Keep table/form leaves presentational and preserve invoice dirty-state/navigation behavior.
- **shared frontend:** Audit `packages/web-shared/src/feedback.ts`, `feedback.spec.ts`, and shared error/auth surfaces. The preferred implementation leaves the production helper API unchanged; test or helper changes, if required, must cover both SPAs. Separately on 2026-11-06, the owner approved repairing the existing destructive-confirmation focus policy discovered in task 5.4: set PrimeVue `defaultFocus: "reject"`, cover it with a real component regression and retest both SPAs. This changes only initial focus to the safe Cancel action, preserving accepted actions and request ownership. `packages/web-config` requires no theme/token changes.
- **docs/specs:** This change's capability deltas and inventory, UI notification docs, and project frontend guidance. Predecessor sources are integration dependencies, not permission to modify their unrelated tasks or implementations.
- **API/shared contracts:** No changes. Existing successful and failed responses remain authoritative; no additional endpoint or request replaces a notification.

## Verification Strategy

Before production edits, add focused failing quiet-success regressions using existing fixtures while retaining failure baselines. Assert visible authoritative state plus no redundant success/info emission, required request counts, closed/open dialog state, navigation, and retained exceptions. Do not replace behavioral checks with only `not.toHaveBeenCalled`.

User coverage: task CRUD and selection, manual time-entry CRUD, top-bar/direct timer actions and changed/already-stopped recovery, both Dashboard and Time Entries direct-action consumers, profile save/disconnect/callback cleanup (success/error/unknown code/read failure), forgot/setup/reset password, invite acceptance and accepted-but-login-failed recovery.

Admin coverage: project create/edit/archive/unarchive including rename, assignments/permission/removal, create/resend/cancel invite, invoice create/edit/status/delete with dirty flags and conflicts, preset create/save/rename/delete without replacement collection reads, settings/organizations, automatic/manual/callback App setup including follow-up read failure, both password flows, and export generation/failure with truthful acknowledgement.

Run focused suites first, then root `pnpm typecheck`, `pnpm lint`, `pnpm test`, confirming both SPA suites and any changed shared helper tests execute. No API e2e is introduced for this frontend-only change. Current CI uses `.github/workflows/ci.yml` and its affected-package workspace-check action; CI does not replace local evidence.

Real-page desktop and below-640px acceptance must cover representative User and Admin success, failure/retry, background refresh and retained exceptions. Include keyboard checks for completion/focus and inspection of rendered accessibility semantics, and preserve layout across inline-notice removal. The owner removed native screen-reader testing from this change's acceptance scope on 2026-11-06; it is neither a blocking task nor a claimed pass. On the same date, the owner narrowed final task 5.5 from full approved-frame parity to representative desktop/mobile layout stability after notification removal: no reserved blank notice space, broken fields/actions or horizontal overflow introduced by this change. Existing real-page evidence can establish this scope; full pixel parity and unavailable auth-state frame comparisons are excluded, not passed. Earlier approved-frame preflight remains recorded; reuse and PrimeVue-exception findings remain applicable. Record revision, dirty state, environment/page, scenario, expected/actual, PASS/FAIL/BLOCKED, evidence link or limitation, and request comparison. Mocked tests and structure inspection alone are not browser or visual acceptance.

## Risks / Trade-offs

- Removing a callback instead of a message can break dirty flags, redirect, query cleanup, or refresh -> target emissions/configuration and protect assembled flow behavior.
- A broad severity filter can hide required exception guidance -> retain explicit helper behavior and remove only inventoried calls.
- A late predecessor spec sync can restore old rules -> use the dependency order above and review the effective merged requirements before sync.
- Existing positive-toast assertions can encourage weakening tests -> replace them with visible-result and negative-notification assertions while retaining errors/recovery/request budgets.
- Hard navigation can unload the retained reset toast -> record the existing limitation; no new cross-origin persistence promise.
- Quiet visual outcomes may lose useful assistive feedback -> check keyboard/focus/status semantics on real consuming flows rather than adding replacement alerts everywhere.

## Migration Plan

1. Recheck the inventory and predecessor requirement versions against the implementation revision; derive approved-frame parity checklists and add focused regressions before code edits.
2. Remove selected emissions in bounded User and Admin slices; preserve functional callbacks and verify each slice with its existing success/failure fixtures.
3. Align notification docs/project guidance and complete both SPA automated checks plus real-page acceptance with retained exceptions and request budgets.
4. Rebase and synchronize this change only after its predecessor bases exist; review the effective combined specs so no old blanket success rule is restored. Archive only after its own implementation and acceptance tasks are complete.
5. Roll back by reverting this change's selected call-site, test, and policy edits together. There is no data or contract migration.

## Implementation Preflight — 2026-11-05

- Implementation baseline: `187946f3`, with only this untracked change directory present at entry. Independent source comparison found no requirement drift requiring a rebase. Predecessor source revisions: refresh `fb917285`, password recovery `8434096e`, invoices `f726e7d4`, PM permission `940f543a`. The synchronization order and three missing-main-base gates in decision 6 still apply; no predecessor tasks or main specs are changed here.
- Production success/info search reconfirmed U1-U14, A1-A14, and K1-K10 without additional message families. Persistent badge severities and query/cache `onSuccess` handlers are functional state owners. Final implementation evidence is recorded separately from real-browser acceptance.
- Request baseline: task/time-entry actions retain their single existing mutation and saved/deleted callbacks (plus existing GitHub issue materialization when applicable); direct stops retain their authoritative guard read and conditional exact-timer stop; invoice mutations retain mutation-owned invalidation and view callbacks; settings retain response application and shell-label reconciliation; organization and installation mutations retain their existing explicit refetch as well as query invalidation; saved-report view handlers add no collection read. No API, shared-contract, permission, dependency, or request-budget expansion is needed.
- Live Pencil inspection confirmed the approved User and Admin frames listed above. Parity checklist: preserve desktop rows/mobile cards, field order, task/timer actions and dialog lifecycle; preserve connected/disconnected/request-error card distinctions, saved/unsaved indicators, counters, validation/retry, persistent auth instructions, and busy/disabled guards; preserve spacing/radii/typography and existing below-640px branches. Only the transient invitation-redirect success notice is removed. No new markup, shared component, or PrimeVue workaround is planned.
- Shared feedback inspection confirms optional `runWithFeedback.onSuccess` already supports quiet execution. An explicit regression now verifies the result is returned, the action runs once, and no success/error is emitted on that successful path; the existing error/rethrow/logger and meaningful success/info tests remain. The production helper API is unchanged.
