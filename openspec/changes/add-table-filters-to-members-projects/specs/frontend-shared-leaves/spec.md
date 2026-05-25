## ADDED Requirements

### Requirement: Shared Report Export Date Boundary Serialization
Shared frontend report filter validation MUST serialize date-range form values into report export query boundaries without changing the API contract shape.

#### Scenario: Shared report filter form preserves local calendar days
- **WHEN** a shared report filter form receives a valid selected date range from a browser DatePicker
- **THEN** the generated export query sets `dateFrom` to the selected start date's browser-local day start converted to ISO
- **AND** it sets `dateTo` to the next browser-local day start after the selected end date converted to ISO
- **AND** it keeps using the shared report export query schema for payload validation
- **AND** changing the helper implementation to `date-fns` does not alter the inclusive-start/exclusive-end boundary semantics

## MODIFIED Requirements

### Requirement: Shared Management Table Chrome Is Extractable
The frontend codebase SHALL place repeated boxed management-table chrome in `@gitiempo/web-shared` once a second admin page renders the same chrome around its table.

#### Scenario: Shared management table filter helpers stay presentational
- **WHEN** admin management tables render filter controls through the shared management-table chrome
- **THEN** reusable filter input classes and PrimeVue Select/MultiSelect pass-through styling may live in `@gitiempo/web-shared`
- **AND** those helpers remain presentational styling leaves
- **AND** product-specific filter state, option derivation, and row-matching behavior stay in the consuming admin table component
