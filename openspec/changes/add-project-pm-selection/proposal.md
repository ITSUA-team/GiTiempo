## Why

The "Project manager" field in `AddProjectView` is currently a static read-only placeholder (`—`). The design shows it should be a selectable PM. Since the API has no `pmUserId` on `createProject`, the correct implementation is: after creating the project, immediately call `assignUserToProject` with the selected PM's `userId`. This makes the PM field functional without any API schema changes.

## What Changes

- Load workspace members on mount in `AddProjectView`, filter to `role === "pm"` for the PM selector.
- Replace the static PM read-only div with an `AppSelect` (using `AppFormField`) populated with PM-role members.
- PM selection is optional — if no PM is selected, skip the assignment call.
- After `createProject` succeeds, call `assignUserToProject` for the selected PM before redirecting.
- Show a loading state while fetching members; show a toast if assignment fails (project still created).

## Capabilities

### New Capabilities

- `add-project-pm-assignment`: On the Add Project form, the admin can select a PM from a dropdown (members with `role: "pm"`); after project creation the selected PM is automatically assigned to the new project.

### Modified Capabilities

- `admin-pages`: The Add Project page now includes a functional PM selector field that fetches members and assigns the PM post-creation.

## Impact

- `apps/admin-web/src/views/AddProjectView.vue` — add members loading, PM state, `AppSelect` for PM field, post-create assignment logic
- No API, contract, or shared package changes required
