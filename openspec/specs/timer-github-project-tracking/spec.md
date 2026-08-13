# Timer GitHub Project Tracking Specification

## Purpose

Define how approved organization GitHub project boards are offered as timer targets: how they are listed independently of GiTiempo projects, how selecting a board lists its trackable issues, how starting a timer on a board issue creates the project through the server, and why a board selection never reaches a path that requires a project to already exist.

## Requirements

### Requirement: Organization GitHub Project Boards Are Offered As Timer Targets

The timer picker SHALL offer the open GitHub Project boards of the organizations the workspace allows as selectable targets beside GiTiempo projects, and MUST source those organizations from the same list that governs GitHub browsing so an organization the workspace has not approved can never be presented.

#### Scenario: Approved organization boards are listed

- **GIVEN** a member with a connected GitHub account and a workspace that allows one organization
- **WHEN** they open the timer picker
- **THEN** the picker offers that organization's open GitHub Project boards as a group distinct from GiTiempo projects
- **AND** it offers no board from an organization the workspace has not approved

#### Scenario: Closed boards are not offered

- **GIVEN** an organization with both open and closed GitHub Project boards
- **WHEN** the picker lists board targets
- **THEN** only the open boards appear

#### Scenario: Boards are presented as a separate kind, not as projects

- **WHEN** the picker lists boards alongside GiTiempo projects
- **THEN** boards are labelled as GitHub Projects rather than shown as ordinary project entries
- **AND** choosing one is distinguishable from choosing a GiTiempo project

#### Scenario: Personal-account boards are not offered

- **GIVEN** a member whose connected account owns personal GitHub Project boards
- **WHEN** the picker lists board targets
- **THEN** only organization boards appear

#### Scenario: No connected account is explained rather than shown as failure

- **GIVEN** a member with no connected GitHub account
- **WHEN** they open the timer picker
- **THEN** the picker explains that connecting GitHub adds boards
- **AND** it does not present the state as a failed request
- **AND** the member's GiTiempo projects remain selectable

#### Scenario: No approved organization is explained separately

- **GIVEN** a member with a connected GitHub account in a workspace that allows no organization
- **WHEN** they open the timer picker
- **THEN** the picker explains that no organization is approved for the workspace
- **AND** that state is distinguishable from having no connected account

#### Scenario: Board loading failure stays distinct from an empty list

- **WHEN** loading owners or boards fails
- **THEN** the picker shows a request-failure state
- **AND** it does not report the failure as an absence of boards

#### Scenario: A bounded number of boards is loaded

- **GIVEN** an organization with more boards than the picker loads
- **WHEN** the board targets are listed
- **THEN** the picker loads a bounded number of them
- **AND** it indicates that the list is not exhaustive rather than implying it is complete

### Requirement: Boards Are Listed Independently Of GiTiempo Projects

The picker MUST NOT hide a board because a GiTiempo project already tracks one of its repositories. A board is a view over issues that may span several repositories, and one repository's issues may appear on several boards.

#### Scenario: A board whose repository is already tracked still appears

- **GIVEN** a GiTiempo project that already tracks a repository
- **AND** an organization board holding issues from that repository
- **WHEN** the picker lists its targets
- **THEN** both the GiTiempo project and the board are offered

#### Scenario: Starting from a board reuses an existing project for that repository

- **GIVEN** a GiTiempo project already tracks the repository of a board issue
- **WHEN** the member starts a timer on that issue from the board
- **THEN** the existing project is reused
- **AND** no duplicate project is created

#### Scenario: A board that was imported as a project receives its own issues

- **GIVEN** a board that an admin added as a GiTiempo project
- **AND** no GiTiempo project tracks the repository of one of its issues
- **WHEN** the member starts a timer on that issue from the board
- **THEN** the timer runs against the project that was added for the board
- **AND** no second project is created for the repository

#### Scenario: The repository decides when both exist

- **GIVEN** a board that was added as a project
- **AND** a separate GiTiempo project tracking the repository of one of its issues
- **WHEN** the member starts a timer on that issue from the board
- **THEN** the timer runs against the project tracking the repository
- **AND** time already recorded against that repository is not split away from it

#### Scenario: An issue keeps the project that already holds it

- **GIVEN** an issue already tracked in the project added for its board
- **AND** a project for that issue's repository appears afterwards
- **WHEN** the member starts a timer on the same issue from the same board again
- **THEN** the timer runs against the project that already holds it
- **AND** the request is not refused

### Requirement: Selecting A Board Lists Its Trackable Issues

Selecting a board SHALL list that board's open issues in the task field. Each listed issue MUST carry the repository it belongs to, since that repository is what the timer is started against. Board items that are not trackable issues MUST be reported rather than silently dropped.

#### Scenario: Open board issues appear after choosing a board

- **GIVEN** the picker is open and board targets are available
- **WHEN** the member selects a board
- **THEN** the picker lists that board's open issues as selectable task options
- **AND** each option carries the repository and issue number it came from
- **AND** it does not request tasks for a GiTiempo project

#### Scenario: A board holding only draft items reports them

- **GIVEN** a board whose items are all drafts, with no repository behind them
- **WHEN** the member selects it
- **THEN** the picker lists no task options
- **AND** it reports how many draft items the board holds
- **AND** it does not present the state as a failed request

#### Scenario: Archived board items are not offered

- **GIVEN** a board containing archived items
- **WHEN** its issues are listed
- **THEN** archived items do not appear

#### Scenario: Switching away from a board clears its issues

- **GIVEN** a board is selected with its issues listed
- **WHEN** the member selects a GiTiempo project instead
- **THEN** the board's issues are cleared
- **AND** the project's own tasks are listed

#### Scenario: Board issue loading failure stays distinct from an empty board

- **WHEN** loading a board's issues fails
- **THEN** the picker shows a request-failure state
- **AND** it does not report the failure as a board with no issues

### Requirement: Starting A Timer On A Board Issue Creates The Project Through The Server

Starting a timer against a board issue SHALL use the existing GitHub start-timer request with the issue's own repository, rather than creating a project from the client. The member MUST end up with a running timer against a task in a GiTiempo project that tracks that repository.

#### Scenario: First timer on a board issue creates the project and task

- **GIVEN** a board issue whose repository no GiTiempo project tracks
- **WHEN** the member starts a timer on it
- **THEN** the server creates the project, materialises the task, and starts the timer in one request
- **AND** the member can see the resulting project afterwards

#### Scenario: The created project appears among projects afterwards

- **GIVEN** a member has started a timer from a board issue
- **WHEN** they reopen the picker
- **THEN** the new GiTiempo project appears among their projects
- **AND** the board remains offered, because it may hold issues from other repositories

#### Scenario: Issues from different repositories on one board each reach their own project

- **GIVEN** a board holding issues from two repositories
- **WHEN** the member starts a timer on an issue from each
- **THEN** each timer runs against a project tracking that issue's own repository

### Requirement: A Board Selection Never Reaches A Path That Requires A Project

The picker MUST keep board targets out of the state that represents selected GiTiempo projects, so that no code path expecting a project identifier can receive a board.

#### Scenario: Creating a task inline is not offered for a board

- **GIVEN** a board is selected in the picker
- **WHEN** the member opens the task field
- **THEN** the new-task option is not listed at all
- **AND** the task options are the board's issues only

#### Scenario: A board with no issues explains itself rather than offering a dead action

- **GIVEN** a board whose items yield no trackable issue
- **WHEN** the member opens the task field
- **THEN** the picker states that the board has no issues to track yet
- **AND** it points at GitHub as the place that changes it
- **AND** it does not invite the member to create a task

#### Scenario: Choosing a board drops a task selected under the previous project

- **GIVEN** a GiTiempo project is selected with a task chosen
- **WHEN** the member selects a board instead
- **THEN** the chosen task is cleared
- **AND** the timer cannot be started until one of the board's issues is chosen

#### Scenario: A running timer cannot be reassigned to a board issue directly

- **GIVEN** a timer is already running
- **WHEN** the member selects a board issue
- **THEN** the picker does not offer to reassign the running timer to it without materialising a task first

#### Scenario: Reopening the picker restores a project, never a board

- **GIVEN** a timer was started from a board issue
- **WHEN** the member reopens the picker
- **THEN** the restored selection is the created GiTiempo project and its task
- **AND** it is not the board that started it
