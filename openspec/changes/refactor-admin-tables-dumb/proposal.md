## Why

Admin Members and Projects table components currently own API mutations, auth-store checks, confirmation prompts, and toast feedback in addition to rendering rows, filters, mobile cards, and inline expansion state. This makes the tables hard to reuse or test as presentational components and duplicates orchestration that should belong to the route view or a focused page composable.

## What Changes

- Refactor `MembersTable.vue` so member removal is emitted as an intent from the table, while the Members page or a focused composable owns confirmation, API mutation, toast feedback, and refresh behavior.
- Refactor `ProjectsTable.vue` so archive and unarchive are emitted as intents from the table, while the Projects page or a focused composable owns confirmation, API mutation, toast feedback, summary refresh, and row refresh behavior.
- Preserve existing table rendering, filtering, responsive desktop/mobile branches, inline edit/assignment expansion behavior, row action labels/tooltips, and success/error user feedback.
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
- Affected admin-web route views or new focused composables: `apps/admin-web/src/views/MembersView.vue`, `apps/admin-web/src/views/ProjectsView.vue`, and optional page-specific composables under `apps/admin-web/src/composables/` if keeping views thin requires extraction.
- Affected tests: `MembersTable.spec.ts`, `ProjectsTable.spec.ts`, `MembersView.spec.ts`, `ProjectsView.spec.ts`, and any new composable specs introduced for orchestration.
- No backend, database, OpenAPI, shared contract, or routing impact is expected.
