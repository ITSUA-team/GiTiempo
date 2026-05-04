## MODIFIED Requirements

### Requirement: Shared Frontend Extraction Preserves App-Level Ownership

The frontend codebase MUST keep route-level composition and app-specific orchestration local unless a larger abstraction has at least two stable call sites and no product-specific behavior leakage.

#### Scenario: App-specific orchestration remains local

- **WHEN** the two SPAs consume shared frontend leaves
- **THEN** each app still owns its own route map, route guards, auth store orchestration, and page composition
- **AND** shared extraction does not force a single monolithic store, router, shell, or login page across both apps

### Requirement: Identical Cross-SPA Frontend Leaves Are Shared

The frontend codebase MUST place browser-only leaf logic in a shared frontend location when that logic is already behaviorally identical across `apps/user-web` and `apps/admin-web`.

#### Scenario: Shared leaf extraction for identical helpers

- **WHEN** `user-web` and `admin-web` depend on the same auth HTTP helper, current-user client helper, auth runtime helper, refresh-token storage helper, counterpart-workspace link resolver, or pure formatting utility
- **THEN** the implementation uses one shared frontend module for that behavior
- **AND** the two SPAs do not keep separate app-local copies of the same leaf logic

#### Scenario: Shared auth runtime behavior stays aligned

- **WHEN** either SPA performs backend token exchange, token refresh, logout, current-user loading, or identity-provider sign-in/sign-out through behavior that is already identical
- **THEN** both SPAs use the same shared frontend auth leaf implementation for that identical behavior
- **AND** the shared extraction does not change the existing auth contract or runtime semantics

#### Scenario: Shared counterpart workspace links stay aligned

- **WHEN** either SPA renders a link to the counterpart workspace
- **THEN** it uses the same shared frontend workspace-link resolver
- **AND** configured counterpart workspace URL behavior stays consistent across both SPAs

## ADDED Requirements

### Requirement: Shared API Clients Use Unified Transport

All API client modules in `packages/web-shared/src/api/` MUST use `requestJson` from `@gitiempo/web-shared/http` as the sole HTTP transport primitive.

No additional `getJson` / `postJson` / `patchJson` / `deleteJson` wrappers SHALL exist alongside `requestJson` in the same package.

#### Scenario: GET request via shared client

- **WHEN** a shared API client performs a GET request
- **THEN** it calls `requestJson` with `method` omitted (defaults to GET) or `method: "GET"`
- **AND** does not call a separate `getJson` helper

#### Scenario: Mutating request via shared client

- **WHEN** a shared API client performs a POST, PATCH, or DELETE request
- **THEN** it calls `requestJson` with the appropriate `method` and optional `body`
- **AND** does not call `postJson`, `patchJson`, or `deleteJson`

#### Scenario: Legacy helpers are removed

- **WHEN** the migration is complete
- **THEN** `packages/web-shared/src/api/http-helpers.ts` does not exist
- **AND** no import of `http-helpers` remains in the codebase
