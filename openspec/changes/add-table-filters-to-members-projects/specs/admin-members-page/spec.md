## ADDED Requirements

### Requirement: Members Table Discovery Filters
The Members page MUST render report-style table discovery controls that filter loaded member rows locally without changing backend scope.

#### Scenario: Members table exposes search and column filters
- **WHEN** workspace member data has loaded
- **THEN** the table card header exposes a global search control with placeholder `Search members`
- **AND** the desktop table renders a filter row directly below the column header with controls for member name/email, role, assigned projects, and last active
- **AND** the Actions column does not render a filter control
- **AND** the mobile card list renders equivalent search and filter controls above the cards

#### Scenario: Members filters narrow loaded rows locally
- **WHEN** the user enters global search text or selects role, assigned-project, or last-active filters
- **THEN** visible member rows and mobile cards are limited to loaded members matching all active filters
- **AND** global search matches member display name, email, formatted role, assigned project labels or counts, and formatted last-active text
- **AND** last-active filter options are `Any activity`, `Active today`, `Active this week`, and `No activity`
- **AND** `Active today` uses the current browser-local calendar day
- **AND** `Active this week` includes valid `lastActiveAt` values from browser-local Monday `00:00` through the current time
- **AND** `No activity` includes members with missing or invalid `lastActiveAt`
- **AND** clearing active filters restores all loaded members allowed by the page's role scope
- **AND** no member-list API request is required solely for table filtering

#### Scenario: Members filtering preserves management actions
- **WHEN** a filtered member row is visible
- **THEN** existing Assign PM, Edit, and Remove actions keep their accessibility labels, confirmation behavior, inline expansion behavior, and refresh events
- **AND** if an expanded row becomes excluded by filters, the expanded state does not remain visible for a hidden row
