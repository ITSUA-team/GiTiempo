# OpenSpec In GiTiempo

## Purpose

GiTiempo uses OpenSpec as a behavior-first source of truth for planned and implemented product changes.

The repository already contains product, technical, data model, API, and UI documents under `docs/`. OpenSpec does not replace those sources immediately. Instead, it organizes the durable behavior contract that future changes should update through proposals, delta specs, designs, and task lists.

## Layer Separation Rule

OpenSpec specs in this repo are separated by layer:

- `openspec/specs/backend/` for API, auth, data model, guard, and server-side behavior
- `openspec/specs/frontend/` for SPA routing, page behavior, UI flows, and client-side state behavior
- `openspec/specs/shared/` for cross-layer contracts, API conventions, and shared validation rules

Do not merge backend and frontend behavior into one spec file when the layers have distinct responsibilities.

## Domain Layout

Current seed layout:

- `openspec/specs/backend/auth/spec.md`
- `openspec/specs/backend/data-model/spec.md`
- `openspec/specs/backend/users/spec.md`
- `openspec/specs/frontend/layout/spec.md`
- `openspec/specs/frontend/components/spec.md`
- `openspec/specs/frontend/user-pages/spec.md`
- `openspec/specs/frontend/admin-pages/spec.md`
- `openspec/specs/shared/contracts/spec.md`
- `openspec/specs/shared/api-conventions/spec.md`

## How To Structure New Changes

When a change touches one layer, place the delta spec only in that layer.

Examples:

- Backend-only auth guard change: `openspec/changes/<change>/specs/backend/auth/spec.md`
- Frontend-only page flow change: `openspec/changes/<change>/specs/frontend/user-pages/spec.md`
- Shared contract update affecting API and SPAs: `openspec/changes/<change>/specs/shared/contracts/spec.md`

When a change spans multiple layers, add one delta spec per affected layer.

Example for authentication work:

- `openspec/changes/add-firebase-auth/specs/backend/auth/spec.md`
- `openspec/changes/add-firebase-auth/specs/frontend/user-pages/spec.md`
- `openspec/changes/add-firebase-auth/specs/shared/contracts/spec.md`

## Tooling

OpenSpec is installed as a project-local dependency and initialized for OpenCode only.

- Generated OpenCode commands live in `.opencode/commands/`
- Generated OpenCode skills live in `.opencode/skills/`

Third-party OpenSpec skills are intentionally not installed in this repo.
