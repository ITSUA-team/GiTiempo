## Why

`ProjectsView.vue` and `AddProjectView.vue` are implemented but do not match the approved Pencil design. The Projects list page has structural and visual gaps versus the design spec. The Add Project page uses a two-column layout with an info card that does not exist in the design. Both pages need to be corrected to be pixel-perfect to the approved design before moving on to the remaining placeholder screens.

## What Changes

- Fix `ProjectsView.vue` to match the Pencil design exactly:
  - Page header: title + subtitle left, "New Project" button right
  - Three stat cards: Active Projects, Private, Public (active-only counts)
  - Projects table card: "Projects Table" heading + assigned-member filter
  - Table columns: Project, Source, Assigned members, Hours, Visibility, Actions
  - Inline edit row: Project settings with members multiselect + visibility select + Cancel/Save buttons
  - Archived rows: muted project name + "Archived" badge + Edit + Unarchive actions
- Fix `AddProjectView.vue` to match the Pencil design exactly:
  - Single-column form card with: project name input, visibility select, optional color picker
  - No two-column info card layout (not in the design)
  - Back navigation and Create/Cancel actions

## Capabilities

### New Capabilities

_(none — both pages already exist)_

### Modified Capabilities

- `project-management`: The Projects list page and Add Project page must now match the approved design pixel-for-pixel. Current implementation deviates in layout structure, column sizing, action button placement, and the Add Project form shape.

## Impact

- `apps/admin-web/src/views/ProjectsView.vue` — corrections only, no logic changes
- `apps/admin-web/src/views/AddProjectView.vue` — layout restructured to single-column form
- No API changes, no shared package changes, no router changes
