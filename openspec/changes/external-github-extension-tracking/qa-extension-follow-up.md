# Extension manual QA follow-up — 13 October 2026

Candidate: branch `feat/external-github-time-tracking`, base `75cdb08d` plus current uncommitted implementation, extension 0.1.1. This is local QA, not a published release.

## Evidence sources and environment

Agent-observed tests used Chrome for Testing 152.0.7977.54, a separate browser/profile, a separate disposable PostgreSQL database on local port 5432, and QA API `127.0.0.1:3019`. Synthetic ordinary member workspace: `255c3330-7b55-4b8e-81b2-24307b4a1c9c` (`QA extension`), without a personal GitHub link or GitHub App credentials. Public issue: [GiTiempo#439](https://github.com/ITSUA-team/GiTiempo/issues/439). API credentials were injected as fixture setup; this does not certify a provider sign-in flow. Chrome's extension-debugging launch flag was required by the QA browser. Initial incomplete temporary output and unsuccessful browser launches were repaired before any recorded passing interaction.

User-observed tests used the existing local API and local `dist` extension in the user's Chrome and Firefox. Their version numbers and screenshots were not collected. The user explicitly confirmed that the new repository is private, its GitHub App is absent, and the timer was stopped. Their authenticated GitHub browser was not accessed by the agent.

Build tree SHA-256 values before the navigation repair (sorted relative filenames plus file contents, not ZIP hashes):

| Build | SHA-256 |
| --- | --- |
| Local Chrome / API localhost:3000 | `95396d339c7db0b3e3d5df5317dcfad543b8a370dd1da7318c5abcf927f15034` |
| Local Firefox / API localhost:3000 | `e6f80cb51826cc3fac5fe494a7f108fc6e30e8553bdb379abc137e633b8d228c` |
| Isolated QA Chrome / API 127.0.0.1:3019 | `a09378cd98d69b7fd75341e381beb147843b670b487743c0313d3402650d0c6a` |

Both user-facing local targets retain their localhost API origin; neither points to the temporary QA server. Permissions remain identity/storage and the API/GitHub hosts.

## Agent-observed scenarios

| Scenario | Real interactions and postconditions | Result |
| --- | --- | --- |
| Signed out and destination | Opened public issue without GiTiempo credentials: sign-in prompt, no Start. Set synthetic member credentials, reloaded: `QA extension`, correct issue title, repository and number, one Start action. | Pass |
| Two tabs | Opened the same issue in two tabs. Clicked injected Start in tab 2; tab 1 showed live Running and Stop without reload. Clicked Stop in tab 1; tab 2 returned to Start without reload. | Pass |
| Request failure | Failed exactly one QA reference-start request in the extension worker using CDP Fetch interception. The control retained issue/workspace and displayed a connection error with Retry. Database still had two completed entries and zero running entries. Retry refreshed context and returned to Start. | Pass |
| Lost successful response | Failed exactly one response after the QA API had returned 201. The extension reconciled the server's running timer and displayed Running, elapsed time, the connection error, and Stop. Clicking Stop succeeded. Database increased from two to three entries, with zero running afterward: one committed start, no duplicate. | Pass |
| Native popup | Opened the actual browser-action popup through `chrome.action.openPopup()`, not a popup URL as a tab. Native mouse clicks on Start/Stop worked with the correct workspace and current issue. The 320×480 running screenshot was inspected. | Pass |
| Logout and recovery | Started another timer, opened account menu, clicked Sign out. Popup showed sign-in actions; extension-local session was absent. Server still had one extension-source running entry. Requests without a session and the revoked refresh token each returned 401. Re-established the fixture session and reloaded: the same timer and elapsed time returned. Injected Stop succeeded. | Pass |

Logout preserves the existing stateless-access-token contract: a copied, previously issued access JWT remained valid until expiry (observed 200); logout revoked the refresh token and removed extension-local credentials. Immediate access-JWT revocation was not implemented or claimed.

Screenshots: `/private/tmp/gitiempo-manual-qa-gscHOc/extension-two-tabs-running.png`, `extension-network-retry.png`, `extension-popup-running.png`, `extension-logout.png`. Only synthetic identity and the public issue are shown.

## User-observed private issue and Projects matrix

Issue: [external-test-repo#1](https://github.com/My-test-org-for-clock/external-test-repo/issues/1).

Projects pane: [project 3 issue pane](https://github.com/orgs/My-test-org-for-clock/projects/3/views/1?pane=issue&itemId=270109027&issue=My-test-org-for-clock%7Cexternal-test-repo%7C1).

The user reported successful direct-page tracking as `oleksii.tsukanov@itsua.com`, successful Firefox sign-in/Start/Stop, and successful injected/popup Start/Stop with the issue title and workspace in the Projects pane in **both browsers**. They confirmed all three conditions: private repository, no App, timer stopped. Inspection of the exact entry owner's membership established role **admin**, not ordinary member. The user subsequently confirmed that the requested member Start/Stop repeat on the private direct issue and Projects pane passed in both Chrome and Firefox. The repeat email was not provided, so that role/identity is user-attested rather than independently corroborated. They reported a separate navigation defect: injection appeared only after reloading the issue. Root reproduced and repaired it for public issues. A subsequent private direct-issue context rejection in Chrome was fixed against the supplied nested header DOM and the final repeat was user-confirmed successful in both browsers; the user confirmed the Projects pane still works.

Read-only inspection of the local database independently confirmed:

- One private `external-reference` project: `50b968a6-63ae-42b0-af60-4d2472598c1b`, workspace `00000000-0000-4000-8000-000000000001`.
- Zero project assignments, `user-supplied` project/task references, null synchronization timestamps.
- Task `ca3d4570-1864-416c-bb68-8c13b9fe1a21`, title `external test isue`, canonical direct issue URL.
- Five completed `extension` entries for the reported user, durations 27, 269, 2, 7 and 3 seconds. No running entry remained in the inspected results.
- Exactly one project, task, project reference and task reference; repeated starts did not duplicate the mapping.

The agent did not alter those user-created records. This confirms successful persistence and reuse; browser interactions remain explicitly user-attested. It is not a server outbound-network audit or full Firefox SPA/error-state certification.

## Remaining scope

Private/customer and Projects/Firefox smoke blockers are resolved by user-attested admin and requested member smoke tests. Independent member identity corroboration, full delayed/stale-title and SPA transition coverage, managed provider-success/outage/rate-limit fixtures, all workspace/cache authorization transitions, and release/privacy/rollback gates remain separately tracked in `qa.md`. No full manual-QA, archival or distribution readiness is claimed.

## Navigation repair candidate

Final rebuilt local tree hashes (same sorted filename/content method): Chrome `c404dd4af5f84d5b91d728b5b8e5f04883df194894feedef840db6319739fbd0`; Firefox `a2490e693c48a4efd36217b0fb75609593620a10c96b59377ef49ed431b35363`. Both bundles point to `http://localhost:3000`, not QA 3019. Content registration is `https://github.com/*` with `https://github.com/*/*/pull/*` excluded; permissions remain identity/storage and existing API/GitHub hosts. Earlier ZIPs do not identify this updated unpacked candidate.

Actual isolated Chrome navigation proved one control after issue-list → 439 in the same document without a canonical link. Full-load 439 → list removed the control; opening 451 in that document produced the correct current title/number even though canonical stayed 439. The user then found a private direct-header context rejection in Chrome while Projects remained functional. The user supplied exact private header DOM after the initial compatibility fix still failed: number, edit button and hidden tooltip share a wrapper. The regression now uses that exact nested structure and private issue URL/title/fragment; matching scans number-only descendants outside the title and action/hidden subtrees, with stale-title/number checks retained. The suite has 186 passing tests. The user confirmed the final private direct/popup/issue-list repeat works in both Chrome and Firefox; see qa.md.

The disposable QA database, protected sessions and temporary QA extension were removed under explicit user consent. Only non-secret screenshots remain in the evidence directory.

Root additionally checked the final compiled Chrome bundle with a controlled replay of the supplied nested header structure on public issue 439: absent canonical, number plus edit/hidden-tooltip text, one correct control; stale number removed it and restoring the number remounted one. Screenshot `extension-authenticated-header-fixture.png` was inspected. This replay is separate from the user-attested real private repeat. All owned browser sessions were closed afterward.
