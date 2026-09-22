# Chrome Web Store privacy and release checklist

This checklist is the package-specific record for the GiTiempo Chrome extension. It distinguishes facts established from the source/package, statements that require the publisher's confirmation, and values actually entered in Chrome Web Store (CWS). A draft is not evidence that a CWS Dashboard field has been reviewed or saved.

## Release identity and status

| Item | Status | Evidence or required action |
| --- | --- | --- |
| Package version | Technical fact | `0.1.0` in `apps/chrome-ext/package.json` and the generated-manifest source. |
| Local Chrome candidate | Technically verified, 2026-09-14 | `apps/chrome-ext/dist/gitiempo-chrome-0.1.0.zip`, SHA-256 `9c654ecd6428b01bef5f745389d161e23b959cfeeb80a88659bcf2aedc307eed`; 10 files, sorted entries and fixed ZIP timestamps. The ignored ZIP is rebuilt locally; hash it again after any rebuild. |
| Candidate API environment | Staging; production package pending | Built host is `https://api.gitiempo.itsua.dev/*`. Confirm the intended release backend/configuration and rebuild/review before Store upload. This ZIP is a local test candidate. |
| Public privacy-policy URL | Public revision pending deployment | `https://gitiempo.com/privacy` is live with the 14 September 2026 policy. The locally revised 16 September 2026 policy adds confirmed processor, retention, deletion-boundary, and backup facts; deploy and anonymously re-verify it before using it for Store submission. |
| Controller and privacy contact | Publisher-confirmed, reconfirmed 2026-09-16 | The publisher confirmed `ITSUA` as controller and reconfirmed that `admin@itsua.com` is its monitored privacy contact. Confirm the production build uses these same values. |
| Public ITSUA identity evidence | Website-verified, 2026-09-16 | [itsua.com](https://itsua.com/) identifies ITSUA as an engineering studio and publishes `hello@itsua.com`, Sakala tn 7-2, Tallinn, 10141, Estonia, and VAT `EE102549430`. Its contact page also lists Tallinn and Kharkiv studios. This corroborates ITSUA's public identity, but does not by itself prove that ITSUA controls GiTiempo processing or that `admin@itsua.com` is monitored. |
| CWS Dashboard values | Not yet verified | Compare every final Dashboard choice and policy URL with this checklist and the approved policy; record the review date and publisher account below. |

## Technical data-flow inventory

The extension has no extension analytics. Landing-site GA4 is a separate, consent-gated website feature and is not part of this extension declaration.

| Data and handling | Where it is handled | Recipient/use | Candidate CWS category | Status |
| --- | --- | --- | --- | --- |
| Account profile data such as name, email, and avatar | GiTiempo API and extension UI; session data is held in `chrome.storage.local` | Authenticate the member and show the signed-in extension state | Personally identifiable information | Technical fact; final category selection pending Dashboard review |
| Firebase authentication state and GiTiempo access/refresh tokens | Firebase extension persistence and `chrome.storage.local`; the extension clears its local session on sign-out | Sign-in, session refresh, and authenticated API requests | Authentication information | Technical fact; final category selection pending Dashboard review |
| Current supported GitHub page URL and title | Read locally to recognise a supported issue, pull request, or organisation project page | Resolve page context; no passive browsing-history collection | Web history (supported-page URLs) and Website content (title/page content) | Conservative draft; compare with the actual Dashboard definitions, including local processing |
| GitHub repository and issue number | Sent to the GiTiempo API when starting a timer; the service subsequently retrieves issue information from GitHub | Link a timer to the selected GitHub work item | Website content | Technical fact |
| Manual timer start/stop and resulting time-entry records | GiTiempo service and authorised workspace views | Core time-tracking function | **User activity — candidate; requires explicit publisher/Dashboard review** | Do not omit merely because the action is manual; do not mark checked until reviewed in CWS |

The extension does not use the browsing-history API, monitor unrelated pages, or collect a user's full browsing history. This does not exempt locally processed URLs from disclosure. The conservative draft includes **Web history** for supported GitHub page context; the actual Dashboard selection remains unverified. Similarly, manual timer actions and records justify a conservative **User activity** draft despite the absence of passive mouse/keyboard monitoring. These are category decisions for this candidate, not claims that every form of data within a category is collected.

No health, payment, or personal-communications feature was found in the extension audit. Do not infer a definitive exclusion for arbitrary GitHub title content; review the actual Dashboard wording against this inventory before saving choices.

## Draft CWS declarations

### Single purpose

> GiTiempo lets authenticated workspace members start and stop GiTiempo timers from supported GitHub issue, pull-request, and organisation-project pages.

Status: draft derived from the package. Confirm the CWS listing description uses the same scope.

### Permissions and hosts

| Manifest entry | Justification | Status |
| --- | --- | --- |
| `identity` | Runs the browser-mediated sign-in flow for the extension. | Technical fact |
| `storage` | Stores the GiTiempo session and a token-free provider-cleanup retry marker in extension-local storage. | Technical fact |
| `https://api.gitiempo.itsua.dev/*` in this candidate's `host_permissions` | Allows authenticated timer and session requests to the currently configured staging GiTiempo API. | Verified local artifact; production origin remains a release check |
| `https://github.com/*` in `host_permissions` | Enables the GitHub page integration and matching supported-page context. | Technical fact |
| `tabs` | Not requested. Matching GitHub tab queries use existing host access; opening tabs and sending messages do not require broad tab metadata access. | Both generated manifests inspected; actual Chrome/Firefox integration checks remain pending |

### Remote code

Proposed Dashboard value: **No remote code**. Source and the hashed candidate contain local background, popup, and content scripts, with no remote script tags, dynamic imports, `importScripts`, or fetch-to-execution paths found. Authentication pages and API responses are data/authentication exchanges, not remote scripts executed inside the extension. This is an inspected candidate declaration; the actual Dashboard value remains unverified.

The bundled Zod dependency contains two `Function("")` capability probes and a schema-parser JIT path. These operate on bundled schema definitions, not remotely fetched code. The default MV3 CSP rejects the capability probe and Zod falls back to its non-JIT parser. Do not confuse this local fallback with remote executable code; confirm runtime behavior during the still-pending packaged browser tests. No CSP weakening was introduced.

| Final package inspection | Reviewer | Date | Result |
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
| Transfers are limited to the core function and comply with the applicable CWS policy. | Partially confirmed | The operator research identifies the current providers below, but does not confirm the applicable contractual transfer safeguards or every transfer exception. |
| Human access to extension user data is limited to permitted exceptions. | Open publisher fact | Restricted infrastructure access is reported, but Cloudflare/Firebase membership, MFA enforcement, access auditing, and an incident-response process remain unverified or incomplete. Do not make a final Limited Use certification on this evidence alone. |
| Processor/recipient list and processing locations/transfers are complete. | Partially confirmed | Operator research received 2026-09-16 identifies Hetzner (Germany), Cloudflare (web delivery/security), Backblaze B2 (EU-Central backups), Firebase/Google (authentication and transactional email), and GitHub (sign-in and issue integration). Confirm the applicable transfer safeguards and Cloudflare/Firebase account access before treating the list as final. |
| Retention, deletion-request process, and backup treatment are accurate. | Partially confirmed | The live database has no automatic cleanup or fixed retention period; account deletion is not available through the UI or API. Encrypted backups retain up to 90 daily and 52 weekly snapshots. Application/access logs have no fixed retention period; monitoring logs retain up to 30 days. A documented manual deletion-request process and retention criteria remain open. |
| The production controller/contact/date are correct. | Verified, 2026-09-16 | Anonymous production output showed `ITSUA`, `admin@itsua.com`, and 14 September 2026. It corresponds to the latest successful `Deploy landing production` workflow run, revision `2f51c54397e11a5cde50e61bbcfac280a63c0d0a`. |

## Publication gates

1. Build and inspect the final Chrome artifact, fill in its SHA-256, manifest, permissions, and remote-code results.
2. Completed in the local revision on 16 September 2026: update the public policy with confirmed processors, locations, backup periods, and deletion boundaries. Keep the organizational-access and transfer-safeguard gaps visibly open.
3. Completed 16 September 2026: anonymously verify the production policy URL, footer link, sitemap entry, controller, contact, effective date, deployment revision, and timestamp.
4. Open the real CWS Dashboard, select data categories using the current Dashboard definitions, compare all entries with this document and the policy, and record the reviewer/date.
5. Submit only after every gate is complete. Do not place credentials, keys, test-account details, or session tokens in this document.

## Local policy revision and dependencies

The local policy revision dated 16 September 2026 adds operator-researched processor/location, retention, deletion-boundary, and backup disclosures to the prior verified authentication/storage, GitHub, and optional GA4 disclosures. It remains a release draft while transfer safeguards, Cloudflare/Firebase access controls, and organizational human-access practices remain unconfirmed. The Limited Use wording is a proposed publication commitment; operational research alone does not verify organizational compliance.

## Operator research received 2026-09-16

The operator supplied environment research used only for the public facts stated above. It confirms that production application and database processing occur at Hetzner in Germany; web delivery/security uses Cloudflare; encrypted database backups are stored in Backblaze B2's EU-Central region; Firebase/Google provide authentication and transactional email; and GitHub supports sign-in and linked issue retrieval. The research also confirms no automatic deletion of primary account/workspace/time-entry records, no self-service or API account-deletion flow, backup retention of up to 90 daily and 52 weekly snapshots, non-fixed application/access-log retention, and 30-day monitoring-log retention.

Sensitive operational details, access identities, host addresses, credentials, and configuration paths from that research are deliberately not recorded here. Before closing task 4.1, the publisher still needs to confirm transfer safeguards, Cloudflare/Firebase human access and MFA, access-audit coverage, a deletion-request process, and organizational Limited Use practices.

The existing `add-landing-ga4-analytics` change owns analytics behavior. This change only documents its optional consent, sanitized events, and withdrawal contract. Its outstanding external Tag Assistant/GA4 DebugView verification remains open and has not been marked complete here.

Design inspection: approved privacy desktop/mobile and extension unauthenticated/error frames inspected on 2026-09-14. `Ext Sign-out Cleanup Pending` (`Jr6mK`) reuses the existing error presentation without an authenticated account menu and offers `Retry sign-out` before another login.

## Verification evidence (2026-09-14–16)

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
