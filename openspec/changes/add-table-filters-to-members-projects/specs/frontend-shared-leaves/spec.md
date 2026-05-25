## MODIFIED Requirements

### Requirement: Shared Management Table Chrome Is Extractable
The frontend codebase SHALL place repeated boxed management-table chrome in `@gitiempo/web-shared` once a second admin page renders the same chrome around its table.

#### Scenario: Shared management table filter helpers stay presentational
- **WHEN** admin management tables render filter controls through the shared management-table chrome
- **THEN** reusable filter input classes and PrimeVue Select/MultiSelect pass-through styling may live in `@gitiempo/web-shared`
- **AND** those helpers remain presentational styling leaves
- **AND** product-specific filter state, option derivation, and row-matching behavior stay in the consuming admin table component
