## ADDED Requirements

### Requirement: Refreshed access token carries correct JWT claims
The system SHALL include current membership state (sub, firebaseUid, workspaceId, role) in the access token issued during refresh.

#### Scenario: Refreshed token has correct claims
- **WHEN** a user refreshes their token pair and the refreshed access token is decoded
- **THEN** the payload contains `sub` matching the user id, `firebaseUid` matching the user's Firebase UID, `workspaceId` matching the active membership workspace, and `role` matching the active membership role

#### Scenario: Refreshed token reflects role change
- **WHEN** a user's role is changed from "admin" to "pm" and the user then refreshes their token pair
- **THEN** the decoded access token payload contains `role` equal to "pm"
