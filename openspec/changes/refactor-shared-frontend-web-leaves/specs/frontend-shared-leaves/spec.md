## ADDED Requirements

### Requirement: Identical Cross-SPA Frontend Leaves Are Shared
The frontend codebase MUST place browser-only leaf logic in a shared frontend location when that logic is already behaviorally identical across `apps/user-web` and `apps/admin-web`.

#### Scenario: Shared leaf extraction for identical helpers
- **WHEN** `user-web` and `admin-web` depend on the same auth HTTP helper, current-user client helper, auth runtime helper, refresh-token storage helper, or counterpart-workspace link resolver
- **THEN** the implementation uses one shared frontend module for that behavior
- **AND** the two SPAs do not keep separate app-local copies of the same leaf logic

### Requirement: Shared Frontend Extraction Preserves App-Level Ownership
The frontend codebase MUST keep route-level composition and app-specific orchestration local unless a larger abstraction has at least two stable call sites and no product-specific behavior leakage.

#### Scenario: App-specific orchestration remains local
- **WHEN** the two SPAs consume shared frontend leaves
- **THEN** each app still owns its own route map, route guards, auth store orchestration, and page composition
- **AND** shared extraction does not force a single monolithic store, router, shell, or login page across both apps

### Requirement: Shared UI Components Require Proven Structural Similarity
The frontend codebase SHALL extract Vue UI components into shared frontend code only when the compared `user-web` and `admin-web` regions are structurally similar enough to be parameterized without hiding product-specific differences.

#### Scenario: Small common layout block is shared
- **WHEN** both SPAs contain the same shell or login sub-region with the same structure and interaction behavior
- **THEN** that sub-region may be implemented as a shared Vue component
- **AND** product-specific copy, navigation items, and app-only layout decisions remain configurable or local to each SPA
