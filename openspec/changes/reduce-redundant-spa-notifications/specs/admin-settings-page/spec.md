# Spec Delta

## MODIFIED Requirements

### Requirement: Admin Settings Page Saves Existing Workspace Configuration

The admin Settings page MUST save changed current API fields through the existing workspace endpoint boundaries.

#### Scenario: Valid save persists changed API-supported fields

- **GIVEN** the admin has changed one or more supported settings fields
- **WHEN** the admin activates `Save Settings`
- **THEN** workspace name changes are sent through `PATCH /workspace`
- **AND** currency, default hourly rate, or time zone changes are sent through `PATCH /workspace/settings`
- **AND** unchanged resources and unchanged fields are not patched just to satisfy request schemas
- **AND** successful save refreshes or reconciles the rendered form from authoritative responses
- **AND** successful workspace name save updates the authenticated admin shell workspace label from the authoritative response
- **AND** the reconciled form communicates success without a redundant success/info notification

#### Scenario: Save failure preserves edits

- **GIVEN** the admin has changed one or more supported settings fields
- **WHEN** a save request fails validation, authorization, or persistence
- **THEN** the page keeps the pending form values available for correction or retry
- **AND** it shows error toast feedback using the repository error-message order
- **AND** it does not render the failed values as persisted state

#### Scenario: Cancel restores persisted settings

- **GIVEN** the admin has unsaved settings changes, including a Time zone change
- **WHEN** the admin activates `Cancel`
- **THEN** the page restores the latest successfully loaded or saved workspace and settings values
- **AND** no update request is sent
