## REMOVED Requirements

### Requirement: Project Response Includes Member Count
**Reason**: Superseded by Project Responses Exclude Member Count Scalar in project-members-list and the existing shared contract, which has no memberCount field.
**Migration**: Keep memberCount absent. Derive counts from members.length only for full-project scope; hide counts for own-time responses whose empty member list is redacted. No scalar is introduced or removed from the current API implementation.
