# Live browser acceptance — environment preparation

Build: local uncommitted `unify-github-oauth-account-linking` implementation, 2026-10-08. Browser: Codex in-app browser, visible user-web tab at `http://localhost:5173/login?redirect=/`. API and both SPA development servers are already running. No synthetic provider responses or browser fixture tokens were introduced in this pass.

## Observations before provider login

- User-web rendered its sign-in screen and an enabled **Continue with GitHub** action. Clicking it did not produce an observable GitHub page; the next observed state remained the sign-in screen. This is not a successful OAuth start or consent check.
- A direct request to the local API's `/auth/github/start?app=user` returned **503**, with the safe message **GitHub sign-in is not configured**.
- Presence-only inspection confirmed the local API `.env` still lacks `GITHUB_SIGNIN_CLIENT_ID` and `GITHUB_SIGNIN_CLIENT_SECRET`. Real Firebase adapter settings are present; their values were not exposed.
- Read-only database inspection confirmed `github_account_links`, `github_oauth_grants` and `github_authorization_generations` are not yet present in the configured local database. No migration or account cleanup was executed.
- User-web's configured API base is `http://localhost:3000`; admin-web uses `https://itsua-tunel-3.itsua.dev`. The API's configured callback base is that tunnel, with user/admin return URLs at localhost ports 5173/5174. Reachability and final provider callback configuration still need verification after OAuth configuration is available.

## Subsequent authorized environment preparation

The user explicitly chose applying the prepared migration to the current local database. Migration 0020 completed successfully, removed both active duplicate GitHub bindings and the matching historical row, invalidated pending authorizations, and created three durable generation/cutoff records. Before/after content digests and row counts matched for all 17 non-GitHub public tables. See `local-preflight-evidence.md` for details. The earlier absent-table observation above was before this migration.

The user requested OAuth App creation settings. Settings were supplied from official GitHub documentation, and the user was then asked again to configure the Client ID and Client Secret locally and verify the registered callback `https://itsua-tunel-3.itsua.dev/auth/github/callback`. No credential should be sent through chat. Provider sign-in/consent will be handed to the user when the browser reaches that step.

No live acceptance task in 11.1–11.15 is marked complete by these environment observations.

After migration, the local API and configured tunnel both answered the GitHub-start request with 503 while client configuration was still absent. This confirms the endpoint is reachable; no real provider authorization has started.

## Real provider consent reached

The user confirmed the OAuth client values were saved locally. Presence-only inspection found both values configured; the API watcher was restarted and its source file restored byte-for-byte afterward. No source behavior or credential values were changed or exposed. User-web's ignored `.env.local` API base was aligned to the tunnel used by the callback, and the SPA was reloaded.

- The tunnel's GitHub-start response became **302**, with GitHub authorization as the destination, `user:email read:org read:project`, the exact configured callback, and a browser-binding cookie. Nonce/state values were not printed.
- A real click on user-web **Continue with GitHub** reached GitHub's **Authorize Gitiempo test auth** page. An initial browser inspection timed out during navigation; a fresh snapshot confirmed the provider consent page, so the click was not repeated.
- GitHub already had the user's `tsukanovoleksii` session. The page displayed read-only organizations/teams, Project read access and read-only email addresses.
- Organization access was restricted until approval: the page offered **Grant** for `ITSUA-team` and `My-test-org-for-clock`, and **Request** for two other organizations. No Grant/Request/Authorize action was performed by the agent.
- The user was asked to choose/grant a test organization, authorize the OAuth App, and report the selected organization. Callback outcome and GiTiempo session/link creation are still pending, so task 11.2 remains unchecked.

## Real callback: no matching existing member

The user confirmed provider consent was completed. The browser returned to the GiTiempo sign-in screen with the explicit no-member message: no GiTiempo account matches a verified email on the GitHub account. No authenticated GiTiempo UI appeared. This is the observed email-matching outcome; an earlier anticipated duplicate-email ambiguity was not observed.

Read-only inspection immediately afterward found zero account links for GitHub ID `143533474`, zero OAuth grants, and zero refresh-token rows created in the preceding 30 minutes. No credentials were read or exposed. Successful sign-in/linking acceptance remains pending. The next manual step is user-performed email/password or Google sign-in to the intended existing GiTiempo account, followed by authenticated GitHub linking from Profile.

## Authenticated Profile linking: local/tunnel transport blocker

The user signed into the existing GiTiempo account through an alternative method. Dashboard showed the existing GI Tiempo workspace, its historical entries and task context. Profile initially showed Disconnected. Clicking Connect GitHub transitioned through Connecting, then returned to Profile with the safe toast **GitHub returned an incomplete callback response** and Disconnected status.

Read-only inspection found zero account links for GitHub ID `143533474`, zero OAuth grants, and one newly created account-link state that remained unconsumed. Source inspection maps this toast to `invalid_callback`, returned before state claiming when code, state or the session-binding cookie is missing. The callback reached the isolated account-link namespace; the suspected missing value is the cookie. The start sets an HttpOnly `SameSite=Lax` cookie through a cross-site fetch from localhost SPA to the HTTPS tunnel API. This environment can block storing that cookie even with credentials enabled. Cookie transport has not yet been directly inspected, so the diagnosis remains an evidence-backed hypothesis pending a same-site rerun.

Task 11.3 remains unchecked. No application source changes, ownership/grant writes, private-data authorization or organization additions were made during this attempt. Next step: use a registered localhost OAuth callback and local API base for a same-site browser rerun, preserving all session-binding checks.

## Same-site rerun: live linking and reconnect succeed

The user confirmed registration of `http://localhost:3000/auth/github/callback`. Local ignored configuration was updated: API `APP_URL` and both SPA API bases now use `http://localhost:3000`; SPA return URLs remain localhost ports 5173/5174. API watcher was reloaded and its source restored byte-for-byte. A safe start-response inspection confirmed 302 to GitHub, the registered localhost callback, all three agreed scopes and a binding cookie, without printing state.

From the existing authenticated Profile, Connect GitHub returned successfully to Connected with login `tsukanovoleksii` and the established success toast. The current account and workspace stayed unchanged. A subsequent Reconnect for the same provider identity also succeeded. Read-only storage inspection confirmed exactly one identity link owned by existing user `4cc7ff72-d89d-44b1-8537-35d2276e5716`, exactly one OAuth grant, unchanged connected-at timestamp with an advanced updated-at timestamp, and actual scopes `read:org`, `read:project`, `user:email`. Refresh and expiry metadata are present; no token values were selected. There are zero active personal App grants for this user, and Profile correctly offers a separate **Authorize GitHub data** action.

The same-site success confirms that the failed localhost-to-tunnel account-link flow was environment-dependent cookie transport. No session-binding checks were weakened or application behavior changed for the rerun. Task 11.3 remains unchecked because the different-GitHub-ID rejection portion is not yet executed; organization discovery/addition and successful GitHub sign-in remain pending.

## Live admin sign-in and OAuth-only organization policy

Following the user-web Admin workspace link reached the admin sign-in screen. Continue with GitHub opened the normal existing-user admin Dashboard for GI Tiempo without email fallback or a second Connect step. Settings showed the linked GitHub identity and separate App-data guidance. Add organization listed `ITSUA-team` and `My-test-org-for-clock`.

Switched the admin session to the existing local test workspace `test1` (`0bb48dee-f25d-4a1e-8eee-b11b5679fd77`). Read-only precheck found zero allowed organizations and zero workspace installation records. Selected `My-test-org-for-clock` and added it successfully through the UI. It remained allowed after reload, and the selector subsequently offered only `ITSUA-team`. Read-only storage confirmed the policy row persisted and workspace installation records remained zero. No personal App grant or installation was created, so this proves policy addition without those grants/records; it does not claim the App is absent from every organization globally or that private browsing/tracking has been live-tested.

Clicking Install App correctly remained on Settings with the policy intact, but its client-side error said **Connect your GitHub account and confirm organization-owner access before linking a GitHub App installation**, although identity was already connected. The gate needs explicit personal App authorization guidance; a bounded wording/regression fix is in progress. No provider install or organization permission request was made. Tasks 11.6 and 11.9 remain unchecked pending their remaining acceptance portions.

## User-web relogin and bounded installation-guidance correction

User-web Sign out reached the sign-in screen; Continue with GitHub opened the normal existing-account Dashboard. Profile immediately showed Connected with the original connected-at timestamp and no second Connect step. Safe inspection of the admin start confirmed the same three requested scopes and localhost callback. Read-only storage after both SPA logins still contained one identity link and one OAuth grant owned by the same user. Task 11.2 is now complete for this local build.

The Install App guard message was changed to **Authorize GitHub App data from your profile and confirm organization-owner access before linking a GitHub App installation.** The guard and all setup requests/authority checks are unchanged. Its focused regression verifies this guidance and absence of a setup request when configuration is blocked. Focused Vitest passed 5/5; admin typecheck passed; admin lint had zero errors and two existing warnings in untouched `GithubCallbackView.vue`. Browser recheck after Settings finished loading showed exactly the corrected toast; the allowed organization remained intact.

## Personal GitHub App authorization: registered callback blocker

Clicked the separate Profile **Authorize GitHub data** action. GitHub rejected the authorization request with **The redirect_uri is not associated with this application**. The retained App client derives its callback from the same local `APP_URL`, so the current manual configuration requests `http://localhost:3000/github/callback`. The OAuth App's registered `/auth/github/callback` does not configure the separate GitHub App. No consent was bypassed or new App grant created. Task 11.8 remains unchecked pending registration of the local callback for the existing GitHub App and user approval of any provider consent.

## Personal GitHub App callback configured: separate grant succeeds

The user confirmed adding the localhost callback to the existing GitHub App `gitiempo-local`. A fresh Profile **Authorize GitHub data** attempt returned successfully without a new visible provider consent prompt (the provider already had an authorization). Profile remained Connected and no longer displayed the missing-private-data guidance/action. Read-only database inspection confirmed an active personal App grant for the same GitHub ID `143533474`, with access/refresh/expiry presence, while the OAuth scopes and identity ownership/connected-at remained unchanged. OAuth and identity updated-at timestamps remained at the prior sign-in values (`2026-10-08T10:52:52Z`). No token values were read or exposed. No workspace installation was created by this personal authorization. Private browsing/import, mismatched App identity and legacy App-only portions of 11.8 remain pending.

## App browsing and initial installation authority blocker

In local admin `test1`, New project → Import from GitHub passed the personal-App capability gate but failed to load Projects with **GitHub API request failed**; no project/import was created. Bounded read-only provider diagnostics used the already-authorized personal App credential only in memory, never displaying it. GitHub returned 404 for `/orgs/My-test-org-for-clock/projectsV2` and `/repos/My-test-org-for-clock/test-repo`; the App user's installations endpoint returned only the personal `tsukanovoleksii` installation. A server-App metadata GET confirmed `gitiempo-local` is configured with read permissions for organization Projects, Members and Issues. Therefore adding more App permissions is not the current remedy.

Both automatic Settings installation verification and an explicit Install App attempt returned **GitHub installation verification is unavailable**, with the allowed policy intact. A diagnostic request to the retained App-based `/user/memberships/orgs/My-test-org-for-clock` authority endpoint returned 403 (`members=read` required) before an organization installation exists. This is a live limitation of the retained initial setup mechanism; it was not moved to OAuth or bypassed on the server.

Opened GitHub's normal App installation picker directly to prepare the required provider fixture. GitHub showed the personal installation as Configure and `My-test-org-for-clock` as not yet installed, confirming provider-side absence of the App for that test organization. The review page now selects **Only select repositories → My-test-org-for-clock/test-repo**, with read access to Issues, Members, Metadata and Organization Projects. Install has not been pressed by the agent. The user must approve this new organization access; after installation the existing server authority/installation verification still must succeed before workspace tracking is considered enabled. No server setup state or verified association was fabricated.

## User-approved organization installation and real private-data flow

The user completed GitHub's installation confirmation. The provider settings page explicitly reported that `gitiempo-local` was installed on `My-test-org-for-clock`, with **Only select repositories → test-repo** and read access to Issues, Members, Metadata and Organization Projects. Installation ID is `169228020`; organization ID is `268615731`. No permissions were expanded by the agent.

Returning to local admin Settings automatically used the retained server setup/verification path. Read-only storage confirmed the exact installation in local `test1` with status `verified` and authorization version 1. The allowed organization remained saved. No setup state, authority result or association was fabricated. The previously observed pre-install 403 limitation remains recorded; after installation, real owner/installation verification succeeded.

With the existing personal App grant, read-only provider requests now returned 200 for the private `My-test-org-for-clock/test-repo` repository and its organization's Projects list (one Project). No reconnect or new personal consent was needed. Admin New project → Import from GitHub loaded `@tsukanovoleksii's untitled project` (#1), previewed two issues from the selected repository and imported it successfully into local `test1` as one private project with the repository mapping. The local project ID is `958c1024-42f4-420a-a39d-1ebe18efdebc`. This changed only local GiTiempo test data; no GitHub Project or issue was edited.

In user-web, switched to `test1`, opened the timer's GitHub Project option and observed the real issues **My first issue** and **some test issue**. Starting and stopping **some test issue** (#1) succeeded. Read-only storage confirmed task `adcf510d-6cd0-477b-b2df-4e05e2e51685` reused the imported project and time entry `b1956a32-14ad-4a2d-a7e6-ae19962aec22` ran from `2026-10-08T12:09:01.124Z` to `2026-10-08T12:09:13.085Z`. Time Entries visibly displayed that saved row. The current user is a workspace admin; no assigned/non-assigned member fixture was inferred, and the project-member selector offered no matching admin.

Tasks 11.8 and 11.9 remain partial: private repository/issue/Project browsing and import plus automatic real installation confirmation now passed, but alternate App identity/legacy App-only checks and the initial uninstalled setup limitation are not marked complete. Disconnect and post-unlink tracking remain the next live checks.

## Full Disconnect review prepared

Profile exposed an enabled Disconnect action after authoritative status loading. Opened the confirmation and canceled once; subsequent Profile remained Connected, and read-only storage still had one identity, one OAuth grant and one active personal App grant. Opened the confirmation again for the user's final action. It explains removal of personal GitHub identity/access and preservation of workspace installations, projects, tasks and time history. No final DELETE or provider revocation was triggered by the agent.

A baseline of counts and content digests was captured for ten workspace/history tables before final unlink, plus personal-family counts (1/1/1). It contains only hashes/counts, no credential or record payload. The imported project, saved GitHub task and completed timer are available for post-unlink preservation/tracking checks. Final confirmation is pending the user because it deletes the real personal binding and revokes its grants.

## User-confirmed full Disconnect and real post-unlink tracking

The user confirmed Disconnect. Profile visibly became Disconnected, and stayed Disconnected after reload while the same GiTiempo session/account remained open. Read-only storage had **zero identity links, zero OAuth grants and zero personal App rows** for the current user. No token payloads were selected. Exact before/after row counts and content hashes matched for all ten checked tables: workspace installations, allowed organizations, workspaces, memberships, projects, project references, assignments, tasks, task references and time entries. This verifies preservation before any subsequent timer action. The transient DELETE response/provider-revocation toast was not captured while the user performed the action; provider-side revocation confirmation is not independently claimed from the local row deletion.

Time Entries still displayed the prior GitHub issue entry. Its **Start timer for some test issue** action succeeded without Connect/Authorize. A real new entry (`42978fb4-90e3-4d80-873b-03fe96eafe0c`) for the same task ran from `2026-10-08T12:13:12.932Z` to `2026-10-08T12:13:38.032Z`; stopping succeeded and both completed entries were visible. With both personal grant families absent, this demonstrates the retained installation-backed saved-task start/stop flow for a workspace admin. It does not replace assigned/unassigned member acceptance.

A pre-existing UI limitation was observed in **Update timer task**: the local saved task remained selectable, but optional live issue enrichment emitted **Could not load tasks for this project / GitHub connection not found** plus reconnect guidance for organization-board browsing. Read-only source investigation traced this to `useTopBarTaskOptions.ts` loading local tasks then `project-github-issues.ts` calling the personal-App repository issue endpoint. The local Tasks service requires only project visibility; the enrichment path predates this OAuth change. It did not block the tested saved timer's start or stop. No code was changed during this pass.

Signed out after confirming the timer was stopped. The browser reached the normal GiTiempo sign-in screen. User-performed email/password or Google login to the same account is pending; task 11.10 remains partial until this outcome is verified.

## Alternative login succeeds after full Disconnect

The user confirmed the requested alternative sign-in was completed. The browser opened the same Oleksii Tsukanov account and its original GI Tiempo Dashboard/history. Profile showed the same account email and **Disconnected**. Read-only storage still had zero identity/OAuth/App rows for this account (zero OAuth grants globally in this local test database), ruling out a new GitHub-linked sign-in in this observed pass. The user did not specify which of email/password or Google was used; no exact provider is inferred. Task **11.10 is complete**: cancel, confirm, current session preservation, reload, exact workspace/history preservation and usable alternative relogin were executed. Independent confirmation of the provider's token-revocation response remains unobserved and is not claimed.

Admin Settings in the original session remained accessible after personal Disconnect, showed GitHub not connected, retained the allowed My-test-org-for-clock policy and hid Add organization. No personal recovery was requested for the already verified installation's stored association. The user confirmed a second GiTiempo account is available, but no second GitHub identity. Live ownership-release/conflict checks can continue; different-provider-identity checks remain unavailable.

## Released GitHub ID links to the second real account

The user signed into the second existing GiTiempo account, **Admin gitempo** (`gitiempo@itsua.com`, ID `90d0e2da-9ef3-466a-aa4c-da3eb8820a34`). Profile initially showed Disconnected. Authenticated **Connect GitHub** returned to the same account's Profile successfully, with `tsukanovoleksii` / GitHub ID `143533474`. No new provider consent prompt was visible. Profile correctly offered separate **Authorize GitHub data**; no personal App grant was inferred from OAuth linking.

Read-only storage confirmed exactly one owner/link with one OAuth grant, all three agreed scopes, connected/updated at `2026-10-08T12:26:33.425Z`, and zero active personal App grants for the second account. The original account still had zero identity links. This proves real identity release and reuse after full Disconnect. Task 11.12 remains partial pending its separate newly initiated login/recreation scenario. Metadata and hashes of the second owner's identity/grant were captured without credential values for the next conflict test.

## Real ownership conflict in two workspaces, with targeted recovery copy

The user returned to the original Oleksii Tsukanov account through alternative login. Profile was Disconnected. In GI Tiempo, authenticated Connect GitHub for the already-owned ID returned to the original account still Disconnected; the second owner's identity and OAuth row hashes remained identical. The initial toast was too generic (**GitHub could not complete the connection flow**), although the backend already returns `github_account_conflict`.

The bounded fix adds explicit Profile callback messages for `github_account_conflict` and `github_identity_mismatch` in `useProfileGithubCallbackQuery.ts`. The existing connection-composable regression now covers both codes, error toast, callback query cleanup, retained disconnected state and absence of additional authorization/disconnect calls. No backend ownership, credential, session or authority logic changed. UI parity checklist used `docs/ui/pages-user.md` Profile, `docs/ui/patterns.md` Toast and approved `GITiempo.pen` Profile (`oqc9P`): established root toast/error dismissal, current account fields/actions and state hierarchy remain; there is no layout/style change or PrimeVue deviation.

After reload, a real Connect attempt in GI Tiempo displayed **This GitHub account is already connected to another GiTiempo account.** Switched the same original account to test1 (a workspace where the owner has no membership) and repeated: the same explicit safe conflict appeared, with no other owner's email/name/workspace. The session remained Oleksii Tsukanov, Profile remained Disconnected, and callback parameters were removed (exact final URL `/profile`). A native screenshot captured this final state.

Read-only final checks after both workspaces confirmed exactly one GitHub owner (`90d0e2da-9ef3-466a-aa4c-da3eb8820a34`), zero links for the original account, and unchanged complete identity/OAuth row hashes. A bounded GET `/user` using the stored owner's OAuth credential only in memory returned 200 and the correct provider identity; the conflict neither overwrote nor revoked that grant. Source review confirms claiming ownership precedes any grant write and that conflict does not call the explicit Disconnect revocation loop. Task **11.4 is complete** for the real users' distinct authenticated sessions, including cross-workspace scope. Sessions were exercised sequentially in the Codex browser; independent concurrent browser-profile fixtures remain under 11.1.

Fresh verification for this copy fix: **50 user-web files / 530 tests passed**, user-web typecheck passed, lint had zero errors and 11 existing warnings outside the changed files. Other-GitHub-ID mismatch copy is covered by regression but its live scenario remains unavailable because the user has no second GitHub identity. The current real binding intentionally remains with Admin gitempo after the release/conflict test; it has not been silently restored or deleted.

## GitHub sign-in resolves the current identity owner after the conflict

Signed out of the original account after the test1 conflict and selected **Continue with GitHub** in user-web. The normal Dashboard opened as **Admin gitempo**, the second account that currently owns GitHub ID `143533474`, with its existing history. No new consent prompt was visible. Profile then showed the second account's email, Connected / `tsukanovoleksii`, the original connected-at and a later updated-at, plus the separate **Authorize GitHub data** action. This verifies linked-ID-first resolution after ownership release/relink; sign-in did not return to the previous browser user or select the original account by email. This successful owner sign-in may legitimately update OAuth metadata, so the unchanged-row conflict digests above describe the completed conflict checks before this separate successful sign-in. It does not complete 11.12's clean-fixture sign-in after Disconnect.

## User-selected final ownership and next fixture boundary

The user explicitly selected **Leave in the second account** after the release/conflict checks. Retain `tsukanovoleksii` linked to Admin gitempo (`gitiempo@itsua.com`); do not perform cleanup Disconnect or restore the original account's binding. This choice does not waive the remaining acceptance tasks.

The current enabled browser inventory contains only the Codex in-app browser and MCP Apps, with no controllable Chrome/Firefox extension browser. The repository has a real extension implementation and both browser build targets; the older root AGENTS placeholder note is stale. Task 11.15 still needs actual extension profiles and their configured destinations. No extension was installed, browser permissions expanded or real ownership changed during this check.

## Chrome installation reported; destination configuration pending

The user reported installing the extension in Chrome. A native Chrome inspection could not run because computer-use permissions are unavailable in this session; no browser control or permission bypass was attempted. Asked the user for the public extension ID and its loaded build folder so the operator can configure the exact destination without guessing.

Presence-only inspection confirms both API extension redirect settings remain absent. Safe configuration inspection found `dist/chrome` is the current version 0.1.0 build with tunnel API host permission, while the older root `dist` is version 0.0.0 with a different API host. Neither manifest has a fixed public extension key. The local/dev extension environment points to the tunnel, whereas the current SPA/API acceptance uses localhost. Actual Chrome identity and loaded folder must be confirmed before preparing a matching local build and redirect setting. No extension login, environment change, rebuild, credential read or ownership mutation was performed in this step; 11.15 remains unchecked.

## Exact Chrome destination and localhost build prepared

The user provided Chrome extension ID `pkboohjobohaoakjacjoajpjcabemibl`. Computing Chromium's path-derived ID for the two known build folders matched only the existing absolute `apps/chrome-ext/dist/chrome` path. Both manifests lack a fixed key; the calculation follows [Chromium's GenerateIdForPath implementation](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/crx_file/id_util.cc). Therefore no second request for the loaded folder was necessary.

Updated ignored local API configuration with `GITHUB_SIGNIN_EXTENSION_REDIRECT_URL=https://pkboohjobohaoakjacjoajpjcabemibl.chromiumapp.org/` and the exact matching `chrome-extension://` CORS origin, preserving the other origins. Updated only the extension's ignored dev environment to localhost API and user SPA, with GitHub sign-in enabled. Rebuilt the Chrome target in the same folder using dev mode; the generated manifest permits localhost API and GitHub, and the compiled background contains the local API/SPA addresses. The build passed; network access to the manifest schema validator was unavailable, so that optional remote validation was skipped. No dependency, application logic or provider callback registration changed.

The first HTTP preflight still saw old API configuration (503), confirming the watcher had not reloaded from a timestamp-only change. Triggered the existing watcher, restored `main.ts` byte-for-byte, then verified the extension start returned 302 to GitHub with the registered localhost callback and all three requested scopes. The matching CORS preflight also passed. Start probes did not follow GitHub redirects or redeem a handoff, expose state/code, or create a session/link/grant.

Read-only pre-login metadata at `2026-10-08T12:51:16.125Z` confirmed the second account still owns one link/OAuth grant with all three scopes, no personal App row, and 14 refresh-token rows (latest creation `12:35:25.420Z`). The safe baseline contains no token fields. Asked the user to reload the extension, sign out there if necessary, complete GitHub sign-in and report the visible account. Actual Chrome sign-in remains pending, so 11.15 is not complete.

## Chrome alternative login confirmed; explicit GitHub login still pending

The user first reported a completed login. Read-only metadata showed one new session at `2026-10-08T12:56:19.375Z`, raising the owner's refresh-token row count from 14 to 15. It belongs to a new family and was not created by rotation; no identifiers or token fields were selected. Identity and OAuth timestamps stayed at `12:35:25Z`, the same unique owner/all three scopes remained, the original account remained unlinked, and the second account still had zero personal App rows.

The user clarified that this was **Google or email/password**, with visible extension email **gitiempo@itsua.com**. The exact alternative provider was not specified. Therefore this pass verifies alternative extension login and retains its account ownership; it does not count as Chrome GitHub acceptance. Read-only source review confirmed successful `/auth/github/session` redemption writes both OAuth and identity timestamps before issuing the session, whereas alternative sign-in does not. No defect or code change is inferred from the unchanged metadata.

Asked the user to Sign out inside the extension, select **Continue with GitHub** explicitly, then close/reopen the popup after success to check session restoration. Successful GitHub exchange and that restoration remain pending; 11.15 remains unchecked.

## Real Chrome GitHub login and popup session restoration passed

The user confirmed completing the explicitly requested extension **Sign out → Continue with GitHub** and closing/reopening its popup to verify the same `gitiempo@itsua.com` session remains. These Chrome UI actions were performed and confirmed by the user; native Chrome control remains unavailable to the agent.

Read-only verification at `2026-10-08T13:00:06.298Z` independently confirmed a new, non-rotated active GiTiempo session at `12:59:27.462Z`, identity updated at `12:59:27.468Z`, and OAuth grant updated at `12:59:27.471Z`. The one global owner remains Admin gitempo (`90d0e2da-9ef3-466a-aa4c-da3eb8820a34`) for `tsukanovoleksii` / `143533474`. Original connected-at is preserved, the scopes remain `read:org`, `read:project`, `user:email`, the original account has zero links, and the second account has zero personal App rows. This distinguishes successful fresh GitHub exchange from the prior alternative-login pass without selecting credentials or session identifiers.

The Chrome happy path and user-confirmed popup restoration now passed on the localhost build. Task 11.15 remains partial: Firefox, actual extension cancellation/failure and the remaining cross-SPA alternative-login/session checks are not newly claimed. Asked whether Firefox is installed to prepare that separate browser fixture. No new application code, provider permission or ownership change was made in this verification step.

Follow-up metadata verified the earlier alternative session is no longer active, while the new GitHub session family remains usable. Comparisons use millisecond truncation for JavaScript Date values against PostgreSQL's finer timestamp precision, and follow the family rather than assuming an initial refresh row remains unrotated. This supplies server-side support for the user-performed Chrome logout and restored session without reading credentials.

## Firefox fixture prepared; user-performed installation/login pending

The user confirmed Firefox is installed. Built the Firefox target in dev mode into `apps/chrome-ext/dist/firefox`; local API/SPA addresses are present in the background bundle. The manifest declares Gecko ID `gitiempo-dev@example.com`, identity/storage permissions, GitHub and localhost API host permissions, and required websiteActivity data-collection disclosure. Build passed with the same optional remote manifest-schema validation unavailable; no source/dependency changed.

Official Firefox source derives the standard redirect from SHA-1 of the declared add-on ID. Configured the ignored local API's Firefox destination as `https://3cfe8a3cb6dc199900d6306b6a122970f150680d.extensions.allizom.org/`, preserving Chrome and both SPA destinations. Sources: [Firefox identity implementation](https://raw.githubusercontent.com/mozilla/gecko-dev/master/toolkit/components/extensions/child/ext-identity.js), [MDN getRedirectURL](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/identity/getRedirectURL). No wildcard or random moz-extension origin was added to API CORS: the extension background has the exact API host permission, which permits cross-origin fetch. See [MDN host permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions#host_permissions).

Reloaded the existing API watcher and restored `main.ts` byte-for-byte. The Firefox start preflight returned 302 to GitHub with the registered localhost provider callback and all three scopes, without following the provider or redeeming a handoff. The safe pre-Firefox baseline uses the completed Chrome metadata captured at `13:00:06.298Z` (identity/OAuth last updated at `12:59:27Z`), before requesting Firefox login.

Asked the user to load the exact Firefox manifest temporarily through about:debugging, review its GitHub/localhost access, perform **Continue with GitHub** as tsukanovoleksii, and close/reopen the popup to confirm gitiempo@itsua.com. No Firefox installation, permission confirmation or login was performed by the agent. Actual Firefox results remain pending; task 11.15 remains partial.

## Firefox manifest installation blocked by version compatibility

The user reported **Extension is invalid — Reading manifest: Error processing browser_specific_settings.gecko: Unexpected property "data_collection_permissions"**. Installation failed before GitHub sign-in, so no Firefox runtime/login/session-restoration pass is claimed.

Official [Firefox 140 release notes](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/140#changes_for_add-on_developers) establish that the field was introduced in desktop Firefox 140. The manifest generator retains `strict_min_version: "112.0"`, which does not make the newer field supported on older browsers. This reveals an existing manifest compatibility mismatch, separate from OAuth destination or credential handling. The field and stated minimum version predate this OAuth change. [Mozilla's consent guidance](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/#data-collection-experience-on-older-firefox-versions) documents the corresponding 140 minimum or separate older-browser consent behavior; [MDN manifest guidance](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings) records the declaration's requirement for new AMO submissions since 2025-11-03.

Asked for the user's exact Firefox version before choosing the runtime remedy. The existing build requires Firefox 140+ for this declaration. No generated or production privacy declaration was removed, minimum version changed, browser security bypassed or source code edited during this diagnosis. Task 11.15 remains partial pending compatible installation and the other recorded checks.

## Firefox authorization reached; successful session exchange remains blocked

Newer user evidence supersedes the earlier installation blocker: the user now completed GitHub authorization in Firefox, but reopening GiTiempo still shows login options. The exact browser version or installation remedy was not reported. Do not keep treating the original manifest error as the active OAuth blocker.

Read-only metadata at `2026-10-08T13:25:49.033Z` found no owner sessions created after the pre-Firefox baseline, and identity/OAuth timestamps still match the completed Chrome login at `12:59:27Z`. Thus the Firefox attempt has not committed a successful GiTiempo session/grant exchange; this is more than a popup repaint issue. No personal grant or ownership was changed by diagnosis.

Artifact-only checks confirm both compiled Firefox background and popup explicitly carry `VITE_EXTENSION_BROWSER: firefox`. A controlled local provider-denial simulation exercised start → callback without contacting GitHub, returned the exact configured Firefox host with `githubError=denied`, and emitted no handoff code. This verifies server-side Firefox destination selection and safe denied routing; it does not prove the installed browser's runtime redirect or a real callback succeeded.

The background owns interactive sign-in and handoff redemption. Reopening the popup is best effort; a failure before redemption can leave a fresh popup signed out. No exact client/provider failure is inferred yet. Asked the user for the public runtime `browser.identity.getRedirectURL()` and only the relevant background console error text, excluding callback queries, codes, tokens and storage. No browser-console automation, security bypass, new source change or provider authorization was performed by the agent. Firefox and task 11.15 remain partial pending this diagnostic evidence.

## Firefox CSP messages traced to the caught Zod capability probe

The user supplied CSP warnings at popup.js:1:94644 and main.js:1:2756. The matching popup/background bundle offsets contain Zod 4.3.6 `allowsEval` capability detection: it attempts `Function("")` inside try/catch and returns false when dynamic code is blocked. Installed Zod core object schemas gate their generated fast path on that value and otherwise call the ordinary parser. These messages alone do not establish the cause of the missing Firefox session.

A focused diagnostic using Node with `--disallow-code-generation-from-strings` returned `dynamicCodeAllowed: false`, `validPayloadAccepted: true`, and `invalidPayloadRejected: true` for a representative object schema. This confirms the installed dependency's fallback under prohibited dynamic code; it is not a real Firefox OAuth pass. No extension CSP, dependency, source code, or provider access was changed. The actual Firefox runtime redirect and any uncaught sign-in/background error remain needed to identify the OAuth blocker; task 11.15 stays partial.

## Firefox runtime destination confirmed on 2026-10-09

The user supplied the actual `browser.identity.getRedirectURL()` result: `https://3cfe8a3cb6dc199900d6306b6a122970f150680d.extensions.allizom.org/`. It exactly matches the ignored local API Firefox destination, removing a runtime/configuration mismatch as the current hypothesis. A fresh local start preflight returned HTTP 302 to github.com with the localhost provider callback and all three intended scopes. No GitHub authorization or handoff redemption was performed by this probe.

Read-only owner metadata at `2026-10-09T06:18:51.786Z` still shows the completed Chrome identity/OAuth timestamps from `2026-10-08T12:59:27Z` and zero refresh-token rows created after the pre-Firefox baseline. The reported Firefox attempt therefore remains incomplete. Asked the user to keep the add-on's background Console open during another attempt, report whether the authorization window closes automatically, and provide any new non-CSP error without callback parameters or credentials. No source, CSP, grant, or ownership change was made; 11.15 remains partial.

## Firefox session exchange blocked by CORS preflight

The user confirmed that the GitHub authorization window closes automatically, then reported a cross-origin failure on `http://localhost:3000/auth/github/session`: missing `Access-Control-Allow-Origin` with HTTP 204, followed by a failed CORS request. This newer evidence localizes the active blocker after browser handoff, at the session exchange request; it supersedes an unresolved WebAuthFlow redirect hypothesis. HTTP 204 here is consistent with an OPTIONS preflight, not a successful session response (the session endpoint returns 200 with a token pair).

The generated Firefox manifest includes `http://localhost:3000/*` in host_permissions and uses background scripts. A fresh local OPTIONS probe for allowed web origin `http://localhost:5173` returned 204 with the matching ACAO; a synthetic, unconfigured `moz-extension://` origin returned 204 without ACAO, reproducing the server response shape without submitting a handoff. No wildcard was added. Declared host permission alone does not prove that this installed Firefox extension has actually been granted it, so asked the user for the boolean result of `browser.permissions.contains({origins: ["http://localhost:3000/*"]})` before choosing a configuration or permission remedy. No code, CSP, session, identity, or provider grant was changed. Task 11.15 remains partial.

## Firefox port-bearing host permission corrected; live retry pending

The user reported `permissions.contains` true for the declared `http://localhost:3000/*`, and supplied the installed extension's public origin. Official [MDN match-pattern guidance](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns#host) explicitly states that Firefox does not support port numbers in these patterns. Mozilla [bug 2052000](https://bugzilla.mozilla.org/show_bug.cgi?id=2052000) reproduces granted-but-CORS-enforced background fetch with a port-bearing host permission, and confirms that removing the port restores access. Thus the earlier proposal to allow-list the instance UUID in API CORS was superseded by a concrete manifest defect; no Firefox origin was added to API configuration.

Updated only `apps/chrome-ext/vite.config.ts` so the Firefox API host permission uses the configured scheme and exact hostname without a port. Chrome retains its original origin pattern. In the localhost fixture, Firefox now emits `http://localhost/*`, while actual fetch URLs retain `http://localhost:3000`. Firefox cannot express a specific port in this permission, so its exact host permission necessarily covers all ports on that host. No wildcard host, CSP relaxation, provider permission, identifier, or data-collection declaration was introduced.

Verification: extension lint, typecheck, all 11 test files / 149 tests, and the standard Chrome + Firefox builds passed. Both local dev artifacts were then rebuilt. Artifact assertions confirmed Chrome hosts unchanged, Firefox portless localhost/GitHub hosts, retained Gecko ID and identity/storage permissions, retained data-collection declaration, and retained localhost:3000 background API URL. Optional remote manifest-schema validation remained unavailable; the existing lockfile synchronization warning remained. `git diff --check` passed. These checks do not establish a live Firefox session; asked the user to reload the temporary add-on, review any updated host permission, and repeat GitHub login plus popup restoration. Task 11.15 stays partial.

## Real Firefox GitHub login passed after host-pattern correction

After the rebuilt add-on reload/retry instructions, the user reported that login works. Read-only metadata at `2026-10-09T06:27:20.299Z` confirms exactly one new owner refresh-token row since the pre-Firefox baseline, created at `2026-10-09T06:26:28.167Z`. The existing identity and OAuth grant updated at `06:26:28.177Z` / `06:26:28.187Z`, while the original connectedAt remains `2026-10-08T12:26:33.425Z`. This is a completed real session/grant exchange, not merely popup repaint.

GitHub ID 143533474 (tsukanovoleksii) still has exactly one identity owner: the selected second GiTiempo account gitiempo@itsua.com. The original account remains unlinked. All three intended OAuth scopes remain present, and the second owner still has zero personal App connection rows. User-reported success after the portless Firefox host-pattern rebuild confirms the preceding CORS failure was resolved by this change without adding an instance UUID to API CORS. The success report follows the requested popup re-open check; no independent Firefox UI automation is claimed.

Real GitHub login now passed in both Chrome and Firefox. Task 11.15 remains partial pending explicit extension cancellation/failure and remaining cross-SPA alternative-login/session/logout checks. No new provider grant, App installation, account transfer, or database mutation was performed by the agent during verification.

## Firefox cancellation attempt completed another successful automatic sign-in

The user attempted the requested Sign out → GitHub login → close authorization window check, but the existing GitHub provider session authorized immediately and closed the window automatically; the popup shows an authenticated user. This is another successful login, not a cancellation pass. Read-only metadata at `2026-10-09T06:30:59.213Z` confirms a newer session created at `06:29:33.059Z` and identity/OAuth updates at `06:29:33.066Z` / `06:29:33.068Z`, with all scopes retained. Only one refresh row remains after the original Firefox baseline (the earlier `06:26:28.167Z` row is absent). No provider-grant revocation or link removal was performed.

To make a human cancellation observable before automatic authorization, the next requested fixture action is GitHub provider sign-out in Firefox, followed by GiTiempo extension Sign out, GitHub login, and closing the provider login window before entering credentials. Cancellation and 11.15 remain partial until that outcome is actually observed.

## Real Firefox cancellation exposed an unhandled provider rejection; fix awaiting live retry

The user closed the GitHub login window before entering credentials and reported no login, with background error `Uncaught (in promise) Error: User cancelled or denied access.` Unlike the earlier automatic authorization, this exercises actual cancellation. A read-only check at `2026-10-09T06:45:58.461Z` found zero refresh rows created after the previously observed successful Firefox login at 06:29:33. Current identity/OAuth metadata is 06:43:17.599Z / 06:43:17.601Z, reflecting an intervening grant update; no claim is made that it was unchanged since 06:29:33, or that the timing independently identifies the cancellation. Existing scopes and connectedAt remain intact. A subsequent safe baseline at 06:47:16.669Z records 15 older owner refresh rows and the same latest grant metadata; other client sessions were not removed by the agent.

Root cause in the background handler: both interactive provider calls were awaited outside `handleMutation`, so an identity-window cancellation rejected the async message handler before it could send a structured auth result. Added regression cases for GitHub and Google provider cancellation and a successful GitHub exchange/popup case. Before the fix, the two cancellation cases failed with no sendResponse and two unhandled rejections, matching the real Firefox symptom.

Moved provider authorization and session exchange together inside the existing `handleMutation` wrapper in both interactive sign-in handlers. Cancellation now returns an unauthenticated snapshot and the provider error, broadcasts the snapshot, and does not call session exchange or reopen the popup. The successful path retains exchange and best-effort popup restoration. No new abstraction, dependency, UI layout, backend behavior, token contract, or provider access was introduced.

Verification after the fix: focused background suite 15/15, full extension suite 11 files / 152 tests, lint, typecheck, and standard Chrome + Firefox builds passed. Both localhost dev artifacts were rebuilt and their API hosts inspected, retaining the preceding Firefox portless host permission correction. Optional remote schema validation remained unavailable and the pre-existing lockfile warning remained. `git diff --check` passed. Asked the user to reload the add-on and repeat the actual cancellation with a cleared background Console; no claim of a post-fix real cancellation pass yet. Task 11.15 remains partial.

## Corrected real Firefox cancellation passed; Admin session restore/logout checked

The user confirmed the post-reload cancellation behaves as requested: no sign-in and no `Uncaught (in promise)` error. Read-only metadata at `2026-10-09T06:53:02.384Z` found zero sessions created since the cancellation baseline at 06:47:16.669Z and unchanged identity/OAuth timestamps. All three scopes remain present. This establishes that the corrected cancellation commits neither a session nor a grant update. No provider permission or account ownership was changed.

Continued 11.15 in the Codex browser with the existing Admin tab at localhost:5174. The dashboard showed Oleksii Tsukanov in test1. Reload restored that same account/workspace and dashboard. Opened the profile menu and selected Sign out; after the transient unloading state, the login form with Email, Password, Google and GitHub options appeared. Alternative sign-in is now handed to the user so the exact method and account can be recorded. Firefox happy path and corrected cancellation passed; task 11.15 remains partial for the remaining browser/failure and cross-SPA cases.

## Admin email/password login and both SPA restore/logout checks

The user explicitly reported email/password login in Admin. The Codex browser showed Oleksii Tsukanov in GI Tiempo after sign-in; reload retained that account/workspace and dashboard. This newly pins the alternative method, unlike earlier reports that did not distinguish password from Google.

Used the visible User workspace menu link to move to localhost:5173. User-web independently restored the existing Admin gitempo session in GI Tiempo; this is expected separate-origin session state, not a GitHub ownership change or a claim that Admin password login switched the User account. Reload retained that User session. Selected User Sign out and verified `/login` with all three sign-in options. No timer action was taken. Asked the user to sign into User-web as Oleksii explicitly using email/password. Its new password login/reload check remains pending; no Google pass is claimed. Task 11.15 remains partial.

## User email/password login, restore, logout and disconnected Profile passed

Following the explicit User password-login request, the user reported ready. The Codex browser verified Oleksii Tsukanov in GI Tiempo on User Dashboard; reload retained that session. Opened Profile through the visible menu and verified the email oleksii.tsukanov@itsua.com and GitHub state Disconnected with Connect GitHub available. Selected Sign out and verified `/login`, completing the fresh User password-login/restore/logout sequence. Earlier Admin email/password login and reload already passed, and its logout was separately observed. No timer action or GitHub linking occurred.

A narrow read-only Firebase Admin lookup for the two known test accounts at `2026-10-09T07:00:13.912Z` returned only enabled-provider booleans: the original user has password and Google providers and is not disabled; the selected second GitHub owner has password and no Google provider. No provider was linked or credential changed. Started the existing User Continue with Google action and handed credential/account selection to the user. The parent form indicates pending sign-in; no completed Google login is claimed yet.


## User and Admin Google login, restore and logout passed on 2026-10-09

After the user completed the requested User Google sign-in, the Codex browser showed Oleksii Tsukanov in GI Tiempo. Reload restored the same account/workspace. Selected Sign out and waited for the User login form with all sign-in options. This completes the observed Google login/restore/logout sequence in User-web.

Navigated through the visible Admin workspace link, verified the existing Oleksii/GI Tiempo Admin session, and signed out before starting the separate Google test. The first Google attempt and one retry on that page returned Firebase `auth/network-request-failed` before account choice. After reloading the Admin login page, the same Continue with Google action completed automatically and opened the Oleksii/GI Tiempo dashboard. Reload retained the account/workspace; Sign out returned to the Admin login form. Admin Google login/restore/logout therefore passed after recovery. The initial transient network failure is retained as an observation, not treated as a proven source-code defect or silently omitted.

A bounded read-only repository check found both SPAs converge on the same shared Firebase popup implementation and use equal local Firebase configuration values (comparison only; no values printed). This rules out an observed configuration difference but does not establish the cause of the earlier network error. No source, environment configuration, provider permission, GitHub link, or timer was changed during this sequence. Task 11.15 remains partial for Chrome cancellation/failure and the remaining failed/reused-handoff acceptance cases.


## Chrome cancellation reported; intervening grant change requires clarification

The user completed the requested Chrome cancellation and reported `The user did not approve access.` This message is consistent with a cancelled identity flow, but its location (handled popup feedback versus an uncaught background rejection) and the final popup auth state were not yet explicitly reported.

The pre-test metadata baseline is `2026-10-09T07:08:49.883Z`. Read-only verification at `07:12:15.132Z` found zero currently retained owner refresh-token rows created after that baseline, exactly one link for the chosen second owner, zero links for the original user, and all three scopes present. Identity/OAuth timestamps did change from `06:43:17.599Z` / `06:43:17.601Z` to `07:09:45.727Z` / `07:09:45.730Z`. Therefore no claim is made that the whole test interval left the grant unchanged or never created a subsequently deleted session. Asked whether an automatic successful login/reconnect occurred before the cancellation and where the displayed error appeared. The cancelled flow remains partial pending that evidence or an isolated retry. No source, session, grant, account ownership or configuration was changed by this verification.


## Chrome cancellation UI outcome confirmed; isolated storage retry prepared

The user clarified that `The user did not approve access.` appeared in the extension, the extension remained signed out, and there was no `Uncaught` rejection. The user also explicitly denied any automatic successful login during the attempt. This confirms handled cancellation at the client boundary; it does not resolve the separately observed timestamp change.

A bounded read-only path audit found that a rejected Chrome WebAuthFlow never reaches `exchangeGithubSession`; denied callbacks return before persistence. Status reads do not update rows, and token refresh can update only the OAuth grant, not the identity. Both timestamps advance through the shared successful OAuth-save transaction used by session exchange and authenticated linking. No cause is attributed to the user or another client without runtime evidence. Prepared a fresh metadata baseline while the extension is already signed out, then requested only one cancelled Chrome attempt with no intervening sign-in/linking actions. Full no-storage-change acceptance remains pending that isolated result. No implementation code changed.


## Isolated Chrome cancellation passed on 2026-10-09

The user repeated only Continue with GitHub → close before login → reopen the already signed-out Chrome extension, and reported the same handled denial message with no login or uncaught rejection. The fresh baseline at `2026-10-09T07:15:03.937Z` and read-only result at `07:16:58.650Z` confirm zero new retained owner sessions, unchanged identity and OAuth timestamps, one link for the chosen second owner, zero links for the original account, and three scopes retained. Thus the isolated cancelled attempt created no observed session or grant change. The earlier interval's unexplained timestamp change remains recorded separately; this repeat does not retrospectively explain it.

Real successful GitHub login/restoration and handled cancellation now passed for both Chrome and Firefox. Both SPAs passed password and Google login, reload restoration and logout. Task 11.15 stays partial while the controlled HTTP failed/reused-handoff checks for both configured extension destinations are being completed on an isolated database. No real provider code is captured or replayed, and the current local database remains untouched by those controlled probes.


## Extension and cross-SPA acceptance 11.15 completed

The controlled HTTP probe subsequently passed all four scenarios, including exact Chrome/Firefox destinations, failed consumed handoffs, successful exchange, and replay without persistence changes. The disposable database was cleaned up. This supplies the deliberate controlled failure/replay facet alongside the real provider/browser passes above; no real provider code was captured or replayed. Task 11.15 is now checked. Overall change progress is 55/67, with other live fixtures and umbrella 10.3 still open. Strict OpenSpec validation and `git diff --check` passed after recording the acceptance evidence.


## Live OAuth revocation/recovery fixture prepared

The user completed the requested second-account password login. Admin Dashboard showed Admin gitempo in GI Tiempo; Settings retained connected identity tsukanovoleksii and the separate personal-App authorization guidance. Expanding Add organization showed exactly ITSUA-team and My-test-org-for-clock. No organization was selected or added.

Read-only baseline at `2026-10-09T07:28:15.341Z` records one identity link for the chosen second owner, all three OAuth scopes, zero personal App rows, and content snapshots of workspace organization policies/installations. Opened GitHub Authorized OAuth Apps and the visible Gitiempo test auth detail. A boolean-only comparison confirmed its client ID matches local sign-in configuration. The provider page lists the expected read-only org/project/email permissions, Allowed for the two test organizations, and Restricted for two others. No Request action was clicked.

Prepared user handoff for Revoke access of that exact test OAuth App, with subsequent local recovery planned. No revocation, provider permission expansion, Disconnect, installation action or database mutation was performed by the agent. Revoked-token behavior and recovery remain pending. This fixture has no personal App grant, so it cannot by itself establish preservation of usable App-backed private Projects in partial-scope task 11.5.


## Real OAuth revocation preserved identity/session/workspace state; stale Settings recovery found

The user confirmed Revoke access of Gitiempo test auth. Its link disappeared from Authorized OAuth Apps. Reloading Admin Settings retained Admin gitempo/GI Tiempo and connected identity tsukanovoleksii. Organization discovery failed with `GitHub OAuth authorization not found`; it did not return stale organizations as successful data. However, the first page load still showed the Add organization selector/manual input under cached ready connection state, with Try again and an error toast, rather than the existing Reconnect recovery guidance.

Read-only verification at `2026-10-09T07:34:39.160Z` found the full identity row unchanged, exactly one identity link, zero OAuth grants for that owner, zero personal App rows as before, and identical content hashes/counts for workspace organization-policy and installation tables. Thus provider rejection cleared only OAuth access while preserving identity/workspace state; the Admin session remained usable after reload. This fixture has no personal App credentials, so no live claim is made about usable App-backed Projects.

A second reload showed the correct connected-identity card with Reconnect GitHub guidance and no Add organization control. This establishes a stale frontend capability cache after the first request invalidated the OAuth grant, rather than an identity unlink or permission bypass. A bounded frontend status-refresh fix/regression is being prepared so the recovery state appears without requiring the second reload. No manual organization submission, provider reauthorization, Disconnect or workspace mutation has been performed yet. Task 11.5 remains partial pending the corrected UI/recovery and other consent facets.


## Real authenticated OAuth consent cancellation and recovery handoff

Opened the existing User Profile in a separate Codex tab. It restored the selected second user Admin gitempo / gitiempo@itsua.com, showed the same connected GitHub ID/login and original connectedAt, and exposed Reconnect plus separate Authorize GitHub data. No timer action was taken. This current observed User session supersedes assumptions about its earlier signed-out state; no new alternative-login pass is inferred from this restoration alone.

Started Reconnect, then selected Cancel on GitHub's actual consent page before authorizing. Profile returned with `GitHub authorization was cancelled before the connection completed`, remained on the same account with connected identity and missing organization-access guidance, and cleaned handled callback parameters from its URL. This exercises real provider consent denial for authenticated reconnect; it is not a new guest-login denial or a database session-count audit.

Started a fresh Reconnect and handed the Authorize Gitiempo test auth step to the user. The page requests read-only organization/team membership, Projects and email access, with the two test organizations Allowed; no Request action was taken for restricted organizations. Reauthorization and final restored discovery are still pending. The bounded Settings stale-capability fix is being implemented/tested independently.

## OAuth recovery and bounded Settings regression fix verified on 2026-10-09

On continuation, User Profile had returned from consent to the same Admin gitempo / gitiempo@itsua.com identity, without the missing-organization-permission guidance. Read-only verification at `2026-10-09T07:46:25.528Z` confirmed the same account-link ID, GitHub ID/login and original connectedAt, one OAuth grant with `read:org`, `read:project`, and `user:email`, and zero personal App rows. Workspace policy/installation row counts remained unchanged. Recovery content hashes were not independently revalidated with the original baseline serializer; the earlier revocation hash-preservation result above remains the separate verified observation.

Reloading Admin Settings restored Add organization. Expanding its selector showed ITSUA-team and My-test-org-for-clock, while the separate personal GitHub App authorization guidance remained. No organization was submitted and no timer was changed. The provider's Gitiempo test auth detail page also showed the restored grant with the same expected permissions and organization restrictions.

The bounded Admin fix now refetches authoritative GitHub connection status after organization discovery fails. The existing reconnect gate hides Add organization when that refreshed capability requires authorization. Discovery eligibility remains stable while status refetches, so a transient discovery error with a still-ready capability retains manual entry and does not silently retry/clear the discovery error. New composable and assembled SettingsView regressions failed before implementation and passed after it. Admin validation passed all 65 files / 526 tests, typecheck, and lint (two existing warnings in unrelated GithubCallbackView.vue). No layout or PrimeVue exception was introduced; the approved Admin Settings GitHub Workspace Access card was inspected.

Prepared a second real test-app revocation handoff to verify the corrected gate on the first Settings load. That live repeat remains pending the user; no new provider revocation or permission expansion was performed by the agent. Task 11.5 remains partial for that final live repeat and the remaining partial-scope/private App-backed Projects facets.

## Corrected first-load revoked-access recovery passed live

The user confirmed the second Revoke access. GitHub visibly reported `Gitiempo test auth has been revoked from your account`. Reloaded Admin Settings exactly once, then waited for the existing Reconnect instruction. Without a second reload or manual retry, Settings retained Admin gitempo/GI Tiempo and connected tsukanovoleksii, showed the organization Reconnect gate, and had zero selector and zero Add organization buttons. The discovery error toast remained handled. A full-page browser screenshot showed the connected account and recovery instruction together. This verifies the bounded fix against the real provider-invalid-token path, separately from the controlled regression tests.

The same second User Profile retained GitHub ID 143533474 and its original connectedAt, with organization permission recovery and the separate App-data action. Prepared Reconnect consent for restoring the three original OAuth scopes; the final provider authorization is pending the user. No workspace setting, installation or timer was changed by the agent. Partial-scope and usable personal-App private Projects remain separate open facets of 11.5.

## Final OAuth restoration after the corrected live repeat

The user completed Authorize. User Profile returned to the same Admin gitempo / gitiempo@itsua.com with connected tsukanovoleksii and no organization-permission warning. Reloading Admin Settings restored Add organization; its expanded selector again showed ITSUA-team and My-test-org-for-clock. The separate personal App-data authorization guidance remained, as expected for this OAuth-only fixture.

Read-only final verification at `2026-10-09T07:51:45.781Z` confirmed the original account-link ID, GitHub ID/login and connectedAt, one OAuth grant with all three requested scopes, zero personal App rows for the second owner, and zero identity links for the original owner. The fixture is restored to the user's chosen ownership. No workspace policy was submitted or timer changed. The revoke → automatic first-load recovery → reconnect → restored discovery sequence is complete. Task 11.5 stays partial only for its remaining live partial-scope/private App-backed Projects facets; overall progress remains 55/67, and the change is not archived or newly committed.

## Separate personal App authorization and isolated private import — 2026-10-09

For the chosen second owner, selected Authorize GitHub data. The existing provider consent allowed the flow to return automatically to Profile with handled success and clean URL. The separate App-data warning/action disappeared; account identity stayed connected. Read-only comparison at `2026-10-09T07:55:07.506Z` found one personal App row with the matching immutable GitHub ID, unchanged identity metadata and unchanged complete OAuth-row digest. This was reuse of existing provider consent; no new consent-page click or installation was performed by the agent.

The existing GI Tiempo project-import form correctly reported that no GitHub organization was approved for that workspace. Prepared a separate local manual-test workspace, `GitHub OAuth acceptance 2026-10-09` (`097791a6-2de7-4b55-9925-c45f0c00a48d`), by inserting only the workspace, default settings and the chosen second user's admin membership transactionally. Existing workspace settings were not edited.

In that workspace's real Settings UI, added My-test-org-for-clock from the OAuth suggestions. Both policy-add success and automatic App-access-confirmation success appeared. Reload retained the policy; its organization no longer appeared in suggestions (ITSUA-team remained). This confirms automatic verification of the existing installation for the new workspace, without a new provider installation.

Selected New project → Import from GitHub. The approved organization and private Project #1 appeared. Its preview showed linked private repository My-test-org-for-clock/test-repo and two scanned issues. Selected and added the private Project. The Projects table showed one private GitHub Repo project and a successful creation toast. No existing project was modified. This is a second actual App-backed private Project import for the chosen second owner, distinct from prior original-account import evidence.

For the next assigned-member test, prepared the original, fully disconnected Oleksii account as an ordinary member with one project assignment in this new local workspace. Added one saved GitHub task/reference copied from the prior live issue #1 fixture into the imported project. This is explicit local fixture preparation, not a claim that a fresh issue was browsed/created by that member. User login through password/Google is pending. The second owner's GitHub binding remains in place; no personal Disconnect or timer action was performed in this preparation.

## Assigned member after full Disconnect — 2026-10-09

The user completed alternative login as oleksii.tsukanov@itsua.com. Selected the isolated GitHub OAuth acceptance 2026-10-09 workspace under ordinary Member role; Profile explicitly showed Disconnected. Projects displayed only the assigned imported private project and saved GitHub issue #1 task. Starting its timer through the task row succeeded without a personal connection.

In the separate second-account Admin session, removed that member from the project's assignment and saved. The table showed zero members. After User reload the private project was absent, while the owned running timer remained in the top bar. Its dialog reported Project not found, retained enabled Stop timer, and stopped successfully. A new Start timer was disabled. The existing controlled HTTP assignment scenario independently proves direct unassigned-start rejection without time-entry/assignment side effects; no authenticated browser API call or token extraction was used.

This first pass exposed a stale static helper that asked the fully disconnected member to Connect personal GitHub. The bounded fix changes only that helper to workspace-administrator guidance for App installation/organization access. The approved Top-Bar Timer Task Picker screen LKDTn was inspected; dialog structure, fields and footer are unchanged, with no PrimeVue compromise. A regression protects error visibility and enabled owned Stop. User validation passed 50 files / 530 tests, typecheck and lint with zero errors (11 existing warnings outside the changed files).

Repeated the live timer start after restoring assignment; temporarily removed only the new test project's assignment through bounded local fixture SQL, then reloaded User Projects. The project stayed hidden; the running dialog showed the new workspace guidance and no personal Connect instruction. Stop succeeded again and new Start remained disabled. Restored assignment afterward. Read-only verification found exactly two completed web time entries of 95s and 24s, one restored assignment and zero personal identity links for the original member. No test timer remains running.

These are saved-task timer checks against a real verified installation and private imported project. The issue reference was explicitly copied during local fixture preparation, so they do not claim fresh issue browsing by the disconnected member. Existing workspaces were not edited. GitHub identity remains owned by gitiempo@itsua.com, as the user requested. Task11.14 is complete using live member/UI evidence plus the separately recorded controlled direct-denial facet.

After refining the timer regression to the actual task-load error, its exact-file run passed 35 tests; changed-file lint and User typecheck passed again. This complements the earlier full User run of 530 tests and the independent live repeat.
