# GI Tiempo Agent Notes

## Routing

- Root `AGENTS.md` contains only monorepo-wide rules. For task details, jump to the nearest app file first instead of scanning the whole repo.
- Backend, DB, NestJS, Drizzle, OpenAPI: `apps/api/AGENTS.md`
- User SPA: `apps/user-web/AGENTS.md`
- Admin SPA: `apps/admin-web/AGENTS.md`
- Shared browser/runtime frontend code and shared Vue components: `packages/web-shared/AGENTS.md`
- If a task also touches shared contracts or shared UI config, inspect `packages/shared/*` or `packages/web-config/*` directly. There are intentionally no package-level `AGENTS.md` files there.

## Monorepo Rules

- Prefer root Turbo commands when possible: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm openapi:export`.
- Turbo builds workspace dependencies automatically; direct `pnpm --filter ...` commands do not.
- Exact package names for filters: `@gitiempo/api`, `user-web`, `admin-web`, `@gitiempo/shared`, `@gitiempo/web-config`, `@gitiempo/web-shared`.
- Inside this repo prefer `pnpm dlx` instead of `npx`; `npx` is unreliable here. Example: `pnpm dlx ctx7@latest library zod "zod v4 coerce number env validation"`.
- `apps/chrome-ext/` is a supported Manifest V3 application with its own source, tests, build, and app-local `AGENTS.md`.

## Source Of Truth

- Prefer manifests and app-local config over root prose.
- Cross-package work usually spans one app plus `packages/shared`, `packages/web-config`, or `packages/web-shared`; inspect only those paths instead of rescanning the whole monorepo.
- Before implementing, check whether the planned change conflicts with documented behavior or requirements in `docs/`; if it does, escalate immediately instead of silently choosing one source.
- For GitHub work planning and project-board operations, use `docs/GITHUB-PROJECT-WORKFLOW.md` for the repo's milestone, issue, sub-issue, and project-board rules.
- Checked-in GitHub Actions workflows under `.github/workflows/` select affected packages and run their configured checks. Treat local verification as required evidence; inspect the relevant workflow rather than assuming its coverage.
- `.npmrc` enforces `minimum-release-age=10080`, so installs can reject packages published within the last 7 days.
- API request examples live in `bruno/`; use the `local` environment for manual endpoint checks.

## Code Conventions

### Comments
- Code should be self-documenting and understandable without comments. Minimize comments — add them only where genuinely needed.
- A comment explains "why", not "what" the code does.
- Inline comments — only for non-obvious sections where intent cannot be read from names and structure.
- Docstrings — on modules/functions describing the contract, not restating the code.
- Do not duplicate with comments what is already clear from the code itself.

## Cross-App Frontend

- For any implementation, refactor, review, or configuration work under `apps/landing-web`, always load the `gitiempo-landing-rules` skill first and follow it throughout the task.
- For UI implementation, refactoring, review, or acceptance QA in `apps/user-web`, `apps/admin-web`, `packages/web-config`, or shared Vue UI in `packages/web-shared`, load the `gitiempo-frontend-rules` skill first.
- UI behavior and styling rules live in `docs/ui/*` and the nearest app `AGENTS.md`; do not duplicate or invent parallel frontend conventions elsewhere.
- For any frontend UI task, read `docs/ui/INDEX.md` first, then only the smallest relevant `docs/ui/*` section files before reading or editing implementation files.
- For any frontend UI task, inspect the approved `.pen` screen before implementation and treat it as a parity checklist, not just a rough reference.
- `packages/web-config` is for shared PrimeVue preset, design tokens, and frontend bootstrap/theme wiring.
- `packages/web-shared` is for shared browser/runtime helpers, browser-only form schemas, and reusable Vue components used by both SPAs.
- Keep `@gitiempo/shared` backend-safe and contract-focused. Do not move browser/runtime frontend helpers there.
- Extract shared frontend code only when the behavior is already proven identical across `apps/user-web` and `apps/admin-web`.
- PrimeVue-only conflicts are the only acceptable reason to deviate from an approved design, and those compromises must be documented explicitly in the final review.
- Good extraction candidates are small leaves such as auth HTTP helpers, current-user clients, refresh-token storage helpers, counterpart-workspace link helpers, and small PrimeVue-based UI blocks with stable props/emits.
- Also treat doc-defined repeated UI patterns such as page headers, card shells, section headers, loading blocks, and empty/error states as proactive extraction candidates even before multiple copies accumulate.
- Keep `stores/auth.ts`, `router/index.ts`, route maps, route-level views, and product-specific shell or login composition app-local unless there are two stable call sites and a smaller shared abstraction is clearly justified.
- If a task changes `packages/web-config` or `packages/web-shared`, verify both web apps.
- If a task changes shared auth/session/router leaves, run both frontend test suites in addition to lint and typecheck.

## Definition of Done

- `pnpm typecheck` and `pnpm lint` pass with no new errors.
- `pnpm test` passes; run `pnpm test:e2e` when API or integration paths are touched.
- If the task changes `packages/web-config`, `packages/web-shared`, or shared auth/session/router leaves: both frontend test suites pass.
- If working on an OpenSpec change: all `tasks.md` checkboxes are checked and `openspec validate --strict` passes for that change.
- If the task has an approved `.pen` frame: a final design parity review against that frame is completed and any remaining deltas are explicitly identified.

## Tooling & Workflow

### Code Search — codebase-memory-mcp
- When codebase-memory-mcp is available, use it for project-wide symbol, dependency, impact, and data-flow lookups. Check the actual project name with `list_projects` or `index_status` before relying on the index.
- Prefer graph tools (`search_graph`, `trace_path`, `query_graph`, `detect_changes`) for indexed relationships. If the index tools are unavailable, incomplete, or stale, use `rg` and direct file inspection and state that limitation for claims that depend on full coverage.
- After a logical set of related edits, re-index before relying on graph results for further decisions. Cross-check coverage with `check_index_coverage` or `index_status` when those tools are available.

### Documentation — Context7
- When you need to verify the behavior of a library, framework, or API, use the Context7 MCP tools (`resolve-library-id` → `query-docs`). Do not rely on memory — always re-check against current documentation.
- For sensitive integrations that are prone to API changes, always double-check via Context7 or official docs before implementing or modifying code.

### Sub-agents for independent work
- You are the orchestrator for sub-agents.
- Use sub-agents when independent, bounded work would materially improve quality, speed, or safety. Keep short, dependent, or tightly coupled work in the primary lane.
- Use an independent reviewer for non-trivial code review when one is available; do not treat a missing review lane as approval.
- Delegate implementation with clear file paths, requirements, constraints, and expected evidence. Include the task context the agent needs rather than assuming access to the current conversation.
- Assign sub-agents disjoint write-scopes (non-overlapping file sets). Do not duplicate work between your own edits and a sub-agent's.
- After each sub-agent completes, re-check the work and fix issues if necessary. Do not take "done" on faith without verification.
