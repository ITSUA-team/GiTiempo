## Context

Issue: [#455](https://github.com/ITSUA-team/GiTiempo/issues/455). The extension stores its token pair in `chrome.storage.local`; background snapshots derive workspace context from the access token. The backend already lists memberships and switches workspace by rotating that session. Refresh and sign-out already have concurrency protection, and snapshots reject stale account/workspace results.

The current timer is global to the user: both current-timer lookup and conditional Stop work across workspaces. This is covered by API tests. A workspace switch changes where the next timer starts, never the workspace of an existing entry.

The approved design was inspected through Pencil: `GITiempo.pen`, section `WQ8lF` (Extension · Account and sign-out), reusable menu `w6xWc`, running popup `cvEiV`, and no-display-name popup `V6FKLq`. Both popup frames show Workspace immediately above Open profile without clipping. These frames cover the normal closed selector, not every error/loading state.

At proposal time, `docs/ui/chrome-ext.md` and the canonical account-menu requirement restricted the menu to two actions. This change updates the UI documentation and supplies the delta-spec replacing that restriction; main-spec synchronization remains assigned to the user. The completed `external-github-extension-tracking` change remains historical context.

## Goals / Non-Goals

**Goals:** Let the member choose and see the extension's tracking workspace; preserve valid authentication and timer behavior through switching; deliver verified design parity, updated documentation, and manual QA evidence.

**Non-Goals:** Change login's initial workspace rule, synchronize web-app sessions, introduce backend contracts or dependencies, migrate time entries, stop timers automatically, or modify the user/admin SPA.

## Decisions

### 1. Reuse the existing API and shared schemas

Load `GET /users/me/workspaces` for the signed-in menu and use `POST /auth/switch-workspace` with the current refresh token and target workspace ID. All active membership roles are eligible; the server authorizes the switch. Derive the selected workspace from the accepted session, not a second persisted preference. This avoids a preference/token mismatch and requires no API deployment coordination.

### 2. Keep session mutations under background ownership

Expose typed membership/switch runtime messages; popup and content scripts never receive refresh tokens. Serialize refresh and switch rotations through the existing API/session owner. Read the latest token at dispatch, and gate writes with a session generation so sign-out or a newer login invalidates late results. If a successful switch returns a rotated pair after sign-out, revoke that late pair with bounded best-effort cleanup without delaying local sign-out or touching a newer login. Duplicate selections are coalesced/disabled; choosing the current workspace is a no-op.

Coordinate timer mutations with switching: an already accepted Start/Stop settles before the switch proceeds; new timer mutations are blocked while switching. Bind preflight and Start requests to the session/workspace generation so a stale control cannot silently start in another workspace. Reconcile authoritative state before re-enabling actions. Merely discarding a late response is insufficient if a stale Start has already reached the server.

On success persist the complete token pair before publishing the new workspace, invalidate cached memberships/capabilities/snapshots, and notify all extension surfaces. On 403 retain the valid current session, refresh membership options, and show a retryable explanation. Terminal authentication failure uses existing signed-out recovery. A network failure can have an ambiguous rotation outcome: do not blindly replay a switch with an old refresh token; reconcile through the existing authenticated recovery path or require sign-in if that session is no longer valid. Never claim success until a valid target session is stored.

### 3. Place the selector in the existing account dropdown

Preserve identity, optional running-timer notice, divider, Workspace label/control, Open profile, then Sign out. Use the existing extension Tailwind/tokens approach and accessible native select semantics unless implementation evidence shows a documented need otherwise. Do not add Vue or PrimeVue.

Design defaults for states not drawn in `.pen`: show the current workspace in a disabled selector for a single membership; show a disabled loading control while loading; show compact retry feedback if membership loading fails. This keeps the destination visible and the layout stable. With multiple memberships enable selection. During switching disable the selector and tracking mutations, keep sign-out available, and announce progress/errors accessibly. Keep the menu open during selection and timer ticks; close on Escape, outside interaction, Open profile, or Sign out. Preserve focus during rerenders and distinguish dismissing the select's options from dismissing the whole menu. User-accepted platform exception (2026-10-16): after the first Escape closes native options, a browser host that intercepts the next Escape may close the entire extension popup. No workaround is required for that host behavior. When the event reaches the popup document, cancel its default action and dismiss only the account menu.

### 4. Reconcile all tracking surfaces and preserve the global timer

After switching, fetch the current global timer and target-workspace capability/destination. The running timer retains its original workspace, elapsed time, and Stop action. A second Start remains unavailable while it runs. After Stop, a new Start uses the selected workspace. The popup's next-start destination must not relabel the running entry as belonging to the new workspace. Apply refreshed state to open GitHub issue and Projects issue-pane controls, including other tabs.

### 5. Planned files by area

| Area | Planned work |
| --- | --- |
| Extension | `apps/chrome-ext/src/lib/api.ts`, `session.ts`, `runtime.ts`: API methods, runtime messages and session transition guards; `src/background/main.ts`: orchestration, snapshots and notifications; `src/popup/main.ts`, `render.ts` and existing styling: selector and feedback; existing content-script state handling as needed for invalidation. Add focused tests beside these modules. Follow `apps/chrome-ext/AGENTS.md` and `docs/ui/INDEX.md`. |
| API/shared | Reuse `packages/shared/src/contracts/users.ts` and `auth.ts`, plus existing auth/users endpoints. Verify existing cross-workspace timer semantics; no source edits planned. Any discovered contract change requires revisiting this scope and nearest API instructions. |
| user-web/admin-web | No changes planned; manually verify their independent session selection stays unchanged. |
| Documentation | Update `docs/ui/chrome-ext.md` menu/states and `docs/TECHNICAL-REQUIREMENTS.md` extension-local selection, persistence and global-timer behavior. Check `docs/API-ENDPOINTS.md` for accuracy; edit only if an actual gap is found. Record commands, screenshots and manual outcomes in this change's `qa.md`. |
| Design | Compare shipped UI to the saved `.pen` frames through Pencil. If additional designed states are needed, update `.pen` deliberately and document them; do not silently diverge from approved normal states. |

### 6. Verification and acceptance

- Automated: membership parsing, success/failures, current-workspace no-op, persistence, refresh/switch serialization, sign-out/new-login races, stale snapshots/preflight, Start/switch ordering, cross-workspace timer retention/Stop, selector rendering, focus and menu survival across ticks.
- Run extension typecheck/test/build and root typecheck/lint/test. If implementation expands into API/integration code, run the relevant API/e2e checks as well. Validate this OpenSpec change with strict mode.
- Compare actual popup screenshots at 320 × 480 with `cvEiV` and `V6FKLq`: placement above Open profile, identity variants, timer notice, menu width/spacing, typography, colors, borders, focus and absence of overflow. Test long names and expanded options as additional states. Record every residual delta; fix unintended differences before completion.
- Execute the manual browser matrix in `manual-test.md` against real builds in both Chrome and Firefox with test accounts, including native-select keyboard/focus behavior and their respective background lifecycle. Unit tests or mocked DOM screenshots do not replace this gate. Record date, browser/build, case outcomes, screenshots and resulting entry workspace evidence in `qa.md`; leave unavailable cases blocked with reasons.

## Risks / Trade-offs

- Token rotation races → one mutation owner plus generation checks and explicit interleaving tests.
- Wrong-workspace starts from stale controls → generation-bound actions, mutation ordering, immediate invalidation and fresh authoritative preflight.
- Switch accepted server-side but response lost → treat as uncertain, recover authentication safely and show failure rather than pretend the old session is usable.
- Popup closes or worker restarts → persist the accepted pair in extension storage; reconstruct selection from JWT and fresh memberships on reopen.
- Membership revoked or list unavailable → keep tracking authorization server-owned; expose retry or sign-in recovery without silently choosing another workspace.
- Added menu height and timer rerenders → parity checks in both approved frames plus keyboard/long-name/manual tests.

## Migration Plan

No database or API migration. Existing extension sessions remain readable. Ship the extension build after all verification gates pass. Rollback restores the prior extension build without reverting entries or rotating sessions unnecessarily; a valid stored token pair remains compatible.

## Open Questions

None blocking planning. Single-membership visibility and undrawn feedback states are explicit design defaults above. Any implementation-driven visual adjustment must be recorded in the parity evidence.
