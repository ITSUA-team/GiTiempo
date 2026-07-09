## ADDED Requirements

### Requirement: Workspace Membership Spec Has Purpose Metadata

The OpenSpec catalog SHALL carry purpose metadata for the `workspace-membership` specification without changing the existing membership, access, role, and member-management behavior requirements.

#### Scenario: Workspace membership purpose is present after archive

- **WHEN** this change is applied or archived into the canonical specs
- **THEN** the `workspace-membership` spec includes a `## Purpose` section before `## Requirements`
- **AND** the purpose explains how workspace memberships gate application access, determine active workspace context, and support administrative member management
- **AND** existing requirements and scenarios remain semantically unchanged
