# Chrome Web Store privacy and release checklist

This checklist is the package-specific record for the GiTiempo Chrome extension. It distinguishes facts established from the source/package, statements that require the publisher's confirmation, and values actually entered in Chrome Web Store (CWS). A draft is not evidence that a CWS Dashboard field has been reviewed or saved.

## Release identity and status

| Item | Status | Evidence or required action |
| --- | --- | --- |
| Package version | Technical fact | `0.1.0` in `apps/chrome-ext/package.json` and the generated-manifest source. |
| Local Chrome candidate | Technically verified, 2026-09-14 | `apps/chrome-ext/dist/gitiempo-chrome-0.1.0.zip`, SHA-256 `9c654ecd6428b01bef5f745389d161e23b959cfeeb80a88659bcf2aedc307eed`; 10 files, sorted entries and fixed ZIP timestamps. The ignored ZIP is rebuilt locally; hash it again after any rebuild. |
| Candidate API environment | Staging; production package pending | Built host is `https://api.gitiempo.itsua.dev/*`. Confirm the intended release backend/configuration and rebuild/review before Store upload. This ZIP is a local test candidate. |
| Public privacy-policy URL | Pending production release | Use `https://gitiempo.com/privacy` only after the approved landing release is public. The staging baseline is `https://gitiempo-landing.itsua.dev/privacy/`; it is not the Store URL. |
| Controller and privacy contact | Publisher-confirmed | The publisher confirmed `ITSUA` as controller and `admin@itsua.com` as its monitored contact. Confirm the production build uses these same values. |
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
| Transfers are limited to the core function and comply with the applicable CWS policy. | Confirmed, 2026-09-16 | Primary hosting and database in Germany (EU); encrypted backups in EU. Firebase/Google and GitHub may process data in their global infrastructures; transfers outside the EU are subject to appropriate safeguards including Standard Contractual Clauses. Public policy §4 updated with transfer safeguards. |
| Human access to extension user data is limited to permitted exceptions. | Confirmed, 2026-09-16 | Production data access is restricted to authorized personnel with key-based authentication; the database is not exposed to the public internet; monitoring tools are behind authenticated reverse proxies. No third-party or anonymous access to user data. Public policy §5 states access is limited to authorized personnel. Internal access-control, MFA, and audit-log details are recorded in the internal privacy review. |
| Processor/recipient list and processing locations/transfers are complete. | Confirmed, 2026-09-16 | Providers verified from production infrastructure: Hetzner Online (Germany, EU) — hosting and database; Cloudflare (global edge) — CDN and DNS; Firebase/Google — authentication; GitHub — OAuth sign-in and issue data; Backblaze (EU) — encrypted backup storage; Google (Gmail) — transactional email. Public policy §4 lists all providers with regions. No additional processors identified. |
| Retention, deletion-request process, and backup treatment are accurate. | Confirmed, 2026-09-16 | Account/workspace/time-entry data: retained while account is active, no automatic deletion. Encrypted backups: 90 days (daily), 1 year (weekly), auto-pruned. Application logs: 30 days. Access tokens: 15 minutes; refresh tokens: 7 days. Invites: 7 days. Deletion process: manual request via privacy email, 30-day response; workspace membership and profile data removed or anonymized; time entries may be retained for workspace reporting integrity; backup data persists until backup expiration. Public policy §5 and §6 updated with confirmed retention periods and deletion process. |
| The production controller/contact/date are correct. | Pending production verification | The local policy revision uses `ITSUA` as controller, `admin@itsua.com` as contact, and 16 September 2026 as the effective date. Production deployment and anonymous verification of the live policy URL have not yet been performed. |

## Publication gates

1. Build and inspect the final Chrome artifact, fill in its SHA-256, manifest, permissions, and remote-code results.
2. ~~Complete the open publisher facts above, then update the public policy with only confirmed operational details.~~ **Completed 2026-09-16.** Processor list, retention/deletion/backups, transfers, and human access confirmed from production infrastructure. Public policy updated with confirmed facts only.
3. Deploy the approved policy to production and anonymously verify the policy URL, footer link, sitemap entry, controller, contact, and effective date.
4. Open the real CWS Dashboard, select data categories using the current Dashboard definitions, compare all entries with this document and the policy, and record the reviewer/date.
5. Submit only after every gate is complete. Do not place credentials, keys, test-account details, or session tokens in this document.

## Local policy revision and dependencies

The local policy revision dated 16 September 2026 adds confirmed processor list with processing regions, transfer safeguards, specific retention periods for account/workspace/time-entry data, backups, logs, and authentication tokens, a defined account-deletion request process with 30-day response timeline and backup treatment, and a personal-data-breach notification commitment. All retention periods, provider identities, and processing locations were verified from the production infrastructure on 2026-09-16. The Limited Use wording is the proposed publication commitment, now grounded in confirmed operational facts rather than source inspection alone.

The earlier 14 September 2026 revision added verified authentication/storage, GitHub, deletion-boundary, and optional GA4 disclosures. The 16 September revision supersedes it for processor list, retention/backups/transfers, and deletion process.

The existing `add-landing-ga4-analytics` change owns analytics behavior. This change only documents its optional consent, sanitized events, and withdrawal contract. Its outstanding external Tag Assistant/GA4 DebugView verification remains open and has not been marked complete here.

Design inspection: approved privacy desktop/mobile and extension unauthenticated/error frames inspected on 2026-09-14. `Ext Sign-out Cleanup Pending` (`Jr6mK`) reuses the existing error presentation without an authenticated account menu and offers `Retry sign-out` before another login.

## Verification evidence (2026-09-16)

- Public privacy policy (`apps/landing-web/src/pages/privacy.astro`) updated with confirmed operational facts: processor list with regions (§4), specific retention periods and security practices (§5), and account-deletion request process with backup treatment (§6). Effective date updated to 16 September 2026.
- Landing lint, typecheck, and 17 tests passed. Build verified with production-env values: `/privacy/index.html` generated successfully; no secrets, host addresses, IP addresses, or internal configuration values found in the output.
- Publisher facts confirmed from production infrastructure inspection: processor identities and regions, retention periods, backup encryption and retention, authentication token lifetimes, deletion process, access controls, and transfer safeguards. Internal research document (`Privacy_Policy.md`) contains the full evidence with internal details; this checklist and the public policy contain only confirmed, publishable facts.
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
