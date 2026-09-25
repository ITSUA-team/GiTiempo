# Chrome Web Store privacy and release checklist

This checklist is the package-specific record for the GiTiempo Chrome extension. It distinguishes facts established from the source/package, statements that require the publisher's confirmation, and values actually entered in Chrome Web Store (CWS). A draft is not evidence that a CWS Dashboard field has been reviewed or saved.

## Release identity and status

| Item | Status | Evidence or required action |
| --- | --- | --- |
| Package version | Technical fact | `0.1.0` in `apps/chrome-ext/package.json` and the generated-manifest source. |
| Local Chrome candidate | Final local review archive, 2026-09-25 | `apps/chrome-ext/dist/gitiempo-chrome-0.1.0-review-20260925.zip`, SHA-256 `9f7b5b690b9f8fcad08062f4057092d126cc40b40a5a61663915fb4b17e951a2`. All 10 files were compared byte-for-byte with the tested unpacked build; `manifest.json` is at the root, with no macOS metadata. Includes Project URL fix and removal of PR matches/broadcasts. Not uploaded or Store-approved. Earlier archives, including the temporary `c62ddc5f…` review archive and the unqualified ZIP in `dist`, are superseded and must not be submitted. |
| Candidate API environment | Production configuration and narrowed Chrome runtime pass verified | Current generated manifests use `https://api.gitiempo.com/*`; app navigation targets `https://app.gitiempo.com`. The 14 September staging candidate below is historical, not the current package. |
| Public privacy-policy URL | Revised draft pending publication | Intended Store URL: `https://gitiempo.com/privacy`. The local revision dated 22 September 2026 has not been deployed or anonymously verified. Earlier deployment evidence does not verify this revision. |
| Controller and privacy contact | Publisher-confirmed; production inputs verified 2026-09-25 | The publisher confirmed `ITSUA` as controller and `admin@itsua.com` as its monitored contact. Actual GitHub production-environment public variables match, and a local build with them passed. Revised deployed output remains pending. |
| CWS Dashboard values | Publisher-owned follow-up; not verified by the agent | On 2026-09-25 the publisher took over actual Store field and policy-URL verification. Outside agent scope and not an engineering-handoff blocker. The publisher will compare the final values with this checklist and the approved policy before submission. |

## Technical data-flow inventory

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

Final review, 2026-09-25: the exact archive identified above matches all tested build files. Its manifest requests only `identity` and `storage`, production API and GitHub hosts, and local scripts; content matches exclude PR paths. Source and bundle review found no remote script tags, remote imports, `importScripts`, `eval` calls or fetch-to-execution paths. The two bundled empty-Function probes remain local capability checks. This is package review, not an actual saved Dashboard declaration or guarantee of Store approval.

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
| The production controller/contact/date are correct. | Pending verification of revised publication | The local revision uses the previously confirmed controller/contact configuration and a 22 September 2026 revision date. Verify the built and deployed values after publication. |

## Publication gates

1. Build and inspect the final Chrome artifact, fill in its SHA-256, manifest, permissions, and remote-code results.
2. **Publisher-confirmed, 22 September 2026:** controller/contact, documented provider-list completeness and international-processing arrangements, stated Limited Use practices, and manual deletion responsibility/capability are recorded above. This gate records operator confirmation; it is not an independent operational or contractual audit.
3. Deploy the approved policy to production and anonymously verify the policy URL, footer link, sitemap entry, controller, contact, and effective date.
4. **Publisher-owned; outside agent scope:** open the real CWS Dashboard, select data categories using the current Dashboard definitions, compare all entries and the policy URL with this document and the policy, and record the reviewer/date. The publisher explicitly took over this check on 25 September 2026; no further Dashboard login or access is requested by the agent.
5. Submit only after every gate is complete. Do not place credentials, keys, test-account details, or session tokens in this document.

The agent's engineering handoff covers package, publisher-fact and public-policy evidence, with Store review transferred to the publisher. That handoff can complete without agent access to the Dashboard; it does not mark the publisher's review passed or certify final Store submission readiness.

## Local policy revision and dependencies

The local revision dated 22 September 2026 corrects unsupported operational assurances in the 16 September draft. It separates reported storage practices from token validity, removes unsupported uniform log-retention, SCC and security guarantees, and corrects the GitHub sign-in provider. Subsequent publisher confirmations establish that Slack alerts contain no users' personal data, the stated Limited Use restrictions match actual practices, and ITSUA's technical administrator handles contact-based deletion manually. Existing extension storage, logout and optional homepage analytics disclosures remain intact. This is a local release draft, not independent verification of production controls or Store readiness.

The [CAKE.com privacy policy](https://cake.com/privacy) was reviewed as an editorial reference for separating collection, use, recipients, retention and rights. Its company roles, features, processors, contractual safeguards and operational promises were not adopted as GiTiempo facts.

### Minimum privacy submission checks

These checks focus the CWS review preparation; they do not replace the broader operational work in [issue #421](https://github.com/ITSUA-team/GiTiempo/issues/421) or applicable legal obligations.

| Question | Current answer / remaining action |
| --- | --- |
| What data is handled and for what purpose? | Source-backed inventory above covers account/authentication, local GitHub context, linked work and manual timers. The policy also discloses diagnostic logs and separates optional homepage analytics. Recheck against the final release package. |
| Who receives it? | Named personal-data recipients are disclosed. The publisher confirmed provider-list completeness and applicable international-processing arrangements, and that Slack alerts contain no users' personal data. |
| Are actual uses, transfers and human access consistent with Limited Use? | Publisher confirmed the stated practices on 2026-09-22; actual CWS declarations still need comparison. |
| Is every policy promise supported? | Unsupported assurances removed; the documented provider arrangements, deletion-request ownership and manual capability are publisher-confirmed. The policy makes no blanket SCC, fixed deletion SLA or uniform log-retention promise. Operator confirmation is not a tested deletion or independent operational audit. |
| Do the package, public policy and Dashboard agree? | Final local package verified above. Revised public deployment and actual CWS fields remain unverified. Record deployment revision, URL, reviewer and date when performed. |

The broader issue additionally tracks access/MFA review, audit coverage, documented retention criteria, and an incident-response procedure. Do not label those tasks completed solely because they are not separate CWS Dashboard fields. Keep supporting access and contractual evidence private; record only a sanitized conclusion, responsible role and review date here.

The existing `add-landing-ga4-analytics` change owns analytics behavior. This change only documents its optional consent, sanitized events, and withdrawal contract. Its outstanding external Tag Assistant/GA4 DebugView verification remains open and has not been marked complete here.

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

- Extension lint, typecheck, and both browser builds passed; 144 tests passed. Regressions cover independent provider/session cleanup, pending backend revoke, provider/storage failures, retry after module reset, and the existing refresh-race/timer behavior. Popup and content tests verify the signed-out transition. API/SPAs/provider website logout code is unchanged; real-account checks remain pending.
- Tab API inventory: popup active-tab lookup reads supported GitHub context and sends page-context messages; background queries supported GitHub URL patterns and broadcasts snapshots; popup opens configured app/profile tabs. Existing issue, pull-request, organization-project, navigation, and broadcast tests pass with the shared manifest's `tabs` permission removed. Mocked tests do not prove browser permission enforcement.
- Landing lint, typecheck, and 17 tests passed. `pnpm --filter landing-web exec node tests/privacy-browser.mjs` passed two actual builds (GA4 absent and configured) at 390/768/1024/1440px in Chrome for Testing. It checks HTTP 200 for `/privacy` and `/privacy/`, emitted identity/contact/canonical, sitemap and footer links, one H1/eight H2 headings, no policy scripts/islands/consent/timer runtime, no horizontal overflow, readable body size, and programmatic focus visibility. Full-page screenshots were visually inspected at all four widths.
- Browser test fixtures use `Privacy route test` / `privacy@example.invalid` and an invalid test domain intentionally; these are test-only environment overrides, not production controller inputs. The source still requires controller/contact and rejects absent or malformed values.
- After fixture tests, rebuilt the local landing with publisher-confirmed `ITSUA` and `admin@itsua.com` and verified those values, 14 September 2026, and absence of scripts in the generated policy. Production environment inputs and the deployed artifact have not been verified; task 4.4 is partially complete for that reason.
- Physical keyboard traversal and actual footer-click navigation are not certified: this host's agent-browser input actions reported success without activating the link. Direct URL requests/navigation, valid hrefs, and programmatic focus checks passed. Task 4.7 remains open for that final interaction check.
- Strict validation of `prepare-chrome-web-store-privacy` and `git diff --check` passed. The active analytics delta and its outstanding external verification were not changed.
- Not performed: packaged Google/email/GitHub real-account flows, real Chrome/Firefox permission checks across supported surfaces, revised staging or production deployment, or actual CWS Dashboard edits. No deployment or Store submission was triggered.

## References

- [Chrome Web Store Privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Chrome Web Store privacy policy requirements](https://developer.chrome.com/docs/webstore/program-policies/privacy)
- [Chrome Web Store user data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Chrome Web Store Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
- [Extension package guide](../apps/chrome-ext/README.md)
- [Deployment and production-policy gate](deployment.md#chrome-web-store-privacy-policy-release-gate)
