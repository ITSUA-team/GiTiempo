## ADDED Requirements

### Requirement: User Projects Updated Metadata Uses Browser-Local Timezone

The user-web Projects list page SHALL format task updated metadata in the authenticated user's current browser-local timezone.

#### Scenario: Updated metadata uses local day-relative labels

- **GIVEN** the Projects list page renders task `updated` metadata from stored task timestamps
- **WHEN** a task timestamp falls on the user's current browser-local calendar day or previous browser-local calendar day
- **THEN** the rendered metadata uses browser-local `Today` or `Yesterday` labeling with browser-local time
- **AND** it does not derive those labels from UTC day boundaries

#### Scenario: Older updated metadata uses local weekday and time

- **GIVEN** the Projects list page renders task `updated` metadata for an older timestamp
- **WHEN** the timestamp is outside the user's current browser-local today/yesterday windows
- **THEN** the rendered metadata uses browser-local weekday and browser-local time formatting
- **AND** it does not render a raw ISO string or UTC-only formatted time label
