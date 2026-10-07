## Why

After disconnecting a personal GitHub account, an ordinary member can still start timers on previously saved GitHub issues in public GiTiempo projects to which they are not assigned. The existing-task start checks project visibility, while the GitHub-specific start already requires project assignment; choosing a different start surface therefore changes authorization.

## What Changes

- **BREAKING**: Require explicit project assignment for ordinary members starting timers on saved GitHub-linked tasks, including tasks in public projects. Apply the same assignment rule regardless of personal GitHub connection state, consistent with the GitHub-specific start endpoint.
- Allow assigned members to continue starting saved GitHub tasks after personal disconnect, subject to existing local task/project and timer checks.
- Determine GitHub linkage from stored task provider references, not caller-supplied flags or project visibility. Assignment means the GiTiempo project assignment, not GitHub issue assignee status.
- Preserve current admin access and PM visibility-based access, ordinary manual-task access, historical records, and owned-timer stopping.
- Return the existing safe project-assignment error for visible public GitHub tasks denied to ordinary members. Preserve not-found behavior for inaccessible private tasks.
- Cover already-saved targets reached from Projects, the timer picker, and prior time entries, plus authorization changes between selection and submission.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `time-tracking-api`: Extend existing-task timer authorization to require ordinary-member assignment for saved GitHub-linked tasks and document disconnect, role, and visibility scenarios.

## Impact

- **Layers:** backend authorization, user-web verification, API/documentation updates. No new dependency or database migration is expected.
- **API:** `POST /time-entries/timer/start` gains an assignment denial for GitHub-linked tasks. Its request and success response stay unchanged; reuse `project_assignment_required` and the existing error envelope.
- **Authentication:** GiTiempo sign-in and personal GitHub credential cleanup stay unchanged. This closes an authorization gap; personal reconnect does not grant project assignment.
- **Backend:** existing-task timer start and its task/project access helpers, with transaction-level authorization checks.
- **Frontend:** existing user-web start actions must present a denied start correctly and must not report a successful timer. UI layout changes are not proposed.
- **Documentation:** clarify the GitHub-linked exception to public-project timer access in the API documentation and reference the installation-tracking policy.
- **Related work:** this is a follow-up to `workspace-github-installation-tracking` (associated with issue #420 in its proposal), whose completed artifacts remain intact. No separate issue has been supplied for this follow-up.
