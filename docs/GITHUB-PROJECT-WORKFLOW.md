# GitHub Project Workflow

This document describes how GiTiempo work should be structured in GitHub and how issues should be added to the project board with `gh` CLI.

## Scope

- Owner: `ITSUA-team`
- Repository: `GiTiempo`
- Project title: `GiTimpo`
- Project number: `7`

## Work Structure

Use GitHub items with this structure:

1. Milestones
2. Parent issues
3. Sub-issues

### Milestones

Use milestones for high-level delivery phases.

Rules:

- one milestone per phase or major delivery target
- milestone names should stay stable
- milestones group work, they are not implementation tasks

Examples:

- `M1 Product Foundation And Architecture Baseline`
- `M2 Core Product Flows`

### Parent Issues

Use parent issues for larger workstreams that break into multiple actionable child tasks.

Rules:

- parent issues describe the outcome, not every implementation detail
- parent issues should exist on the project board
- if a parent issue has child issues, keep the parent concise and outcome-focused

### Sub-Issues

Use sub-issues for the actual executable tasks.

Rules:

- each sub-issue should have one clear unit of work
- sub-issues can be assigned and tracked independently
- create sub-issues first when the implementation breakdown is already known

## Board Rules

- use `gh`, not `git`, for project board changes
- add issues to the board one by one
- verify issue membership from the issue itself, not only from the board view
- if an issue is linked to the project but not visible in the UI, check filters first

## Authentication Check

Before changing the board:

```bash
gh auth status
gh repo view ITSUA-team/GiTiempo
gh project view 7 --owner ITSUA-team
```

## Useful Commands

View one issue and its board linkage:

```bash
gh issue view <issue-number> --repo ITSUA-team/GiTiempo --json number,title,state,milestone,projectItems,url
```

View the project:

```bash
gh project list --owner ITSUA-team
gh project view 7 --owner ITSUA-team
```

## Add Issue To The Project Board One By One

Add a single issue:

```bash
gh project item-add 7 --owner ITSUA-team --url https://github.com/ITSUA-team/GiTiempo/issues/<issue-number>
```

Verify the issue was added:

```bash
gh issue view <issue-number> --repo ITSUA-team/GiTiempo --json number,title,projectItems,url
```

Recommended flow:

1. create or identify the issue
2. add that issue to project `GiTimpo`
3. verify `projectItems` on the issue
4. repeat for the next issue

Do not bulk-add issues when you need predictable verification.

## Set Status To Backlog

Project constants used by the current board:

- project id: `PVT_kwDOCqTlmM4BU1Mp`
- status field id: `PVTSSF_lADOCqTlmM4BU1MpzhEhrEI`
- `Backlog` option id: `f75ad846`

Update one item status:

```bash
gh project item-edit \
  --id <item-id> \
  --project-id PVT_kwDOCqTlmM4BU1Mp \
  --field-id PVTSSF_lADOCqTlmM4BU1MpzhEhrEI \
  --single-select-option-id f75ad846
```

## Recover An Issue That Does Not Show On The Board

If the issue is already linked to the project but does not appear in the board view:

1. check board filters and current view
2. confirm the issue has a `projectItems` entry
3. if needed, delete and re-add that one issue
4. restore `Status` to `Backlog`

Get the project item id:

```bash
gh api graphql -f query='query { repository(owner: "ITSUA-team", name: "GiTiempo") { issue(number: <issue-number>) { projectItems(first: 20) { nodes { id project { number title } } } } } }'
```

Delete one project item:

```bash
gh project item-delete 7 --owner ITSUA-team --id <item-id>
```

Re-add the issue:

```bash
gh project item-add 7 --owner ITSUA-team --url https://github.com/ITSUA-team/GiTiempo/issues/<issue-number>
```

## Parent Issue Audit

Parent issues with child issues should be present on the board.

Audit command:

```bash
gh api graphql -f query='query { repository(owner: "ITSUA-team", name: "GiTiempo") { issues(first: 100, states: OPEN, orderBy: {field: CREATED_AT, direction: ASC}) { nodes { number title subIssues(first: 20) { totalCount } projectItems(first: 20) { nodes { id project { number title } } } } } } }'
```

Interpretation:

- `subIssues.totalCount > 0` means the issue is a parent issue
- parent issues should have a project item for project `7`
