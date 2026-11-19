## ADDED Requirements

### Requirement: Saved report presets follow the active workspace on Reports
The Reports page SHALL bind the saved preset list, active preset, unsaved-change indicator and preset actions to the active workspace.

#### Scenario: Switch with a modified preset loaded
- **GIVEN** an admin on Reports in A has loaded a preset, changed its configuration and opened a preset action
- **WHEN** the admin successfully switches to B and retains access to Reports
- **THEN** the page clears A's preset tabs, active selection, saved configuration baseline, dirty indicator and open action
- **AND** the page automatically shows B's available presets with none selected, or an empty saved reports bar if B has none
- **AND** saving over, renaming or deleting A's preset from B is unavailable

#### Scenario: An old preset mutation completes during the new visit
- **GIVEN** a preset save, rename or deletion from A is still in flight after the switch to B
- **WHEN** the operation succeeds or fails
- **THEN** B's preset list, active preset, loading state and visible feedback remain unaffected

#### Scenario: Presets fail independently of report rows
- **GIVEN** the admin has switched to B and its report rows have loaded
- **WHEN** the preset list for B fails to load
- **THEN** the saved reports bar shows the failure while B's report remains usable and A's presets remain unavailable
