## ADDED Requirements

### Requirement: User-Web Top-Bar Timer Center Region

The authenticated user-web shell MUST reserve the top-bar center region for the compact timer surface while preserving the shared shell pattern and keeping admin-web unaffected.

#### Scenario: User-web top bar shows compact timer center content

- GIVEN the authenticated user-web shell is rendered
- WHEN the top bar is shown
- THEN the left side displays the product identity and workspace name
- AND the center region displays the compact top-bar timer surface
- AND the right side displays counterpart workspace and user identity controls

#### Scenario: Admin-web top bar has no timer center content

- GIVEN the authenticated admin-web shell is rendered
- WHEN the top bar is shown
- THEN the shell does not render a compact timer surface
- AND the existing admin-web top-bar identity and counterpart workspace controls remain available

#### Scenario: Compact timer fits top-bar height

- GIVEN the user-web top bar uses the documented `h-16` shell height
- WHEN the compact timer renders in running, idle, loading, error, or disabled state
- THEN the timer surface remains compact enough to fit the top bar
- AND smaller widths truncate task context text before removing the elapsed time value or timer action
