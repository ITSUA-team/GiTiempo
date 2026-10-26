# Manual acceptance report

Date: 2026-10-26. Branch: `feat/476-auto-create-workspace-on-social-signin`.
Baseline commit: `eebe0520`; implementation is currently uncommitted.

## Environment and boundaries

- PostgreSQL: dedicated local `gitiempo_476_social_test`, migrated and seeded. An earlier automated E2E invocation accidentally reached the ordinary development database; the incident and known impact are recorded below. The interactive API used the dedicated database.
- The user chose the separate test database. Their existing GitHub account link was not disconnected.
- User/admin applications were opened locally at ports 5173/5174. The API used the separate database.
- The user completed real Google authorization as recorded below. A real GitHub exchange also completed as recorded below. No provider credentials were entered by the agent.
- During this manual inspection, registration timeout/recovery was paused for design review. The user subsequently approved durable password-free recovery and two-sided verified-email adoption on 2026-10-26. Both rules are now implemented and independently security-reviewed after the recovery/compensation findings were fixed. Real-account acceptance remains pending; automated provider fixtures do not replace it.

## Automated test database incident

The first full E2E invocation used the root Turbo runner. Its strict environment filtering removed the wrapper's `DATABASE_URL`, and the API test process loaded the ordinary `gi_tiempo` development connection instead. This run failed against the unmigrated development schema. The user was informed. Subsequent database tests bypass Turbo and receive the dedicated test connection directly.

The accidental run left one test-created `fail_registration_40a93fa252594c608b2222f6f389e6ff` trigger on `public.workspaces`, which rejected every workspace insertion. Its exact definition and test source were checked, then only that trigger and its `fail_registration_fn_c16d64b7c4ae4990b1dcfbce77ba16bf` function were removed. A read-only check confirmed no remaining `fail_registration_%` triggers.

The development database's one GitHub account link predates the run and its `updated_at` did not change during the incident window. The normalized task-reference uniqueness index is present. The passing GitHub deduplication migration test did execute migration `0015` globally: it can merge time entries onto canonical tasks and delete duplicate tasks/references if pre-existing case-duplicate GitHub references exist. Some test fixtures may also have been created and cleaned up. There is no pre-run snapshot, so this inspection cannot prove that all development data is unchanged. No speculative data restoration or deletion was attempted, and the current GitHub link was not disconnected.

The dedicated test database was reset and seeded after interrupted tests left an earlier member-role workspace for the seeded administrator. That fixture state caused unrelated admin requests to return 403; it was confined to the disposable dedicated database.

## Design inspection actually performed

Opened `GITiempo.pen` in Pen and inspected/rendered these approved frames through Pencil MCP:

- `JvrFN` — Login Page
- `eStIM` — Login Page — Admin
- `a9IDJT` — Register New Workflow
- `L4Y9Np` — Register New Workflow Mobile

Compared the running login/registration structure with the frames: existing credential/provider actions and manual-registration field order are retained; the owner checkbox remains in manual registration; no social naming/owner-confirmation form was introduced. The affected change does not alter these layouts or design tokens. Error recovery uses the existing error surface; the inspected frames do not depict the retired name-conflict error.

Existing differences observed: `Forgot?` is depicted in login frames but is absent from the running forms; registration's old design-only API-placeholder notice is absent in the implemented route (current UI docs prohibit shipping it as a disabled placeholder); the extension install callout is omitted when its configured URL is absent, as documented. No new PrimeVue-specific compromise was introduced by this change. These observations do not claim pixel-perfect parity of the entire pre-existing auth implementation.

## Real provider sign-in — partial acceptance

On 2026-10-26 the user opened `http://localhost:5173/login` in their ordinary browser and completed Continue with Google. The user reported that `Workspace` opened. Browser name/version and a screenshot were not recorded; this is a partial section 8.1 result, not acceptance of all clients/providers.

A guarded read-only query against `gitiempo_476_social_test` confirmed:

- Local user ID: `24f796be-fa47-4227-92e9-9f7ceb3929a6`.
- Canonical Firebase UID: `gwqmsJcWWdhswKAQUWm7oh50mde2`.
- Workspace ID: `a01a7b5c-1119-4771-8c87-c7f4cb86f353`; exact name `Workspace`.
- Exactly one membership for this user, role `admin`; default time zone `UTC`.
- One persisted Google subject binding; foundation created at `2026-10-26T14:39:32.844Z`.

Tested code: baseline `eebe0520` plus the uncommitted application diff. Application-only diff SHA-256: `909748172b7e1a0efc5451517e41ef5345df2afd77f51651826f06ae4178ec0e`. No code was committed for the manual run.

The in-app browser did not expose the Google authorization popup. Native Codex/Chrome control was unavailable, so the user completed authorization in their own browser; no credentials were entered by the agent. The temporary in-app test tab was closed. The dedicated API at port 3000 and user-web at port 5173 remain running for this manual check. API/OAuth/SPA origins were verified as localhost.

The user clarified that Google and GitHub use different emails. A subsequent guarded SQL read confirmed a real GitHub exchange at `2026-10-26T14:43:27.783Z`:

- Separate local user ID: `ac30309f-2282-408f-a5b3-a7765036886d`.
- Canonical Firebase UID: `d5d9cdec-7724-4719-a7d2-26d90eee83eb`.
- Separate workspace ID: `5730b2dc-9d71-46f1-b2f3-5daee3aee7fa`; exact name `Workspace`, role `admin`, time zone `UTC`.
- Exactly one membership for the GitHub user. The Google user retained the original workspace ID and its single membership.

This establishes successful real GitHub exchange/provisioning and equal workspace labels for different verified emails. The user did not separately report the GitHub page state or explicitly confirm the repeated-Google UI step; those details are not inferred from SQL. Same-email provider convergence is not manually established by these different-email accounts. The user's development GitHub link remains untouched.

## GitHub-first then Google with the same email

The user subsequently reported Google sign-in with the same email as the GitHub account. A guarded read-only transaction in `gitiempo_476_social_test` confirmed that user `ac30309f-2282-408f-a5b3-a7765036886d` still has exactly one account for that normalized email and one membership, role `admin`, in the original workspace `5730b2dc-9d71-46f1-b2f3-5daee3aee7fa`. Its creation time remains `2026-10-26T14:43:27.753Z`; no workspace was created after that onboarding. The canonical Firebase UID remains `d5d9cdec-7724-4719-a7d2-26d90eee83eb`, and a later session exists at `2026-10-26T14:48:56.390Z`.

This confirms existing-account/workspace reuse for the reported GitHub-first → Google same-email check. The reverse provider order, different-UID behavior in deployed Firebase, other clients, and remaining section 8 steps are still pending.

## Section 8 acceptance

All section 8 checkboxes remain open. Automated tests below are supporting evidence, not substitutes for real-provider acceptance.

| Item | Actual manual result |
| --- | --- |
| 8.1 New provider accounts / all clients | User-web Google entry reported; real Google and GitHub exchange foundations confirmed in SQL, each `Workspace`/admin/UTC with one membership. Admin-web/extension and remaining UI details are pending. |
| 8.2 Repeat/reload/restart / zero memberships | After the subsequent provider checks Google retained its workspace ID and single membership; complete repeat/reload/restart UI sequence not separately confirmed. |
| 8.3 Both provider orders / Firebase subjects | GitHub-first → Google with the same email reused the original account/workspace and canonical UID. Reverse order and deployed different-UID behavior remain pending. |
| 8.4 Existing/multiple memberships / role routing | Automated coverage only; no real-provider manual run. |
| 8.5 Pending invitation / legacy recovery | Automated coverage only; manual run pending. |
| 8.6 Duplicate names / isolation / client selection | Real Google/GitHub users have two distinct workspace IDs both named `Workspace`, with separate single memberships. Manual registration/rename/selection portions remain pending. |
| 8.7 Two profiles / provider/invitation races | Controlled PostgreSQL tests only; real-browser run pending. |
| 8.8 Cancellation / expiry / replay / failure recovery | HTTP/unit/SQL rollback tests only; manual run pending. |
| 8.9 Ownership conflicts / missing verified email | Preclaim protection is implemented and independently reviewed; automated coverage passes, manual run pending. |
| 8.10 Consent / preferences / design parity | Auth frames inspected as recorded above; real-account preference comparison not executed. |
| 8.11 Disconnect alternatives / stale handoff | Automated coverage only; real-provider run pending. |
| 8.12 Membership-bound refresh / eligible fresh login | Automated coverage only; manual run pending. |

Before a later manual run, record the exact committed implementation, browser/client versions, dedicated account/workspace IDs, steps, and actual results. Do not include passwords or tokens.
