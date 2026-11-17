# Personal invoice groups

## Purpose

Allow each workspace member with invoice access to organize their visible invoices independently and retain that organization between sessions.

## ADDED Requirements

### Requirement: Manage flat groups in a personal workspace collection

The system SHALL allow an authorized invoice user to create, list, rename and delete groups owned by that user in the active workspace. Names MUST be nonblank and unique after trimming and case-insensitive comparison within that collection. Groups have no parent. All invoices and Ungrouped are built-in views, independent of group records.

#### Scenario: A group persists for its owner

- **GIVEN** an authorized PM creates a personal group
- **WHEN** the PM signs in again to the same workspace and renames the group
- **THEN** the group retains its invoices and the new name appears only in that user's collection
- **AND** another user or a different workspace can independently use the same name

#### Scenario: Invalid names and nesting

- **GIVEN** the user owns a group named Retainers
- **WHEN** they submit a blank name, a conflicting name for a different group, or a parent group identifier
- **THEN** the request fails validation and the collection is unchanged

### Requirement: Query visible invoices within a personal group

The system SHALL offer All invoices, Ungrouped and each owned group with counts of distinct accessible invoices. Group selection MUST compose with search, project, status, date filters and pagination. Membership MUST never give access to an invoice.

#### Scenario: Count and list use the same authorized population

- **GIVEN** the same invoice is grouped by one person and ungrouped for another
- **WHEN** each opens their list with no search or filters
- **THEN** both see it in All invoices if authorized, and only the second sees it in Ungrouped
- **AND** each group count equals its unfiltered, unpaginated accessible population; search and filters narrow the selected list before pagination

#### Scenario: Access is revoked

- **GIVEN** a PM previously grouped a project invoice
- **WHEN** project access is lost
- **THEN** the invoice contributes to no visible count, list, search result or bulk move for that PM
- **AND** losing invoice permission altogether denies group operations

### Requirement: Move one or several invoices as a personal operation

The system SHALL assign at most one group per invoice, user and workspace. Single and bulk moves to an owned group or Ungrouped SHALL replace the caller's assignments as one operation. The caller and workspace MUST come from the authorized session.

#### Scenario: Move and remove persist without business changes

- **GIVEN** a user selects invoices in Ungrouped or in different groups
- **WHEN** they move them to one destination and later remove one from that group
- **THEN** each appears once in its new location and the removed invoice is Ungrouped
- **AND** no other user's organization, invoice revision, status, saved lines, totals or PDF content changes

#### Scenario: A mixed or forged request cannot partially move invoices

- **GIVEN** a destination belongs to another user or workspace, or a selected invoice is inaccessible
- **WHEN** a caller attempts the move through the API
- **THEN** the request fails without revealing inaccessible records or changing any selected membership
- **AND** listing, reading, renaming or deleting another owner's group by identifier is also denied

### Requirement: Create into a group and delete a group independently

Invoice creation SHALL accept an optional owned group and persist the caller's membership together with the new invoice. Deleting an owned group SHALL remove its assignments while preserving invoices.

#### Scenario: Create from a selected group

- **GIVEN** a custom group is open
- **WHEN** the user starts creating an invoice
- **THEN** that group is preselected and the user may choose a different destination or Ungrouped
- **AND** saving places the invoice in the chosen destination, while an invalid destination creates neither the invoice nor its entry links

#### Scenario: Delete group

- **GIVEN** a personal group contains invoices also organized by other users
- **WHEN** its owner confirms deletion
- **THEN** those invoices remain in All invoices and return to Ungrouped for the owner wherever the owner still has access
- **AND** other users' memberships and the invoices themselves are preserved
