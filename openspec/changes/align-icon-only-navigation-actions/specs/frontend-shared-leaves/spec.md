## MODIFIED Requirements

### Requirement: Shared Authenticated Navigation Uses User-Web Text-Only Base

The frontend codebase SHALL extract authenticated shell navigation into `@gitiempo/web-shared` when the user/admin nav structure can be shared without moving route ownership or active-state logic out of the apps, and the shared navigation surface MUST render icon-only items that preserve label text as tooltip and accessible-label copy.

#### Scenario: Shared navigation keeps app-local route ownership

- **WHEN** `user-web` and `admin-web` consume a shared navigation component
- **THEN** each app still defines its own nav item list, route names, optional route targets, active-state logic, and per-item icon metadata
- **AND** the shared component owns only presentational sidebar/mobile nav rendering

#### Scenario: Shared navigation uses icon-only visual language

- **WHEN** the shared authenticated navigation is rendered in either SPA
- **THEN** it renders per-item icons without visible navigation text labels in the sidebar
- **AND** each item uses the former text label as tooltip copy and accessible label
- **AND** default, hover, and active visual states follow the documented navigation token styling

#### Scenario: Shared desktop and tablet sidebar width fits icon-only content

- **WHEN** the shared authenticated navigation is rendered in tablet or desktop sidebar layouts
- **THEN** the sidebar width fits the icon-only navigation content instead of using a fixed full-width desktop rail
- **AND** the tappable item hit area, hover treatment, active-state indicator, and accessible labeling remain unchanged

#### Scenario: Shared mobile navigation remains accessible

- **WHEN** the shared authenticated navigation is rendered in the mobile navigation pattern
- **THEN** it keeps the existing bottom navigation bar layout while rendering icon-only items without visible text labels
- **AND** each mobile navigation item exposes the same accessible label as its desktop counterpart
- **AND** removing visible text does not remove the tappable navigation target or active-route indication
