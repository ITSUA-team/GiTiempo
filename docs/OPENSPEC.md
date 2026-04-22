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

## Spec Layout

OpenSpec specifications in GiTiempo are organized by domain using flat paths under `openspec/specs/`.

- `openspec/specs/auth/` for authentication behavior
- `openspec/specs/users/` for current-user and user-profile behavior
- `openspec/specs/contracts/` for shared contracts
- `openspec/specs/data-model/` for backend data-model behavior
- `openspec/specs/api-conventions/` for shared API conventions
- `openspec/specs/layout/`, `components/`, `user-pages/`, `admin-pages/` for frontend behavior

Keep one domain per spec directory. When a change spans multiple domains, add one delta spec per affected domain.

## How To Place Future Delta Specs

When a change affects only one domain, add the delta spec only for that domain.

Examples:

- Auth change: `openspec/changes/<change>/specs/auth/spec.md`
- Frontend page change: `openspec/changes/<change>/specs/user-pages/spec.md`
- Shared contract change: `openspec/changes/<change>/specs/contracts/spec.md`

When a change spans multiple domains, add one delta spec per affected domain.

Example:

- `openspec/changes/add-auth/specs/auth/spec.md`
- `openspec/changes/add-auth/specs/user-pages/spec.md`
- `openspec/changes/add-auth/specs/contracts/spec.md`

## Initial Seed Domains

The initial seeded spec layout is:

- `openspec/specs/auth/spec.md`
- `openspec/specs/data-model/spec.md`
- `openspec/specs/users/spec.md`
- `openspec/specs/layout/spec.md`
- `openspec/specs/components/spec.md`
- `openspec/specs/user-pages/spec.md`
- `openspec/specs/admin-pages/spec.md`
- `openspec/specs/contracts/spec.md`
- `openspec/specs/api-conventions/spec.md`

## Working Rule

Prefer updating OpenSpec artifacts before or alongside implementation for larger feature work, especially when a change affects contracts, auth behavior, routing, or cross-layer flows.
