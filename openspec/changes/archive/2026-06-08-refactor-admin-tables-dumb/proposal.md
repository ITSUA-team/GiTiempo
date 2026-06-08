## Why

Admin Members and Projects table components currently own API mutations, auth-store checks, confirmation prompts, and toast feedback in addition to rendering rows, filters, mobile cards, and inline expansion state. This makes the tables hard to reuse or test as presentational components and duplicates orchestration that should belong to the route view or a focused page composable.

## What Changes

- Refactor `MembersTable.vue` so it receives prepared rows, filter values/options, expansion state, and row-expansion content from the Members page or a focused composable, and emits member row intents instead of owning filtering, expansion, forms, confirmation, API mutation, toast feedback, or refresh behavior.
- Refactor `ProjectsTable.vue` so it receives prepared rows, filter values/options, expansion state, and row-expansion content from the Projects page or a focused composable, emits filter and edit intents, and leaves archive/unarchive intents to page-owned inline settings content instead of owning filtering, expansion, forms, confirmation, API mutation, toast feedback, summary refresh, or row refresh behavior.
- Refactor inline Members and Projects expansion forms so they validate/render controls and emit typed save payloads, while page owners perform API calls, auth checks, toast feedback, refreshes, and collapse behavior.
- Preserve existing table rendering, filtering results, responsive desktop/mobile branches, inline edit/assignment expansion behavior, row action labels/tooltips, and success/error user feedback.
- Update tests so table specs assert presentational rendering and emitted intents, while view/composable specs cover mutation orchestration and failure paths.
- Do not change backend endpoints, shared API contracts, route paths, project/member data loading requirements, or design-system styling.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-members-page`: Member table destructive actions become presentational intents; the page-level owner performs member removal orchestration and feedback.
- `admin-projects-page`: Project table archive/unarchive actions become presentational intents; the page-level owner performs project mutation orchestration and feedback.

## Impact

- Affected admin-web components: `apps/admin-web/src/components/MembersTable.vue`, `apps/admin-web/src/components/ProjectsTable.vue`.
- Affected admin-web inline expansion forms: `MemberAssignPmPanel.vue`, `MemberEditForm.vue`, and `ProjectEditForm.vue`.
- Affected admin-web route views or new focused composables: `apps/admin-web/src/views/MembersView.vue`, `apps/admin-web/src/views/ProjectsView.vue`, and optional page-specific composables under `apps/admin-web/src/composables/` if keeping views thin requires extraction.
- Affected tests: `MembersTable.spec.ts`, `ProjectsTable.spec.ts`, `MembersView.spec.ts`, `ProjectsView.spec.ts`, and any new composable specs introduced for orchestration.
- No backend, database, OpenAPI, shared contract, or routing impact is expected.
