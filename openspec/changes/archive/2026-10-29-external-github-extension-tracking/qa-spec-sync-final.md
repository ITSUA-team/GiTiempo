# Canonical Specification Synchronization QA

**Date:** 2026-10-13  
**Scope:** task 8.6 — reconcile the canonical specifications with the `external-github-extension-tracking` delta specifications in dependency order.  
**Environment:** local checkout at `e0714382` (`feat/external-github-time-tracking`); OpenSpec `1.3.0` via `pnpm exec`; telemetry disabled with `OPENSPEC_TELEMETRY=0`.

## Reconciliation audit

The 14 delta capability files contain 52 named requirements: 18 `ADDED`, 33 `MODIFIED`, and one `REMOVED`.

| Capability | Delta requirements | Canonical reconciliation |
| --- | ---: | --- |
| `chrome-extension` | 1 added, 6 modified | All 7 requirement bodies present and equal. |
| `contracts` | 2 added, 2 modified | All 4 requirement bodies present and equal. |
| `data-model` | 3 added, 1 modified | All 4 requirement bodies present and equal. |
| `external-github-tracking` | 7 added | All 7 requirement bodies present and equal. |
| `project-management` | 7 modified | All 7 requirement bodies present and equal. |
| `project-member-count` | 1 removed | `openspec/specs/project-member-count/spec.md` is already absent; no-op is correct. |
| `project-members-list` | 2 modified | Both requirement bodies present and equal. |
| `public-landing-page` | 1 modified | Requirement body present and equal. |
| `task-management` | 5 modified | All 5 requirement bodies present and equal. |
| `time-tracking-api` | 6 modified | All 6 requirement bodies present and equal. |
| `user-pages` | 2 added | Both requirement bodies present and equal. |
| `user-projects-list-page` | 3 added | All 3 requirement bodies present and equal. |
| `workspace-github-installations` | 1 modified | Requirement body present and equal. |
| `workspace-github-organization-policy` | 2 modified | Both requirement bodies present and equal. |

The body comparison normalized only trailing section separators. It found all 51 `ADDED`/`MODIFIED` requirement bodies in their corresponding canonical specifications with no missing or substantive differences. The single `REMOVED` requirement is absent, as required. No unrelated canonical requirement was changed during this audit.

## Strict validation

Each extant affected canonical specification passed its own strict validation:

```text
OPENSPEC_TELEMETRY=0 pnpm exec openspec validate <capability> --type spec --strict --no-interactive
```

Passed (13): `chrome-extension`, `contracts`, `data-model`, `external-github-tracking`, `project-management`, `project-members-list`, `public-landing-page`, `task-management`, `time-tracking-api`, `user-pages`, `user-projects-list-page`, `workspace-github-installations`, and `workspace-github-organization-policy`.

The change itself also passed:

```text
OPENSPEC_TELEMETRY=0 pnpm exec openspec validate external-github-extension-tracking --type change --strict --no-interactive
# Change 'external-github-extension-tracking' is valid
```

The CLI emitted the pre-existing pnpm warning that `node_modules` is out of sync with the lockfile; it did not affect validation results. A global `--specs` validation was intentionally not used because known unrelated Purpose-field failures in `user-activity-tracking` and `workspace-membership` are outside this change and this task.

## Result

Canonical synchronization is complete: every named delta operation is already reflected in the canonical specifications, including the deliberate deletion of `project-member-count`. This QA pass changed no product source, migrations, task checklist, or root QA checklist.

## Final integration check — 13 October 2026

After the approved popup Pen update and local evidence/checklist rollup, the
change strict validation was rerun and passed. `git diff --check` also passed.
The existing lockfile synchronization warning remains non-failing. Canonical
specifications and product source were unchanged by this final Pen/documentation
pass; the prior 13 strict canonical checks and 51-body comparison remain applicable.
All 67 checklist items are resolved, including the user-authorized production
privacy skip. No archive, production deployment or distribution-readiness claim.

## Projects duration clarification — 13 October 2026

The user clarified that Projects must not display project/task tracked durations.
The affected Projects requirement was updated in both delta and canonical specs,
including a desktop/mobile no-duration scenario and personal task-count wording.
All three Projects delta requirement bodies still exactly match their canonical
counterparts. Fresh strict checks passed for the change and Projects specification;
`git diff --check` also passed. Product source and aggregate API contracts did not
change. The earlier 67/67 checkpoint is superseded by the focused Projects visual
audit: 64/67 resolved, with 9.21 and dependent 8.6/9.25 rollup still open.


## Final Projects reconciliation — 14 October 2026

After the final local Projects parity patch, a fresh comparison again found all
**51 added/modified requirement bodies equal** to their canonical counterparts;
the single removed requirement remains absent. Fresh strict validation passed
for `external-github-extension-tracking` and `user-projects-list-page`. The other
12 affected canonical specs were unchanged since their recorded strict checks.
No new spec conflict or additional product requirement was introduced.

Combined with [Projects parity evidence](qa-projects-parity-final.md), the linked
API/extension/web/release evidence and the final matrix in `qa.md`, this closes
8.6. All 67 local checklist items are resolved, including the explicit production
privacy skip. This supersedes the 64/67 checkpoint above. No archive, commit,
push or production operation was performed.
