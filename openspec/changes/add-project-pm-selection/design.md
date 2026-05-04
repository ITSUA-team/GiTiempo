## Context

`AddProjectView` already uses `createProjectsClient` and `createMembersClient` is available from `@gitiempo/web-shared`. The `assignUserToProject` method exists on `ProjectsClient`. Members with `role === "pm"` are what the design's "Project manager" field represents.

The API returns 422 if an admin userId is passed to `assignUserToProject` (established constraint). Only `pm` and `member` role users can be assigned. The PM selector should therefore only show members with `role === "pm"`.

## Goals / Non-Goals

**Goals:**

- Fetch members on mount, filter to `role === "pm"`
- Replace static PM display with `AppSelect` inside `AppFormField`
- PM selection is optional (placeholder: "Select PM")
- Post-create: if a PM was selected, call `assignUserToProject`; if that fails, show a warning toast but still navigate to projects list (project was created)

**Non-Goals:**

- Changing `CreateProjectInput` or any API contract
- Showing PM in the projects table (out of scope)
- Assigning multiple PMs

## Decisions

### Decision: Assignment is a best-effort post-create step

If `createProject` succeeds but `assignUserToProject` fails, we surface a warning but still complete the flow. This avoids leaving the user stuck on the form with a project already created.

### Decision: Members loaded on `onMounted`, not lazily

The form is only shown after navigation to the route — mounting cost is acceptable. Lazy loading would require a loading state inside the dropdown overlay which is more complex.

### Decision: PM options use `{ userId, label }` shape

Label is `displayName ?? email` (same pattern as `ProjectsView`). The `AppSelect` receives `option-label="label"` and `option-value="userId"`.

## Risks / Trade-offs

- [Risk] Members list could be empty if no PMs exist → Mitigation: show placeholder "No PMs available" (Select's `empty-message`).
- [Risk] Members fetch fails → Mitigation: toast error, PM select disabled, form still usable without PM.
