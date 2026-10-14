# Chrome Web Store privacy and release checklist

This checklist is the package-specific record for the GiTiempo Chrome extension. It distinguishes facts established from the source/package, statements that require the publisher's confirmation, and values actually entered in Chrome Web Store (CWS). A draft is not evidence that a CWS Dashboard field has been reviewed or saved.

## Historical September candidate identity and status

The tables and declarations below retain the September candidate review. For the current 0.1.1 implementation, use the [13 October external-reference inventory](#external-reference-candidate-inventory--13-october-2026); the historical review does not certify its package or revised public policy.

Historical public-identity evidence retained from the incoming branch: on 16 September 2026, [itsua.com](https://itsua.com/) identified ITSUA as an engineering studio and published `hello@itsua.com`, Sakala tn 7-2, Tallinn, 10141, Estonia, and VAT `EE102549430`. This corroborates public identity, not control of GiTiempo processing or monitoring of `admin@itsua.com`; those rely on the publisher confirmations below.

| Item | Status | Evidence or required action |
| --- | --- | --- |
| Package version | Historical technical fact | `0.1.0` in the reviewed September package and generated manifest. Current source is `0.1.1`. |
| Local Chrome candidate | Reviewed candidate, 2026-09-25; historical package evidence | `apps/chrome-ext/dist/gitiempo-chrome-0.1.0-review-20260925.zip`, SHA-256 `9f7b5b690b9f8fcad08062f4057092d126cc40b40a5a61663915fb4b17e951a2`. All 10 files were compared byte-for-byte with the tested unpacked build; `manifest.json` is at the root, with no macOS metadata. Includes Project URL fix and removal of PR matches/broadcasts. Not uploaded or Store-approved. Earlier archives, including the temporary `c62ddc5f…` review archive and the unqualified ZIP in `dist`, are superseded and must not be submitted. On 12 October the named review archive is absent from this checkout; the historical hash and runtime evidence remain the identity of the reviewed candidate. The currently present unqualified ZIP has a different hash and is not approved by this review. |
| Candidate API environment | Production configuration and narrowed Chrome runtime pass verified | The reviewed 25 September candidate manifests use `https://api.gitiempo.com/*`; app navigation targets `https://app.gitiempo.com`. The 14 September staging candidate below and the current development outputs are not that reviewed package. |
| Public privacy-policy URL | Published revision verified, 2026-10-12 | Store URL: `https://gitiempo.com/privacy`, redirecting to `/privacy/`. Both staging and production anonymously served the 22 September 2026 revision with content identical to the September policy build. Footer navigation, canonical, sitemap and script absence verified; see the dated evidence below. This covers the September policy, not the later OAuth or external-reference deltas. |
| Controller and privacy contact | Publisher-confirmed; production inputs verified 2026-09-25 | The publisher confirmed `ITSUA` as controller and `admin@itsua.com` as its monitored contact. Actual GitHub production-environment public variables match, and a local build with them passed. The revised deployed output now matches; anonymously verified 2026-10-12. |
| CWS Dashboard values | Publisher-owned follow-up; not verified by the agent | On 2026-09-25 the publisher took over actual Store field and policy-URL verification. Outside agent scope and not an engineering-handoff blocker. The publisher will compare the final values with this checklist and the approved policy before submission. |

## Historical September technical data-flow inventory

The extension has no extension analytics. Landing-site GA4 is a separate, consent-gated website feature and is not part of this extension declaration.

| Data and handling | Where it is handled | Recipient/use | Candidate CWS category | Status |
| --- | --- | --- | --- | --- |
| Account profile data such as name, email, and avatar | GiTiempo API and extension UI; session data is held in `chrome.storage.local` | Authenticate the member and show the signed-in extension state | Personally identifiable information | Technical fact; final category selection pending Dashboard review |
| Firebase authentication state and GiTiempo access/refresh tokens | Firebase extension persistence and `chrome.storage.local`; the extension clears its local session on sign-out | Sign-in, session refresh, and authenticated API requests | Authentication information | Technical fact; final category selection pending Dashboard review |
| Current supported GitHub page URL and title | Read locally to recognise a supported issue or organisation-project issue pane; pull requests are unsupported | Resolve page context; no passive browsing-history collection | Web history (supported-page URLs) and Website content (title/page content) | Conservative draft; compare with the actual Dashboard definitions, including local processing |
| GitHub repository and issue number | Sent to the GiTiempo API when starting a timer; the service subsequently retrieves issue information from GitHub | Link a timer to the selected GitHub work item | Website content | Technical fact |
| Manual timer start/stop and resulting time-entry records | GiTiempo service and authorised workspace views | Core time-tracking function | **User activity — candidate; requires explicit publisher/Dashboard review** | Do not omit merely because the action is manual; do not mark checked until reviewed in CWS |

The extension does not use the browsing-history API, monitor unrelated pages, or collect a user's full browsing history. This does not exempt locally processed URLs from disclosure. The conservative draft includes **Web history** for supported GitHub page context; the actual Dashboard selection remains unverified. Similarly, manual timer actions and records justify a conservative **User activity** draft despite the absence of passive mouse/keyboard monitoring. These are category decisions for this candidate, not claims that every form of data within a category is collected.

No health, payment, or personal-communications feature was found in the extension audit. Do not infer a definitive exclusion for arbitrary GitHub title content; review the actual Dashboard wording against this inventory before saving choices.

## Draft CWS declarations

### Single purpose

> GiTiempo lets authenticated workspace members start and stop GiTiempo timers from GitHub issues and organisation-project issue panes.

Status: draft derived from the package. Confirm the CWS listing description uses the same scope.

### Permissions and hosts

| Manifest entry | Justification | Status |
| --- | --- | --- |
| `identity` | Runs the browser-mediated sign-in flow for the extension. | Technical fact |
| `storage` | Stores the GiTiempo session and a token-free provider-cleanup retry marker in extension-local storage. | Technical fact |
| `https://api.gitiempo.com/*` in this candidate's `host_permissions` | Allows authenticated timer and session requests to the configured production GiTiempo API. | Current manifest inspected; Chrome email/password and timer pass completed |
| `https://github.com/*` in `host_permissions` | Enables the GitHub page integration and matching supported-page context. | Technical fact |
| `tabs` | Not requested. Matching GitHub tab queries use existing host access; opening tabs and sending messages do not require broad tab metadata access. | Both manifests inspected; Chrome native popup context, broadcasts and navigation verified; Firefox deferred |

### Remote code

Proposed Dashboard value: **No remote code**. Source and the hashed candidate contain local background, popup, and content scripts, with no remote script tags, dynamic imports, `importScripts`, or fetch-to-execution paths found. Authentication pages and API responses are data/authentication exchanges, not remote scripts executed inside the extension. This is an inspected candidate declaration; the actual Dashboard value remains unverified.

The bundled Zod dependency contains two `Function("")` capability probes and a schema-parser JIT path. These operate on bundled schema definitions, not remotely fetched code. The default MV3 CSP rejects the capability probe and Zod falls back to its non-JIT parser. The Chrome email/password, timer and native-popup pass succeeded without weakening CSP. This local fallback is not remote executable code.

Historical final review, 2026-09-25: the exact archive identified above matches all tested build files. Its manifest requests only `identity` and `storage`, production API and GitHub hosts, and local scripts; content matches exclude PR paths. Source and bundle review found no remote script tags, remote imports, `importScripts`, `eval` calls or fetch-to-execution paths. The two bundled empty-Function probes remain local capability checks. This is package review, not an actual saved Dashboard declaration or guarantee of Store approval.

The following inspections describe the historical staging candidate, not certification of the current production-configured archive. If the upload artifact changes, repeat the final inspection and update its hash.

| Historical package inspection | Reviewer | Date | Result |
| --- | --- | --- | --- |
| SHA-256 | Codex artifact inspection | 2026-09-14 | `9c654ecd6428b01bef5f745389d161e23b959cfeeb80a88659bcf2aedc307eed` |
| Remote-code inspection | Codex source/artifact review | 2026-09-14 | No remote executable sources or loading paths found in the hashed candidate; local Zod capability/fallback path reviewed as described above. Actual Store review remains external. |
| Chrome manifest/permission inspection | Codex artifact inspection | 2026-09-14 | MV3, version `0.1.0`; `identity`, `storage`; staging API + GitHub hosts only; local module service worker, popup and content scripts; default MV3 CSP. |
| Firefox manifest/permission inspection | Codex artifact inspection | 2026-09-14 | Same permissions/hosts/version; Firefox background scripts and Gecko settings retained. |

## Publisher facts and certifications

| Statement | Status | Notes |
| --- | --- | --- |
| Data is used only to provide GiTiempo functionality. | Publisher-confirmed | Confirm this still holds for the release package and policy. |
| Data is not sold, used for third-party advertising, creditworthiness, or lending. | Publisher-confirmed | Record the responsible publisher reviewer before CWS submission. |
| Transfers are limited to the core function and comply with the applicable CWS policy. | Publisher-confirmed, 2026-09-22 | The publisher confirmed the stated data-use and transfer restrictions as actual practice. This confirms Limited Use purposes, not specific international-transfer contracts. EU hosting does not establish contractual safeguards for all processing; applicable provider agreements remain a separate private evidence check. |
| Human access to extension user data is limited to permitted exceptions. | Publisher-confirmed, 2026-09-22 | The publisher confirmed actual adherence to the stated human-access restrictions. This is operator attestation, not an independent access-control audit or a claim that the unavailable earlier internal-review document was inspected. |
| Processor/recipient list and processing locations/transfers are complete. | Publisher-confirmed, 2026-09-22 | The publisher explicitly confirmed the completeness of the documented provider list and applicable international-processing arrangements. The list covers Hetzner (Germany), Cloudflare, Firebase/Google, GitHub, Backblaze B2 (EU-Central), Google/Gmail, and Slack error notifications. Slack alerts contain no users' personal data and are described separately from personal-data recipients. This is publisher attestation: individual provider contracts, specific SCC instruments, redaction mechanisms and provider retention settings were not independently inspected or inferred. GitHub sign-in uses the GiTiempo API, not Firebase. |
| Retention, deletion-request process, and backup treatment are accurate. | Reported retention; manual deletion publisher-confirmed, 2026-09-22 | Research reports records retained until manual deletion, 90 daily / 52 weekly encrypted backup snapshots, a 30-day monitoring-log configuration, and no fixed host application/access-log cleanup. Token/invitation expiry is not row deletion. The publisher confirmed that ITSUA receives requests through `admin@itsua.com` and a technical administrator can manually delete the profile, related personal records and Firebase account where present. No deletion was executed or independently tested in this review. No fixed response SLA, automatic deletion, immediate backup erasure or guaranteed anonymization is promised. |
| The production controller/contact/date are correct. | Verified publication, 2026-10-12 | Both live environments display `ITSUA`, `admin@itsua.com` and 22 September 2026; production-input local build matches. Historical publisher attestation is unchanged; no new operational audit is inferred. |

## Publication gates

1. Build and inspect the final Chrome artifact, fill in its SHA-256, manifest, permissions, and remote-code results.
2. **Publisher-confirmed, 22 September 2026:** controller/contact, documented provider-list completeness and international-processing arrangements, stated Limited Use practices, and manual deletion responsibility/capability are recorded above. This gate records operator confirmation; it is not an independent operational or contractual audit.
3. **Verified, 12 October 2026, for the September candidate:** the approved 22 September policy is already deployed to staging and production. Anonymous policy URL, footer navigation, sitemap, controller, contact and revision checks passed. Repeat this gate after updating the policy for later OAuth behavior or changing the candidate.
4. **Publisher-owned; outside agent scope:** open the real CWS Dashboard, select data categories using the current Dashboard definitions, compare all entries and the policy URL with this document and the policy, and record the reviewer/date. The publisher explicitly took over this check on 25 September 2026; no further Dashboard login or access is requested by the agent.
5. Submit only after every gate is complete. Do not place credentials, keys, test-account details, or session tokens in this document.

The agent's engineering handoff covers package, publisher-fact and public-policy evidence, with Store review transferred to the publisher. That handoff can complete without agent access to the Dashboard; it does not mark the publisher's review passed or certify final Store submission readiness.

## Local policy revision and dependencies

The local revision dated 22 September 2026 corrects unsupported operational assurances in the 16 September draft. It separates reported storage practices from token validity, removes unsupported uniform log-retention, SCC and security guarantees, and corrects the GitHub sign-in provider. Subsequent publisher confirmations establish that Slack alerts contain no users' personal data, the stated Limited Use restrictions match actual practices, and ITSUA's technical administrator handles contact-based deletion manually. Existing extension storage, logout and optional homepage analytics disclosures remain intact. The policy publication was verified on 12 October 2026. This is not independent verification of production controls or Store readiness.

The [CAKE.com privacy policy](https://cake.com/privacy) was reviewed as an editorial reference for separating collection, use, recipients, retention and rights. Its company roles, features, processors, contractual safeguards and operational promises were not adopted as GiTiempo facts.

### Minimum privacy submission checks

These checks focus the CWS review preparation; they do not replace the broader operational work in [issue #421](https://github.com/ITSUA-team/GiTiempo/issues/421) or applicable legal obligations.

| Question | Current answer / remaining action |
| --- | --- |
| What data is handled and for what purpose? | Source-backed inventory above covers account/authentication, local GitHub context, linked work and manual timers. The policy also discloses diagnostic logs and separates optional homepage analytics. Recheck against the final release package. |
| Who receives it? | Named personal-data recipients are disclosed. The publisher confirmed provider-list completeness and applicable international-processing arrangements, and that Slack alerts contain no users' personal data. |
| Are actual uses, transfers and human access consistent with Limited Use? | Publisher confirmed the stated practices on 2026-09-22; actual CWS declarations still need comparison. |
| Is every policy promise supported? | Unsupported assurances removed; the documented provider arrangements, deletion-request ownership and manual capability are publisher-confirmed. The policy makes no blanket SCC, fixed deletion SLA or uniform log-retention promise. Operator confirmation is not a tested deletion or independent operational audit. |
| Do the package, public policy and Dashboard agree? | The September candidate package review and 22 September public policy are documented. Actual CWS fields remain publisher-owned and unverified. Later OAuth behavior and replacement packages require a new policy/package comparison before release. |

The broader issue additionally tracks access/MFA review, audit coverage, documented retention criteria, and an incident-response procedure. Do not label those tasks completed solely because they are not separate CWS Dashboard fields. Keep supporting access and contractual evidence private; record only a sanitized conclusion, responsible role and review date here.

The archived [`add-landing-ga4-analytics` change](../openspec/changes/archive/2026-09-16-add-landing-ga4-analytics/tasks.md) owns analytics behavior, now reflected in the main specs. This change only documents its optional consent, sanitized events, and withdrawal contract. The archive retains outstanding external Tag Assistant/GA4 DebugView verification; merging the archive does not mark that check complete here.

Design inspection: approved privacy desktop/mobile and extension unauthenticated/error frames inspected on 2026-09-14. `Ext Sign-out Cleanup Pending` (`Jr6mK`) reuses the existing error presentation without an authenticated account menu and offers `Retry sign-out` before another login.

## Extension runtime verification and scope (2026-09-25)

The publisher narrowed this test pass to Chrome with manual email/password sign-in using a non-sensitive test account, then explicitly removed Pull Request support. Firefox is deferred; Google and GitHub sign-in are excluded from further testing in this pass. The design and task acceptance scope now record these decisions. Untested flows are not passes; the known Google failure remains a release limitation even though it is outside this manual pass.

| Check | Result / evidence |
| --- | --- |
| Build and automated checks, 22 September | Extension lint, typecheck, 146 tests in 11 files, and Chrome/Firefox builds passed. Both generated manifests use MV3, version `0.1.0`, `identity` and `storage`, production API and GitHub hosts, with no broad `tabs` permission. Build success is not browser-runtime verification. |
| Chrome loading, 22 September | Production-configured unpacked extension enabled; Chrome reported zero manifest/runtime errors at initial inspection. The tested extension ID is `pkboohjobohaoakjacjoajpjcabemibl`; the manifest has no stable key, so this is not an asserted Store ID. |
| Email/password login and normal logout, 22 September | Manual test-account login succeeded. GiTiempo session storage and a Firebase authenticated-user record were present. After the UI Sign out completed and the popup page reloaded, both were absent and the provider-cleanup-pending marker was false. No credentials or token values are recorded. A popup reload is not proof of service-worker/browser restart behavior. |
| Google sign-in, earlier observation | Failed before credential entry with `400 redirect_uri_mismatch` for this unpacked build. Not resolved; further provider testing is excluded by the updated scope. |
| GitHub sign-in | Authorization form reached, but login/logout was not completed. Excluded from the current pass, not passed. |
| Firefox | Earlier temporary-install attempt reported `Extension is invalid`; cause was not established. Native browser control was also unavailable. Deferred at the publisher's request, not passed. |
| Email/password and navigation, 25 September | Manual sign-in succeeded again; background snapshot reported authenticated with no active timer. Actual dashboard/profile clicks opened `https://app.gitiempo.com/` and `/profile`. The web app required its own login; the publisher manually signed into the same test account there. |
| Issue controls and cross-tab updates, 25 September | On public `ITSUA-team/GiTiempo#421`, Start Timer created a timer and a second already-open issue tab displayed Running / Stop Timer. Stopping from that second tab changed the first tab back to Start Timer without reloading. |
| Backend-unavailable logout, 25 September | CDP blocked `https://api.gitiempo.com/*` only for the test extension's background service worker. A runtime snapshot confirmed the actual background request failed with “Unable to reach GiTiempo API.” UI Sign out then completed: GiTiempo session absent, Firebase authenticated-user record absent, cleanup-pending false. The issue control switched to the signed-out state. The block was removed and its restoration confirmed; production infrastructure and the web app's networking were not changed. This proves local cleanup, not successful server revocation while unreachable. |
| Active-timer and web-session invariants, 25 September | A second test timer was running before the blocked-backend logout. After logout, a full reload of the independently signed-in web app retained its session and showed the same issue timer still running (00:02:13 at inspection). The timer was then stopped using the web UI, which changed to Start timer. Two test time entries were created by this pass; both timers were stopped, and records were not deleted. |
| Runtime restart after logout, 25 September | `chrome.runtime.reload()` initially disabled the unpacked extension with Chrome's `unsupportedDeveloperExtension` reason, with no manifest/runtime errors. Enabling Developer mode in this isolated test browser restored it. Reopening the popup started the runtime and confirmed authenticated false, no GiTiempo session, no Firebase authenticated-user record, and cleanup-pending false. This verifies extension-runtime restart, not a full browser-process restart. |
| Pull-request scope correction, 25 September | Initial verification found no control on real PR #422 despite the original checklist promising PR support. The publisher explicitly requested removal of PR support. Content-script matches, broadcasts, README, declarations and OpenSpec scope now exclude PRs; the parser continues rejecting them. A regression verifies that an already-injected issue control unmounts when navigating to a PR, and remounts when returning to an issue. A fresh PR load is not expected to inject a script. |
| Organization-project issue pane, 25 September | Initial verification of the publisher-supplied Project #7 / issue #318 URL without `/views/{view}` found a real parser gap. Fixed to accept base and view URLs; parser, content and popup regressions cover this. The control appeared on the supplied base-URL pane after reloading the extension. Following manual sign-in, GitHub used `/projects/7/views/1?...` during the final timer pass: Start Timer succeeded and the same running timer appeared in another Project tab after that tab was reloaded to attach the rebuilt content script. Stop Timer there succeeded. This checks cross-tab shared timer state, not a live no-reload broadcast on that previously stale tab; no-reload broadcasts were separately verified on issue tabs. One additional test time entry was created and stopped, with no Project data changed. |
| Native popup context, 25 September | Opened the real browser-action popup via `chrome.action.openPopup({windowId})` over the active Project issue tab, not `popup.html` as a normal tab. Its separate popup target measured 320×480 and displayed `#318 Add GitHub sign-in through Firebase Authentication`, `ITSUA-team/GiTiempo`, and Start Timer after the test timer stopped. No broad `tabs` permission was needed. |
| Current runtime boundaries | Narrowed Chrome email/password, supported-surface and timer pass complete. All three test timers were stopped; records retained. The archive is byte-identical to the tested unpacked build, not a Store-installed package. Firefox and additional providers remain deferred/excluded, with the known Google failure unresolved. |
| Automated regressions, 25 September | All 146 tests in 11 files, lint, typecheck and Chrome/Firefox builds passed after the Project/PR changes. The adjusted issue→PR→issue regression also passed. Builds do not certify Firefox runtime. |

## Public-policy verification and engineering handoff (2026-10-12)

This handoff completes the original change for the Chrome candidate reviewed on 25 September and the policy dated 22 September. It does not certify the current development ZIP, the later GitHub OAuth account-linking delta, or Store submission readiness.

Anonymous HTTP/content checks completed at **14:21:02 UTC / 17:21:02 Europe/Kyiv on 12 October 2026**. Codex Browser subsequently verified real homepage-footer → policy → home navigation on production and the homepage-footer → policy transition on staging, without signing in. Optional production analytics was declined before navigating.

| Environment | Public route and result | Existing deployment evidence |
| --- | --- | --- |
| Production | `https://gitiempo.com/privacy` redirects to `https://gitiempo.com/privacy/`, HTTP 200. `ITSUA`, `admin@itsua.com`, 22 September 2026; correct mailto and canonical; homepage footer link works; `https://gitiempo.com/sitemap-index.xml` includes the policy. | [Successful production run](https://github.com/ITSUA-team/GiTiempo/actions/runs/36740236238), last updated 30 September 2026 at 15:55:58 UTC, revision `a8fd1a5e303439213453f2b1d4a419cd8974c21d`. |
| Staging | `https://gitiempo-landing.itsua.dev/privacy` redirects to `/privacy/`, HTTP 200. Same controller/contact/date; environment-correct canonical; homepage footer link works; staging sitemap includes the policy. | [Successful staging run](https://github.com/ITSUA-team/GiTiempo/actions/runs/36740236590), last updated 30 September 2026 at 15:57:07 UTC, same revision. |

Both policies have one H1, no script tags or hydrated islands, and no noindex directive or robots restriction. All approved extension storage/logout, Limited Use, recipients, retention/deletion and optional analytics disclosures are present. The policy source at the deployed Git revision is identical to this checkout; normalized main-content text from both live pages exactly matches a fresh production-origin build with the confirmed controller/contact. The local build deliberately disabled optional GA4; it is a policy-content comparison, not a claim that production homepage analytics is disabled. Release logs are no longer downloadable (GitHub HTTP 410), so no Cloudflare Worker version ID is asserted; the successful GitHub release revision and actual live content are the recorded evidence. No deployment was triggered during this verification.

Fresh landing lint, typecheck, all 17 tests and build passed. These checks preserve required-input failures, disclosures, footer/sitemap behavior and the framework-free policy. The four-width keyboard/visual checks remain the unchanged-policy evidence recorded on 25 September; they were not repeated in this documentation-only session. Strict OpenSpec validation and whitespace checks passed for the completion record. No product source or runtime behavior changed.

### Candidate and remaining release conditions

- The reviewed September archive is version `0.1.0`, SHA-256 `9f7b5b690b9f8fcad08062f4057092d126cc40b40a5a61663915fb4b17e951a2`, with package and narrowed Chrome-runtime checks recorded above. Its named archive is no longer present in this checkout. Preserve/retrieve that exact artifact and verify its hash before using this historical review; a rebuild or changed artifact requires a fresh package review.
- The currently present `apps/chrome-ext/dist/gitiempo-chrome-0.1.0.zip` has SHA-256 `4da7507a2d6bc5194303e6172dc60960fd92aaea080d2d1ea65a462d7d28f992`. The sibling `dist/chrome` build uses a localhost API host. These development artifacts are not the reviewed production candidate and must not be submitted using the September evidence.
- Publisher confirmation of controller/contact, recipients and Limited Use practices remains the recorded 22 September attestation, not a new independent operational audit. The actual CWS Dashboard review remains owned by the publisher and unverified; no Dashboard access, edits, upload or submission occurred.
- Before releasing the later OAuth account-linking implementation, reconcile its disclosures with the public policy and release inventory: optional consent for identity/organization/project discovery; `user:email read:org read:project` scopes without `repo`; server-only encrypted OAuth access/refresh credential storage and retention; Disconnect deleting local OAuth/App credentials and identity ownership with bounded best-effort provider revocation, while preserving GiTiempo sessions, installation access and time history. Disconnect is not account deletion or immediate backup erasure. These are source-derived follow-up requirements from the 8 October coordination note, not covered by the September handoff.
- The recorded Google `redirect_uri_mismatch`, excluded GitHub-provider runtime pass and deferred Firefox runtime verification remain explicit release limitations. Closing this change does not turn those results into passes or resolve the external analytics verification.

## Final local policy and publication checks (2026-09-25)

- Landing lint, typecheck, all 17 tests, build, and the GA4-off/on privacy browser regression passed again. At 390/768/1024/1440px, real Tab focused the visible skip link, Enter navigated to `#main-content`, and the next Tab visibly focused the monitored contact link. Each viewport had one H1, eight H2 headings, readable text and no horizontal overflow. This resolves the keyboard gap in the historical notes below.
- Actual homepage footer Privacy Policy click and policy Back to home click succeeded in the local production-input build. The homepage analytics consent overlay was first dismissed using Decline; no analytics consent was granted. The policy itself emits no scripts or hydrated islands.
- Actual GitHub production public variables were read: controller `ITSUA`, contact `admin@itsua.com`, site `https://gitiempo.com`, app `https://app.gitiempo.com/`, admin `https://gitiempo-admin.gitiempo.com`, API `https://api.gitiempo.com`, and configured GA4. The final local build used those values. No secrets were read or recorded.
- Anonymous production and staging fetches returned HTTP 200 but still the **14 September 2026** policy, not the revised 22 September policy. Deployment and revised public verification remain open; existing production deployment workflow is available, but no commit, push or deployment was performed in this pass.
- Earlier opening of the CWS devconsole redirected to Google sign-in; no Dashboard values were inferred, changed or saved, and no package was uploaded or submitted. The publisher subsequently took over this check. The agent's login request is withdrawn; actual Store review is now an external publisher-owned follow-up, not an agent blocker.

## Verification evidence (2026-09-22)

- Landing lint, typecheck, all 17 tests, and the final local build passed again after the publisher confirmations. The rebuilt policy contains `ITSUA`, `admin@itsua.com`, 22 September 2026, the no-personal-data Slack disclosure and administrator-led manual deletion, with no stale notification claim, test-fixture identity, scripts or hydrated islands.
- The privacy browser regression passed with GA4 absent and configured at 390/768/1024/1440px. It verified both route forms, heading structure, body text size, no horizontal overflow, programmatic focus visibility, canonical/sitemap/footer links and separation from homepage analytics. Full-page screenshots at all four widths were inspected; the existing layout is preserved. Native keyboard traversal and click activation were not verified, so task 4.7 remains open.
- Strict OpenSpec validation passed. Optional CLI telemetry could not reach its host; validation itself exited successfully. Package-manager checks warned that installed dependencies are out of sync with the lockfile; no dependency changes were made.
- Publisher-fact and certification tasks 4.1 and 5.3 were initially reopened. Follow-up replies on the same date confirmed no users' personal data in Slack alerts, adherence to the stated Limited Use practices, and ITSUA / `admin@itsua.com` intake with manual deletion by a technical administrator covering the profile, related personal records and Firebase account where present. The publisher subsequently explicitly confirmed provider-list completeness and international-processing arrangements. Tasks 4.1 and 5.3 are complete on publisher attestation. No live deletion, specific transfer contract, redaction implementation, access audit or fixed SLA was inferred from these replies.
- No deployment, final extension-package verification, CWS Dashboard change, Store submission or issue closure was performed.

## Verification evidence (2026-09-16)

Historical record: the local checks below were previously recorded. The claims of fully verified operational practices were reassessed on 22 September; they are not sufficient evidence to close the reopened publisher-fact gate.

- The previous policy revision added a processor list with regions (§4), retention and security statements (§5), and deletion-request wording (§6), dated 16 September 2026. Several operational assurances lacked supporting evidence and are superseded by the 22 September corrections above.
- Landing lint, typecheck, and 17 tests passed. Build verified with production-env values: `/privacy/index.html` generated successfully; no secrets, host addresses, IP addresses, or internal configuration values found in the output.
- The previous revision cited an internal `Privacy_Policy.md` as evidence of deletion, access and transfer practices. That document is not available in this checkout. The supplied operator research establishes some infrastructure facts but leaves organizational practices incomplete; see the current publisher-facts table for the corrected status.
- Still pending: production deployment and anonymous verification of the live policy URL, packaged browser tests with real accounts, and actual CWS Dashboard review.

## Verification evidence (2026-09-14)

The 16 September staging/production checks recorded below verified the older 14 September policy. They are retained as historical evidence, not completion of publication tasks for the revised 22 September policy.

- Extension lint, typecheck, and both browser builds passed; 144 tests passed. Regressions cover independent provider/session cleanup, pending backend revoke, provider/storage failures, retry after module reset, and the existing refresh-race/timer behavior. Popup and content tests verify the signed-out transition. API/SPAs/provider website logout code is unchanged; real-account checks remain pending.
- Tab API inventory: popup active-tab lookup reads supported GitHub context and sends page-context messages; background queries supported GitHub URL patterns and broadcasts snapshots; popup opens configured app/profile tabs. Existing issue, pull-request, organization-project, navigation, and broadcast tests pass with the shared manifest's `tabs` permission removed. Mocked tests do not prove browser permission enforcement.
- Landing lint, typecheck, and 17 tests passed. `pnpm --filter landing-web exec node tests/privacy-browser.mjs` passed two actual builds (GA4 absent and configured) at 390/768/1024/1440px in Chrome for Testing. It checks HTTP 200 for `/privacy` and `/privacy/`, emitted identity/contact/canonical, sitemap and footer links, one H1/eight H2 headings, no policy scripts/islands/consent/timer runtime, no horizontal overflow, readable body size, and programmatic focus visibility. Full-page screenshots were visually inspected at all four widths.
- Browser test fixtures use `Privacy route test` / `privacy@example.invalid` and an invalid test domain intentionally; these are test-only environment overrides, not production controller inputs. The source still requires controller/contact and rejects absent or malformed values.
- After fixture tests, rebuilt the local landing with publisher-confirmed `ITSUA` and `admin@itsua.com` and verified those values, 14 September 2026, and absence of scripts in the generated policy.
- Staging verification, 16 September 2026 at 12:16:24 UTC: `https://gitiempo-landing.itsua.dev/privacy/` rendered `ITSUA`, `admin@itsua.com`, and the 14 September 2026 revision date. A real click on the staging homepage footer's `Privacy Policy` link returned to that public route. `https://gitiempo-landing.itsua.dev/sitemap-index.xml` returned HTTP 200 and listed `https://gitiempo-landing.itsua.dev/privacy`.
- Anonymous production verification, 16 September 2026 at 12:00:41 UTC: `https://gitiempo.com/privacy/` returned HTTP 200 after the canonical `/privacy` to `/privacy/` redirect and rendered the ITSUA controller name, the `admin@itsua.com` mailto link, and the 14 September 2026 revision date. The homepage footer linked to `/privacy`, and the sitemap index listed the privacy URL; no sign-in was required. The latest successful [production deployment run](https://github.com/ITSUA-team/GiTiempo/actions/runs/35078709182) completed at 09:20:15 UTC and deployed revision `2f51c54397e11a5cde50e61bbcfac280a63c0d0a`, providing the release revision for task 6.2.
- Landing keyboard and footer interaction verification, 16 September 2026: the browser regression uses native Tab then Enter at all required widths and confirms the skip link reaches and activates `#main-content`. In the production page opened in Codex Browser, a real click on the homepage footer's `Privacy Policy` link navigated to `https://gitiempo.com/privacy/`; a native Tab focused `Skip to main content`, and Return activated its `#main-content` target. Task 4.7 is complete.
- Strict validation of `prepare-chrome-web-store-privacy` and `git diff --check` passed. The active analytics delta and its outstanding external verification were not changed.
- Not performed: packaged Google/email/GitHub real-account flows, real Chrome/Firefox permission checks across supported surfaces, or actual CWS Dashboard edits. This verification did not trigger a deployment or Store submission.

## References

- [Chrome Web Store Privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Chrome Web Store privacy policy requirements](https://developer.chrome.com/docs/webstore/program-policies/privacy)
- [Chrome Web Store user data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Chrome Web Store Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
- [Extension package guide](../apps/chrome-ext/README.md)
- [Deployment and production-policy gate](deployment.md#chrome-web-store-privacy-policy-release-gate)

## OAuth account-linking coordination — 2026-10-08

The account-linking change adds backend encrypted OAuth token storage for identity and organization discovery alongside retained personal App credentials. The existing OAuth App requests `user:email read:org read:project`; it does not request `repo`. Tokens remain server-only; the extension keeps the existing token-pair and destination contracts. Full Disconnect deletes active identity ownership and both personal credential families, attempts bounded provider revocation, and preserves GiTiempo sessions, workspace installation access and time history. It is not account deletion or immediate backup erasure.

Before publishing this build, the privacy change owner must reconcile GitHub OAuth purpose, token retention/deletion and consent disclosures with the current policy and release inventory. This source update does not claim publication, provider revocation guarantees, changed backup retention or a completed Store review. Saved GitHub timer assignment examples remain owned by `require-project-assignment-for-saved-github-timers`; installation and assignment authorization must not be described as repaired by personal OAuth consent.


## External-reference candidate inventory — 13 October 2026

This inventory describes the local coordinated QA build, based on `75cdb08d` plus the uncommitted `external-github-extension-tracking` implementation. It does not certify a production package, the public policy deployment, or Store submission. Package and manifest versions are both **0.1.1**. The ZIPs contain the same ten executable/assets files as their unpacked build; each manifest uses Manifest V3 and only `identity` / `storage`, with GitHub issue/organization-Projects content matches. No broad `tabs` permission or new remote executable source was introduced.

| Local candidate | SHA-256 | API host permission |
| --- | --- | --- |
| `apps/chrome-ext/dist/gitiempo-chrome-0.1.1-external-reference-candidate.zip` | `b12c6261a77b63728f054510d7f5152e8b32305b00783e02fc91d6a11cc14cbd` | `http://127.0.0.1:3019/*` |
| `apps/chrome-ext/dist/gitiempo-firefox-0.1.1-external-reference-candidate.zip` | `59342c2717d44fb70491901daaa9b327c46c94af1bb668b85c46cd0ec028529f` | `http://127.0.0.1/*` (Firefox match patterns omit ports) |

Both also permit `https://github.com/*`. These are local QA artifacts, not distribution builds. A rebuild with a production API origin creates a new artifact/hash requiring its own review. The September 0.1.0 handoff above remains historical evidence only.

The current Start action sends exactly `githubRepo`, `issueNumber`, bounded issue-specific `issueTitle`, and the direct canonical HTTPS `issueUrl` to GiTiempo. Incidental query parameters, fragments and the enclosing Projects URL are discarded. Repository/issue context is supplied by the user and does not attest access to GitHub. Existing managed mappings retain installation-backed retrieval and authorization with no external fallback; external-reference starts record this context without a GitHub API request. The latter creates/reuses one private project/task mapping per workspace and grants derived reads only for the caller's own entries and exact tasks, including running entries. Admins and separately authorized participants retain established rights. Removing the last own entry removes derived access while shared records remain. Personal GitHub linking is optional and separate from GiTiempo sign-in.

GiTiempo tokens remain in extension-local storage; existing Firebase sign-in persistence, credential-free cleanup flag, logout, retention, recipients, deletion and Limited Use disclosures remain applicable. No Store Dashboard access, edits, upload or submission occurred. Publisher-owned Store confirmation remains separate.

The revised local privacy source is dated **13 October 2026**. Landing lint, typecheck, all 17 tests, static build and the two analytics-configured/unconfigured browser runs passed. At 390/768/1024/1440px, route forms, canonical/sitemap/footer metadata, keyboard skip/contact focus, readable text and no overflow were checked. The policy contains no scripts or hydrated framework islands; mobile and desktop screenshots were inspected. Browser fixtures use a clearly invalid test identity/domain, not production inputs.

The initial anonymous production policy retrieval at `https://gitiempo.com/privacy/` returned HTTP 403. A later anonymous check on 13 October returned **HTTP 200**, but the published policy was still dated **22 September 2026** and described repository/number-only transmission followed by GitHub title retrieval. That does not match this candidate's title/canonical-URL payload and external no-provider flow. The revised policy is therefore **confirmed stale and release-blocking**, rather than inaccessible. Deploy and anonymously verify the new revision before distributing the extension; this implementation did not deploy or publish. See [extension completion QA](../openspec/changes/external-github-extension-tracking/qa-extension-completion.md). The user subsequently attested successful private-customer direct/Projects Start/Stop in Chrome and Firefox as admin and in the requested member repeat; see the follow-up QA evidence for the independent role-verification limit. Full Firefox transition/error coverage remains pending. Rename/transfer, policy conversion, synchronization and automatic rebinding remain deferred.

See [current QA coverage](../openspec/changes/external-github-extension-tracking/qa.md) and [controlled API requests](../openspec/changes/external-github-extension-tracking/qa-api.md).

### GitHub navigation registration follow-up — 13 October 2026

The current local unpacked development builds register their content script on `https://github.com/*`, with pull-request paths excluded, so GitHub same-document navigation from a repository, issue list or Projects board can reach a supported issue. The script validates supported issue identity before extracting its title or mounting controls; pull requests, boards without an issue pane and unrelated GitHub pages remain unsupported for timer starts. Existing GitHub host permission already covered this origin; no new permission or browsing-history API was added. The earlier ZIP hashes and narrow content matches above identify historical QA packages, not these rebuilt unpacked outputs. Current tree hashes and navigation results are recorded in [extension follow-up](../openspec/changes/external-github-extension-tracking/qa-extension-follow-up.md). No package was uploaded or submitted.

### Current local package snapshot — 13 October 2026

The following archives snapshot the final local development outputs after the navigation/private-heading fixes. All ten files in each archive were compared byte-for-byte with its unpacked output; `manifest.json` is at the root. These replace the earlier QA ZIPs for local review. They use localhost and are not production distribution packages.

| Current local archive | SHA-256 | API host permission |
| --- | --- | --- |
| `apps/chrome-ext/dist/gitiempo-chrome-0.1.1-local-final-20261013.zip` | `5e4eaaa99bd77aa0ada81afe54e049ad65e0428d030b97d99a516b7d7c9d0792` | `http://localhost:3000/*` |
| `apps/chrome-ext/dist/gitiempo-firefox-0.1.1-local-final-20261013.zip` | `56d788ba1ad9047e92b79ee7533a0ecba3045bab75208876bbf7a3e0b3403f8f` | `http://localhost/*` |

Both remain version `0.1.1`, with `identity`/`storage` permissions, the existing GitHub host permission, GitHub-wide navigation registration and PR exclusions. The executable HTML/JavaScript contains no remote script tags; executable entries point to packaged scripts. The Firefox port omission is match-pattern syntax; its bundled API origin remains localhost:3000. Package evidence is retained in `/private/tmp/gitiempo-final-extension-package-evidence.json`. Runtime coverage and remaining browser gaps are recorded in the QA reports; a package hash does not certify unexecuted scenarios.

The landing build produced during this continuation used the local staging environment values, so its output is not a production deployment artifact. The existing production workflow obtains public URLs, controller/contact and Cloudflare credentials from the GitHub production environment, rebuilds, then deploys. Publishing that revision and verifying the anonymous production page remain outstanding; no workflow was dispatched.

### Production-configured review candidates — 13 October 2026

Source revision `e0714382` was built in an isolated copy with explicit production configuration. The following archives are preserved under `apps/chrome-ext/dist/release-candidate-20261013/`; they are review artifacts and have not been distributed or submitted.

| Archive | SHA-256 | API host permission |
| --- | --- | --- |
| `gitiempo-chrome-0.1.1-production-candidate-20261013.zip` | `f0bb01c92dd93c340cc0911705c91fd063462f43d34f1fa5e1266b7159d1a49b` | `https://api.gitiempo.com/*` |
| `gitiempo-firefox-0.1.1-production-candidate-20261013.zip` | `7ae8bbcafa05f637d534af8060c1b5f34b05b8f876fd77ef589e8602d23fe8f3` | `https://api.gitiempo.com/*` |

Both remain version **0.1.1** with exactly ten files matching their unpacked candidates, only `identity`/`storage` permissions, the existing GitHub host access, and packaged executable entries. Direct artifact inspection found no remote script tags, literal remote dynamic imports, `importScripts` or `eval` calls. The existing local schema-parser capability/JIT expressions remain bundled. SchemaStore network validation was unavailable; manifest entries were inspected directly. Existing local development outputs were restored and byte-verified against both `local-final` ZIPs.

The revised policy also has a separate production-configured static build under `apps/landing-web/dist/release-candidate-20261013/`, using ITSUA and admin@itsua.com. Its privacy HTML is dated **13 October 2026**, has canonical `https://gitiempo.com/privacy/`, contains no scripts, and has SHA-256 `ef05acfaeac913bc49fb888fd21d2cb2c44b5aac915d61232c9b83eafaf29d80`. The anonymous public page still served **22 September 2026** on this follow-up, so publication remains a distribution gate. The effective production workflow's user-app variable also needs confirmation: it is absent at environment/repository scope, and organization-scope access returned 403. No production setting or workflow was changed. See [release inspection](../openspec/changes/external-github-extension-tracking/qa-release-final.md) for configuration and evidence boundaries.

The user explicitly chose to keep these artifacts local and skip production verification on 13 October 2026. That clause is deferred for this implementation pass, not recorded as passed. The matching published-policy check remains required before future distribution.
