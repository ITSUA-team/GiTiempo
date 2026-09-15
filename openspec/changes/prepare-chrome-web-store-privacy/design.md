## Context

The extension supports Chrome and Firefox with one source tree. It exchanges Firebase or GitHub identity for a GiTiempo token pair stored in `chrome.storage.local`. Firebase's web-extension SDK separately persists its authenticated user in IndexedDB. The current account-menu logout clears the GiTiempo pair but never signs out Firebase.

The existing `Extension Can End Its Session` requirement and `docs/ui/chrome-ext.md` describe backend revocation before clearing storage, while also requiring stalled revocation not to retain the session. The implementation already clears locally first and performs bounded best-effort revocation. This change explicitly reconciles that ordering while adding provider cleanup; it preserves refresh-race protection, cross-surface updates, and the rule that logout leaves a running timer untouched.

An audit on 2026-09-14 observed HTTP 404 at `https://gitiempo.com/privacy`, HTTP 200 at the homepage, and a production sitemap containing only `/`. The user clarified that the privacy changes are currently on staging. A subsequent anonymous check confirmed HTTP 200 and policy HTML at `https://gitiempo-landing.itsua.dev/privacy/`, with a matching staging canonical URL. Treat this as staged functionality awaiting production release, not evidence of a routing defect. Source already contains the policy, footer link, sitemap generation, and mandatory controller/contact configuration. The production homepage includes analytics consent configuration; the staged policy does not describe GA4.

The initial staging check displayed `admin@itsua.com` both as controller identity and contact address, with revision date `18 August 2026`. A subsequent fresh check confirmed that the controller now displays `ITSUA`, with `admin@itsua.com` separately as the privacy contact. The displayed-value issue is resolved; operator confirmation that this identifies the actual controller and that the mailbox is monitored remains a publication check. The prior staged-text audit found only GiTiempo extension storage disclosed and a Limited Use sentence restricted to Google API data; this controller-only recheck does not establish changes to those sections. The staging homepage link and sitemap were not rechecked in this follow-up and remain verification tasks.

Follow `apps/chrome-ext/AGENTS.md`, `apps/landing-web/AGENTS.md`, `docs/ui/INDEX.md`, `docs/ui/chrome-ext.md`, `docs/ui/pages-landing.md`, and the applicable landing skills. Inspect the approved privacy desktop/mobile and extension frames in `GITiempo.pen` before UI/content implementation. Retain the existing component structure and styling conventions.

## Goals / Non-Goals

**Goals:**

- Make extension logout clear both local authentication stores without depending on backend availability.
- Keep Chrome permissions limited to the existing GitHub timer functionality.
- Provide one accurate, public policy covering the service, extension, and configured landing analytics.
- Produce reviewable, evidence-backed Dashboard declarations and an explicit publication checklist.
- Preserve existing timer, authentication-provider, and analytics contracts except for the local logout correction.

**Non-Goals:**

- New API endpoints, database migrations, account-deletion automation, changes to retention implementation, or global identity-provider logout.
- Changes to user/admin SPA sessions, shared frontend packages, OAuth scopes, sign-in methods, extension versioning, or production API selection.
- New telemetry, GA4 events, consent UI redesign, new dependencies, or Firefox store publication/declaration review.
- Automatic production deployment, publisher-account changes, or Store submission as a side effect of implementing code.

## Decisions

### 1. Own Firebase cleanup in extension authentication orchestration

Add a small extension-owned Firebase sign-out helper in `src/lib/firebase.ts`. Invoke it from the background account-menu logout path together with the existing GiTiempo session termination. Keep the API client's storage invalidation and bounded backend revocation semantics; capture the old token pair for revocation and invalidate refresh state before clearing it. Backend latency must not delay initiation of either local cleanup operation. Start the API client's existing `exitSession()` operation and Firebase cleanup independently in the handler, then settle both results; do not call Firebase sign-out only after awaiting `exitSession()`, because that promise also waits for backend revocation. Keep the handler alive while the bounded revoke settles so the MV3 worker can finish the request.

Use the Firebase SDK to clear its state instead of manually deleting internal IndexedDB records. When no Firebase session exists, including a GitHub-only sign-in, cleanup is an idempotent no-op. Clear only the extension-origin Firebase state; do not revoke the user's Google/GitHub website sessions or sign out the SPAs.

Do not short-circuit one cleanup because the other fails. A Firebase persistence error must not restore GiTiempo tokens or suppress backend revocation; surface a recoverable failure through the existing extension error path and allow another cleanup attempt even after the GiTiempo pair is absent. Do not claim that all local authentication state was erased until both cleanup operations succeed. Preserve the existing five-second backend revoke bound and refresh epoch behavior.

Persist a token-free `providerCleanupPending` marker in extension storage before starting cleanup, and clear it when Firebase cleanup succeeds. Retain it on provider failure so closing the popup or restarting the background worker cannot lose the incomplete-cleanup state. The unauthenticated popup's recoverable error presentation exposes a `Retry sign-out` action when that marker is present; the action retries cleanup without requiring the account menu or a new login. Reopening the popup restores that error/action from the marker. Clear the error after success. This adds a bounded recovery state to the existing error presentation, not a new account menu; include it in the design-frame review and disclose the token-free local cleanup status alongside storage behavior.

Implementation review: initiate the marker write first, but a failed write must not prevent either cleanup operation from starting. If provider cleanup and marker storage both fail, report that persistence was unavailable and keep retry state in the current worker; recovery across a worker restart cannot be guaranteed when storage itself rejects writes. Attach rejection handling immediately to every concurrent cleanup promise, including while backend revocation is still pending.

The recovery presentation reuses `Ext Error`: signed-out header with the home action, no account menu or login controls, centered error icon, `Sign-out incomplete`, explanatory copy, and `Retry sign-out`. Inspected through Pencil MCP and recorded as [`Ext Sign-out Cleanup Pending`](design-assets/Jr6mK.png). The PNG is a durable review artifact; canvas edits were made through MCP.

Alternative considered: change only the policy to admit that Firebase credentials survive logout. That leaves a surprising user-visible security boundary, so this proposal corrects the behavior and documents the resulting storage lifecycle.

### 2. Remove `tabs` while preserving the required host access

`identity` supports web authentication and `storage` supports the GiTiempo session. The configured API host supports authenticated requests, and `https://github.com/*` supports the GitHub page integration and matching-tab access. Chrome host permissions already permit querying matching tab URLs/titles; opening a tab and sending messages do not require broad `tabs` access.

Remove `tabs` from the shared manifest generator only after locking the current behavior with appropriate tests. Verify Chrome and Firefox popup context resolution, injected controls, tab synchronization, and app/profile navigation. Do not widen host permissions or add `activeTab` merely to replace a redundant permission. If a supported browser exposes a demonstrated requirement, document the exact failing operation and use a target-specific minimum permission rather than broadening the Chrome package.

Alternative considered: keep `tabs` and justify it as tab creation. That justification does not reflect Chrome's permission model.

### 3. Complete the existing policy without inventing operational facts

Reuse `src/pages/privacy.astro`, its layout/footer, public configuration, and sitemap. Describe:

- Profile/account data and email/password authentication through Firebase; Google and GitHub sign-in; GiTiempo access/refresh tokens and Firebase persistence, without exposing credentials.
- Local GitHub URL/title recognition; the repository and issue number sent in the timer-start request; the backend's subsequent retrieval of issue information from GitHub; project/task/time records visible to authorized workspace members under existing access rules.
- Actual data recipients and roles, including Google/Firebase, GitHub, and operator-confirmed hosting/processing providers. Do not present an incomplete generic provider sentence as the verified recipient list.
- Limited Use for all extension user data, including restrictions on unrelated use, transfer, advertising, and human access with the permitted exceptions. Verify the operational statements with the publisher.
- Optional landing GA4 events, sanitized location/campaign fields, cookie/consent storage, consent withdrawal, and the fact that withdrawal does not retroactively delete data already received by Google. Keep landing analytics distinct from the extension, which has no analytics collection. Avoid claiming analytics is inherently anonymous.
- Operator-confirmed retention criteria, deletion-request contact/process, treatment of backups, and applicable transfers. Explain that extension logout/uninstall does not delete account, workspace, or server-side time records and does not stop a running timer.

Retain `PUBLIC_PRIVACY_CONTROLLER_NAME` and `PUBLIC_PRIVACY_CONTACT_EMAIL` as required build inputs. Syntax validation cannot establish legal identity or mailbox ownership; these remain explicit release checks. Record missing facts in the release checklist, not as placeholders on a public policy. Update the effective/last-updated date when the approved policy is actually revised.

Alternative considered: separate extension and website policies. A single policy with clear sections matches the existing public route and avoids contradictory copies.

### 4. Keep analytics ownership with its active change

`add-landing-ga4-analytics` already defines optional configuration, consent, events, and withdrawal and has an outstanding external verification task. This proposal consumes those behaviors and adds disclosure coverage. Its `public-landing-page` delta uses distinct ADDED requirements; it does not overwrite `Standalone Public Landing Route`, `Static Performance Budget`, or `Validated Public Build Configuration`, which the analytics change modifies.

No new `landing-analytics` capability or duplicate analytics runtime is created here. At archive time confirm both deltas merge without dropping the other change's requirements. Reuse existing analytics verification evidence where it applies and leave the other change's unresolved external verification visibly unresolved.

### 5. Maintain a package-specific declaration and release checklist

Add `docs/chrome-web-store-privacy.md` and link it from `docs/deployment.md` and the extension README. Record package version/hash, review date, policy URL, single purpose, exact permissions/hosts and justifications, data flows/categories, remote-code inspection, publisher certifications, and verification evidence.

The draft single purpose is GitHub-linked GiTiempo time tracking, including authenticated timer control. Start the data inventory with personally identifiable information, authentication information, website content, and the supported-page browsing context. Map the final inventory to the Dashboard's current definitions; do not omit locally processed URL/title data simply because it stays on-device, and do not claim full-history or passive activity monitoring that the code does not perform. Evaluate the Dashboard's User activity definition against manual timer records explicitly rather than guessing a checkbox. Keep landing GA4 out of the extension's data declarations while covering it in the shared policy.

Verify each certification against the publisher's real practices, including permitted transfers, core-function-only use, and no creditworthiness/lending use. A code audit cannot prove organizational practices. Mark fields as drafted, publisher-confirmed, or verified in Dashboard; do not label unseen Dashboard values as checked. Do not place reviewer credentials, private keys, or session tokens in the checklist.

### Planned file groups

| Area | Planned surfaces |
| --- | --- |
| Extension | `src/lib/firebase.ts`, `src/background/main.ts`, extension-local cleanup marker and runtime snapshot, popup recovery action, relevant Firebase/background/API/session/popup tests, `vite.config.ts`, `README.md`; keep these surfaces extension-owned |
| Landing | `src/pages/privacy.astro`, existing `public-config.mjs`, `FinalCta.astro`, legal footer, sitemap route, and route/build/browser tests; reuse correct existing behavior rather than rewriting it |
| Documentation | `docs/chrome-web-store-privacy.md`, `docs/deployment.md`, `docs/ui/chrome-ext.md`, `docs/ui/pages-landing.md` |
| Deployment | Inspect built assets and existing landing deployment workflow; patch only demonstrated omission or routing defects |
| Backend/shared/SPAs | No planned changes; preserve current API/session contracts and workspace access rules |

## Risks / Trade-offs

- [Firebase storage failure] → Attempt independent cleanup, retain signed-out GiTiempo state, expose retry, and verify persistent state after reopening the extension.
- [Backend revoke failure leaves a previously issued server token valid] → Preserve best-effort bounded revocation and token expiry; describe local sign-out accurately without promising offline server invalidation.
- [Permission behavior differs between browsers] → Run both builds and exercise relevant tab APIs in each browser before removing a shared permission.
- [Staging policy is mistaken for production readiness] → Use the verified staging page as the current baseline and require anonymous HTTP/content checks of the production route, home link, and sitemap after release and before submission.
- [Unknown retention/provider facts] → Keep release checks unresolved until confirmed; do not invent legal names, storage regions, durations, or deletion guarantees.
- [Shared policy changes affect layout] → Inspect approved frames and verify readable hierarchy, keyboard navigation, and no overflow at 390, 768, 1024, and 1440 pixels.
- [Store requirements or Dashboard labels change] → Recheck official sources against the exact release package and record the review date.

## Migration Plan

1. Implement extension cleanup and least-privilege changes with focused regressions, then run extension lint/typecheck/tests and both builds.
2. Resolve policy facts with the operator, update existing content/docs, and verify landing builds with analytics absent and configured. Confirm the privacy route emits no analytics or timer scripts.
3. Test the packaged extension's login/logout and timer behavior, including persistent Firebase state, backend failure, and an active timer. Record declaration evidence against that package.
4. Use the existing staging deployment to verify the corrected policy, then under applicable release authorization promote the approved landing artifact to production and verify the production URL, footer, sitemap, identity/contact values, and content. Keep this gate open until production deployment and checks have occurred.
5. Confirm Dashboard declarations against that artifact and policy before submitting. Do not submit while any release gate remains unresolved.
6. Roll back app artifacts through the existing deployment/package process if needed; keep the policy consistent with the restored behavior. Restoring a version without a public policy makes the submission gate fail again. No database migration is required.

## Open Questions

These require operator facts before publication, not architectural decisions before local implementation:

- Exact controller identity, monitored contact, full processor/recipient list, and applicable processing locations/transfers.
- Actual retention/deletion criteria for accounts, workspace records, operational logs, and backups, including how requests are handled.
- Whether the publisher's Dashboard exists and which values are already entered; organizational certification confirmation.
- Which reviewed staging artifact/revision will be promoted to production, with confirmed production controller/contact configuration.

## Reference Evidence

- Current repo contracts: `openspec/specs/chrome-extension/spec.md`, `openspec/specs/public-landing-page/spec.md`, and `openspec/changes/add-landing-ga4-analytics/`.
- Chrome privacy fields: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- Privacy policy requirements: https://developer.chrome.com/docs/webstore/program-policies/privacy
- Local data handling and disclosure: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- Limited Use: https://developer.chrome.com/docs/webstore/program-policies/limited-use
- Tabs permissions: https://developer.chrome.com/docs/extensions/reference/api/tabs

The source audit informs the proposal; it does not constitute approval by Chrome Web Store or confirmation of the publisher's legal/operational practices.
