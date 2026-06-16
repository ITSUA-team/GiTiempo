## 1. Docs And Design Baseline

- [x] 1.1 Re-read `docs/ui/INDEX.md`, `docs/ui/pages-user.md`, `docs/ui/patterns.md`, `docs/ui/accessibility.md`, `apps/user-web/AGENTS.md`, and `apps/api/AGENTS.md` before implementation.
- [x] 1.2 Inspect `GITiempo.pen` frame `Top-Bar Timer Task Picker` (`LKDTn`) and its idle/running variants (`ecXQx`, `sNkdj`), then record the parity checklist for field order, helper copy, loading/error states, actions, spacing, and mobile behavior.
- [x] 1.3 Update `docs/ui/pages-user.md` and `docs/ui/patterns.md` so the top-bar timer task picker explicitly includes workspace-local options, connected-user GitHub-backed options, disconnected fallback behavior, source precedence, and `New task` as the last workspace-task option.
- [x] 1.4 Update API or technical docs for the materialization route if implementation adds a new endpoint or response contract.

## 2. Shared Contracts

- [x] 2.1 Add shared Zod request and response schemas/types for GitHub issue timer-target materialization in `packages/shared/src/contracts`.
- [x] 2.2 Reuse existing GitHub issue, project, task, and pagination/source primitives where practical instead of duplicating response shapes.
- [x] 2.3 Export the new contract types from the shared package entrypoint used by API and frontend consumers.
- [x] 2.4 Add focused shared contract tests for valid repository-source payloads, valid GitHub Project V2-source payloads, invalid payload rejection, and response parsing with GitHub issue linkage.

## 3. API Materialization

- [x] 3.1 Add a NestJS DTO/controller route for resolving a selected GitHub issue into a local timer task target, using the shared contract schemas.
- [x] 3.2 Implement service logic that requires an authenticated active workspace member and a usable connected GitHub account before materialization.
- [x] 3.3 Verify the submitted GitHub issue is visible through the connected GitHub account before creating or returning local work records.
- [x] 3.4 Reuse or extract the existing GitHub project/task external-ref creation logic so existing issue mappings win, no duplicate local task is created for the same GitHub issue external key, and newly created non-admin projects remain visible to the acting user.
- [x] 3.5 Ensure materialization returns local project/task context without creating, stopping, or updating a time entry.
- [x] 3.6 Add API tests for connected success, existing mapping reuse, non-admin visibility preservation, disconnected rejection, invisible issue rejection, closed mapped task rejection, inactive work rejection, and no time-entry side effects.

## 4. User-Web Selector Integration

- [x] 4.1 Add or extend a user-web GitHub client for owners, repositories, Projects V2, repository issues, Project V2 issue items, and issue materialization, with request path, auth, response parsing, and API-error tests.
- [x] 4.2 Introduce a focused picker option model for workspace project options, GitHub source options, workspace task options, GitHub issue options, and the existing `New task` sentinel.
- [x] 4.3 Extend top-bar task option loading so workspace-local projects appear first, connected GitHub sources are additive, disconnected users keep workspace-only behavior, and GitHub errors stay distinct from workspace empty states.
- [x] 4.4 Extend task loading so workspace projects load active open workspace tasks plus last `New task`, while GitHub sources load visible issue candidates and do not offer manual `New task` creation.
- [x] 4.5 Wire GitHub issue materialization into idle confirmation/start and running timer task-change flows before reusing existing timer mutations with the selected description.
- [x] 4.6 Keep `TopBarTimerTaskDialog.vue` visually aligned to the approved `.pen` structure: Project, Task, conditional `New task title`, Description, then popup actions, with PrimeVue controls and no raw replacement selectors.
- [x] 4.7 Add focused component/composable tests for source precedence, disconnected fallback, GitHub issue selection while idle, GitHub issue reassignment while running, materialization failure retryability, `New task` last for workspace tasks, no `New task` for GitHub sources, and mobile dialog behavior.

## 5. Verification

- [x] 5.1 Run `pnpm --filter @gitiempo/shared lint && pnpm --filter @gitiempo/shared typecheck && pnpm --filter @gitiempo/shared test`.
- [x] 5.2 Run `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test`.
- [x] 5.3 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck && pnpm --filter user-web test`.
- [x] 5.4 Run `pnpm openapi:export` if the API route or DTO output changes, and review `packages/shared/openapi.json`.
- [x] 5.5 Complete a final design parity review against `GITiempo.pen` frame `Top-Bar Timer Task Picker` and document any PrimeVue-only compromises.
