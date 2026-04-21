# OpenSpec Workflow

GiTiempo uses OpenSpec as a project-local, behavior-first workflow for planned and implemented changes.

## Scope

- OpenSpec is installed as a local workspace dependency: `@fission-ai/openspec`
- OpenSpec is initialized for **OpenCode only** in this repository
- Generated OpenCode assets live in `.opencode/commands/` and `.opencode/skills/`
- Third-party OpenSpec skills are intentionally not installed in this repo

## Main Directories

- `openspec/specs/` is the current behavior source of truth
- `openspec/changes/` contains proposed and active changes
- `openspec/config.yaml` injects repo-specific context and artifact rules

## Layer Separation Rule

OpenSpec specifications in GiTiempo are separated by layer.

- `openspec/specs/backend/` for NestJS API, auth, data model, and server-side behavior
- `openspec/specs/frontend/` for SPA shell behavior, pages, routing, and UI flows
- `openspec/specs/shared/` for cross-layer contracts and API conventions

Do not collapse backend and frontend behavior into one spec file when the responsibilities are different.

## How To Place Future Delta Specs

When a change affects only one layer, add the delta spec only in that layer.

Examples:

- Backend-only change: `openspec/changes/<change>/specs/backend/<domain>/spec.md`
- Frontend-only change: `openspec/changes/<change>/specs/frontend/<domain>/spec.md`
- Shared contract change: `openspec/changes/<change>/specs/shared/<domain>/spec.md`

When a change spans multiple layers, add one delta spec per affected layer.

Example:

- `openspec/changes/add-auth/specs/backend/auth/spec.md`
- `openspec/changes/add-auth/specs/frontend/user-pages/spec.md`
- `openspec/changes/add-auth/specs/shared/contracts/spec.md`

## Initial Seed Domains

The initial seeded spec layout is:

- `openspec/specs/backend/auth/spec.md`
- `openspec/specs/backend/data-model/spec.md`
- `openspec/specs/backend/users/spec.md`
- `openspec/specs/frontend/layout/spec.md`
- `openspec/specs/frontend/components/spec.md`
- `openspec/specs/frontend/user-pages/spec.md`
- `openspec/specs/frontend/admin-pages/spec.md`
- `openspec/specs/shared/contracts/spec.md`
- `openspec/specs/shared/api-conventions/spec.md`

## Working Rule

Prefer updating OpenSpec artifacts before or alongside implementation for larger feature work, especially when a change affects contracts, auth behavior, routing, or cross-layer flows.
