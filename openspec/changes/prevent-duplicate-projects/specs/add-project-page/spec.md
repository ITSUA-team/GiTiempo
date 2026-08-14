## MODIFIED Requirements

### Requirement: Add Project Imports An Organization GitHub Project

The Add Project page SHALL let an admin add one of the workspace organizations' open GitHub Projects as a GiTiempo project, without touching projects already added. The page MUST state what pressing the action will create before it is pressed, and MUST NOT promise a setting the import does not apply. A GitHub project whose only repository is already tracked by another GiTiempo project MUST NOT be addable, and the page MUST say which project tracks it.

#### Scenario: The organization scopes the project search

- **GIVEN** the Source field is set to the GitHub import
- **WHEN** the form loads its options
- **THEN** the organization field offers only organizations the workspace has approved
- **AND** the project field stays unavailable until an organization is chosen
- **AND** an organization is preselected only when exactly one is approved

#### Scenario: Choosing a project states what will be created

- **WHEN** the admin chooses a GitHub project
- **THEN** the form shows the derived project name, the repository that will be linked, what the issue scan found, and whether the project is already added or its repository is already tracked by another project
- **AND** it states the consequence of adding it, naming the visibility, the billable default and the manager it will carry

#### Scenario: A project already added cannot be added twice

- **GIVEN** a GitHub project that is already a GiTiempo project
- **WHEN** the admin selects it
- **THEN** the form reports it as already added
- **AND** the add action is unavailable
- **AND** selecting it modifies nothing

#### Scenario: A repository tracked by another project blocks the add

- **GIVEN** a GitHub project whose only repository is already tracked by a different GiTiempo project, in any letter casing
- **WHEN** the admin selects it
- **THEN** the form reports which project already tracks the repository
- **AND** the add action is unavailable
- **AND** selecting it modifies nothing

#### Scenario: A selection that went stale is refused by the server, not trusted

- **GIVEN** the repository became tracked by another project after the options loaded
- **WHEN** the admin submits the import
- **THEN** the import is refused naming the tracking project
- **AND** the page reports it in place without navigating away or creating anything

#### Scenario: No repository is linked when the project spans several

- **GIVEN** a GitHub project whose issues come from more than one repository
- **WHEN** the admin selects it
- **THEN** the form states that no repository will be linked
- **AND** it says why, rather than presenting the absence as a failure

#### Scenario: A project that was not scanned is not described as empty

- **GIVEN** a GitHub project the initial scan did not cover
- **WHEN** the admin selects it
- **THEN** the form scans it before describing it
- **AND** it never reports an unscanned or unreadable project as having no repository

#### Scenario: The chosen settings reach the created project

- **GIVEN** the admin has chosen a GitHub project, a visibility, a billable default and a project manager
- **WHEN** they submit the form
- **THEN** the created project carries that visibility and that billable default
- **AND** the chosen manager is assigned to it

#### Scenario: A refused import is reported in place

- **WHEN** the import is refused
- **THEN** the page shows the reason without navigating away
- **AND** it assigns no manager and reports no success

#### Scenario: GitHub being unavailable is explained rather than shown as failure

- **GIVEN** the workspace has no connected GitHub account, or no approved organization, or the organizations hold no open project
- **WHEN** the Source field is set to the GitHub import
- **THEN** the page explains which of those is the case
- **AND** it does not present the state as a failed request

### Requirement: Add Project Form Collects Required Fields

The Add Project form MUST render the fields required for the chosen source and block invalid submissions. Source MUST be a field of the form rather than a mode chosen elsewhere, and the project manager, visibility and default-billable fields MUST be the same fields for every source, so a project added from GitHub can be given the settings a manual one can. A name already held by an active project MUST be reported against the name field in terms the user can act on, never as a raw storage error.

#### Scenario: Form renders the shared fields for every source

- **WHEN** the Add Project page loads
- **THEN** the form shows a Source field, Project name, Project manager, Visibility, and Default billable for new tasks
- **AND** it shows Add project and Back actions

#### Scenario: Choosing GitHub replaces the typed name with a derived one

- **GIVEN** the Add Project form is open
- **WHEN** the user sets Source to the GitHub import
- **THEN** the form asks for an organization and a GitHub project instead of a typed project name
- **AND** Project name becomes a read-only value derived from the organization and the project
- **AND** Project manager, Visibility and Default billable stay available and unchanged in meaning

#### Scenario: Switching source does not carry an invisible name into a submission

- **GIVEN** the user typed a project name for a manual project
- **WHEN** they switch Source to the GitHub import and back to manual
- **THEN** the typed name is cleared rather than retained out of sight
- **AND** submitting without typing a new one shows the required-name error and sends no request

#### Scenario: Form handles validation and submission

- **WHEN** the user submits an empty project name for a manual project
- **THEN** the form shows an inline validation error and sends no API request
- **AND** valid submission disables duplicate submission while the request is in flight
- **AND** successful creation navigates to the Projects list and shows a success toast
- **AND** failed creation shows an inline error while keeping the form editable

#### Scenario: A name an active project already holds is reported on the field

- **GIVEN** an active project in the workspace holds a name
- **WHEN** the user submits a manual project with that name in any letter casing
- **THEN** the form reports the conflict against the Project name field
- **AND** the form stays editable with the entered values intact
- **AND** the message says a project with that name already exists rather than showing a storage error

#### Scenario: A derived GitHub name that collides is reported before it looks like a failure

- **GIVEN** the derived name for a GitHub import matches an active project
- **WHEN** the user submits the import
- **THEN** the form reports which existing project holds the name
- **AND** it does not report the GitHub project as unimportable
