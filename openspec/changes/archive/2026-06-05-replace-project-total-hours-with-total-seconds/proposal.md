## Why

Project list responses currently expose `totalHours` even though the system stores durations in seconds and UI consumers convert that value back to seconds before formatting hours and minutes. Exposing `totalSeconds` keeps the API aligned with the stored unit, avoids precision loss, and matches the existing detail summary convention.

## What Changes

- **BREAKING** Replace the project response field `totalHours` with `totalSeconds` for project API responses that use the shared project contract.
- Return completed-entry project totals in seconds without dividing by 3600 in the API service layer.
- Update shared Zod contracts, generated OpenAPI output, API docs, and frontend consumers to use `totalSeconds`.
- Keep existing summary fields such as `trackedHoursWeek` and `trackedHoursMonth` unchanged unless a separate change explicitly scopes them.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `contracts`: project response contracts use `totalSeconds` instead of `totalHours`.
- `data-model`: project time aggregate behavior is expressed in seconds for project response totals.
- `admin-projects-page`: admin project table filtering and display consume `totalSeconds` instead of `totalHours`.

## Impact

- `packages/shared/src/contracts/projects.ts`
- `packages/shared/openapi.json`
- `apps/api/src/projects/services/projects.service.ts`
- API tests and fixtures that assert project response shapes
- `apps/admin-web` project table and reports project consumers
- `apps/user-web` fixtures or consumers that rely on project response shape
- `docs/API-ENDPOINTS.md`
