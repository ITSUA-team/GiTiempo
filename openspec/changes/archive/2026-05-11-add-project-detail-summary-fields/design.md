## Context

The current `ProjectResponse` contract serves both `GET /projects` list rows and `GET /projects/:id` single-project reads. It already includes list-level summary fields used by admin Projects (`source`, `totalHours`, and `members`), but the user Project View design needs detail-level information for the page header: project description, precise tracked-time display, billable share, provider display detail, last activity, and assigned-member context.

The `projects` table currently stores provider-neutral display fields such as name, color, visibility, active state, and timestamps, but it does not store a project description. Provider identity remains correctly modeled through `project_external_refs`, and tracked totals are derived through project tasks and completed `time_entries`.

Affected instructions:
- Backend, contracts, DB, OpenAPI: `apps/api/AGENTS.md` applies.
- Shared Zod contracts: `packages/shared/src/contracts/projects.ts` is the source of truth for response and request shapes.
- Drizzle changes require migration generation/review; migrations must not be applied without explicit approval.

## Goals / Non-Goals

**Goals:**

- Add nullable, editable `description` to provider-neutral projects.
- Keep `GET /projects` optimized for list/table use.
- Make `GET /projects/:id` return a richer detail response that directly supports the user Project page header.
- Provide precise tracked-time summary values in seconds, while preserving existing `totalHours` list compatibility.
- Provide a structured provider summary without leaking raw provider metadata wholesale.
- Provide structured assigned-member summary without inventing a PM owner field.
- Keep response shapes contract-driven through shared Zod schemas and NestJS DTOs.

**Non-Goals:**

- Implement the user Project page UI in this change.
- Add dedicated PM-owner semantics to projects.
- Add provider sync/import behavior or change external reference storage.
- Paginate project members inside the single-project detail response.
- Change project visibility rules or assignment write behavior.

## Decisions

### D1: Split list and detail response contracts

`GET /projects` will continue returning `ProjectListResponse` backed by `ProjectResponse`. `GET /projects/:id` will return a new `ProjectDetailResponse` that extends the base project fields with detail-only summaries.

Rationale: list views need small, stable row data; detail views need richer header context. A separate detail contract avoids making every project selector and table payload carry provider details, billable aggregates, and preview summaries.

Alternative considered: add every field to `ProjectResponse`. Rejected because it unnecessarily inflates list responses and couples list consumers to detail-page requirements.

### D2: Make description real project metadata

Add nullable `description text` to the `projects` table and expose it through create/update/shared response schemas.

Rationale: the user Project header requires description, and the user confirmed it should be editable. Returning a placeholder or always-null field would satisfy the shape but not the product requirement.

Alternative considered: derive description from provider metadata. Rejected because manual projects need descriptions and core project records must remain provider-neutral.

### D3: Track precise seconds in detail summary

Keep existing `totalHours` as a number for existing list/table consumers, but add `trackedSummary.totalSeconds` and `trackedSummary.billableSeconds` to the detail response. Compute `billableShare` as `billableSeconds / totalSeconds` when `totalSeconds > 0`, otherwise `null`.

Rationale: the approved Project View shows `148h 20m`, which is easier and safer to format from seconds than from fractional hours. Existing list consumers already use `totalHours`.

Alternative considered: expose only `totalHours`. Rejected because it loses display precision and forces client reconstruction.

### D4: Use `MAX(started_at)` for last project activity

`trackedSummary.lastActivityAt` will be the latest `time_entries.started_at` for completed entries in the project. Projects with no completed entries return `null`.

Rationale: `startedAt` describes work activity. `updatedAt` would include edits/corrections and could make the header say the project was active when no work was tracked.

Alternative considered: use `MAX(updated_at)`. Rejected because it measures record maintenance rather than tracking activity.

### D5: Provider summary is curated and display-safe

Add `providerSummary` with `source`, `externalType`, `externalKey`, and `externalUrl`. For manual projects, provider detail fields are `null`. For GitHub projects, choose a deterministic GitHub project reference when one exists, preferring repository refs when multiple refs exist.

Rationale: the header needs display-level provider context such as `GitHub Repo` and `gitiempo/admin-web`, but core response contracts should not expose raw provider metadata as an unbounded public API shape.

Alternative considered: expose all `project_external_refs`. Rejected because it leaks provider storage details and makes UI depend on persistence internals.

### D6: Assigned-member summary is structured, not pre-rendered text

Add `assignedMembersSummary` with `count`, `previewMembers`, and `remainingCount`. `previewMembers` contains up to three `ProjectMember` entries, ordered deterministically by role/name/email. The backend does not return a formatted preview string.

Rationale: the backend owns stable summary semantics (count, preview size, ordering), while the UI owns presentation formatting, localization, and truncation.

Alternative considered: return `previewText`. Rejected because it bakes English copy and visual formatting into the API.

## Risks / Trade-offs

- Detail query becomes more complex → Keep summary calculation inside one service path for `GET /projects/:id`, and add E2E coverage for empty, populated, and running-entry cases.
- Adding `description` requires a DB migration → Generate a Drizzle migration and do not apply it without explicit approval.
- `ProjectResponse` consumers may need mock updates after adding description to the base response → Update affected tests and fixtures in API/frontend service tests.
- Provider reference ordering can be ambiguous when multiple external refs exist → Define deterministic precedence in the service and tests.
- Aggregates can be expensive on large datasets → Limit detail aggregates to single-project reads; list response keeps existing lighter aggregates.

## Migration Plan

1. Add `description text` as nullable on `projects` via Drizzle schema and migration.
2. Backfill is not required because existing rows can safely return `description: null`.
3. Update seed data with representative descriptions for local/dev project pages.
4. Deploy backend code and migration together so serializers and contracts match the database shape.
5. Rollback: remove code references before dropping the nullable column; no data transformation is required.

## Open Questions

- None blocking. The user confirmed `description` should be editable and `lastActivityAt` should use tracked activity time rather than edit time.
