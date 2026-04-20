# GitHub Milestones With gh

**Version 1.0.0**
GitHub Milestones With gh
April 2026

> **Note:**
> This document is for agents and contributors managing roadmap structure on
> GitHub with `gh` CLI. It focuses on creating repository milestones,
> assigning issues to them, and avoiding common milestone/project-management
> anti-patterns.

---

## 1. Scope

- Applies when using `gh` CLI to create roadmap milestones.
- Applies when assigning existing execution issues to milestones.
- Applies when verifying milestone state and issue membership.
- Does not cover source-control workflows like branching, rebasing, or release tagging.

## 2. Why Milestones

Use repository milestones when you need high-level grouping for roadmap phases or release targets.

Benefits:

- Milestones provide a stable grouping mechanism across issues.
- Milestones work well for phases, releases, or delivery targets.
- Milestones reduce the need for placeholder parent issues.
- Milestones complement project boards instead of duplicating them.

## 3. Milestone Best Practices

- Use one milestone per roadmap phase, release, or delivery window.
- Keep milestone titles stable after creation.
- Write a concise description that explains the intended outcome.
- Do not create milestones for individual tasks.
- Assign actionable issues to milestones; do not use milestones as a substitute for issue breakdown.
- Prefer milestones for planning and project boards for execution tracking.

## 4. Naming Rules

Milestone names should be:

- short
- stable
- easy to search
- consistent across the repository

Good examples:

- `M1 Foundation`
- `M2 Authentication`
- `Q3 Reporting`
- `v1.0 Release`

Rules:

- Keep titles stable once created.
- Use concise descriptions that explain the goal.
- Do not create duplicate milestone names with minor wording changes.

## 5. Creation Workflow

### 5.1 List Existing Milestones First

Always check existing milestones before creating new ones.

Command:

```bash
gh api repos/<owner>/<repo>/milestones
```

### 5.2 Create A Milestone

Use the repository milestones REST API through `gh api`.

Example:

```bash
gh api repos/<owner>/<repo>/milestones \
  -f title='M1 Foundation' \
  -f description='Complete the foundation work needed before product feature delivery begins.'
```

### 5.3 Create The Full Roadmap Set

Create milestones individually and verify each one after creation.

If the roadmap is still changing, create only the next 1-3 milestones first instead of creating a very long milestone list upfront.

## 6. Assigning Issues To Milestones

Once implementation issues exist, assign them to the relevant milestone.

Command pattern:

```bash
gh issue edit <issue-number> --repo <owner>/<repo> --milestone '<milestone-title>'
```

Examples:

```bash
gh issue edit 12 --repo acme/product --milestone 'M1 Foundation'
gh issue edit 34 --repo acme/product --milestone 'M2 Authentication'
```

Batch assignment example:

```bash
gh issue edit 12 18 21 --repo acme/product --milestone 'M1 Foundation'
```

Best practices:

- Assign only actionable issues to milestones.
- Avoid dumping every open issue into a milestone.
- Revisit milestone assignment when scope changes.

## 7. Verification Workflow

### 7.1 Verify Milestones Exist

```bash
gh api repos/<owner>/<repo>/milestones
```

### 7.2 Verify Issues And Their Milestones

```bash
gh issue list --repo <owner>/<repo> --state open --json number,title,milestone
```

### 7.3 Verify One Issue Directly

```bash
gh issue view <issue-number> --repo <owner>/<repo> --json number,title,milestone,url
```

## 8. Project Board Caveat

Milestones and GitHub Projects are separate systems.

Common pitfall:

- an issue can be linked to a project but still be hidden by the board view
- saved filters, grouping, or field-based views can make it appear missing
- milestones do not automatically guarantee project-board visibility

Best practice:

- use milestones for grouping
- use project boards for execution
- verify project filters separately from milestone assignment

## 9. Deletion And Permissions Caveat

Deleting issues is permission-sensitive.

Common failure:

- `Viewer not authorized to delete (deleteIssue)`

Implication:

- creating milestones may succeed even when deleting obsolete issues does not
- do not assume the current `gh` auth token has delete permissions

If cleanup is needed:

- prefer closing obsolete issues when delete permission is unavailable
- or ask a maintainer with sufficient permissions to remove them

## 10. Safe Operating Rules

- List milestones first before creating new ones.
- Do not create duplicate phase milestones.
- Do not create placeholder parent issues if the goal is only roadmap grouping.
- Prefer milestone assignment over project-board-only organization for high-level phases.
- Verify changes immediately after creation.
- Keep milestones outcome-oriented, not task-oriented.
- Keep issue scope small enough that a milestone remains meaningful.

## 11. Suggested Milestone Pattern

Common patterns:

1. Foundation
2. Authentication
3. Core Domain
4. Main User Workflow
5. Integrations
6. Reporting
7. Billing or Admin Operations
8. Quality and Release Readiness

## 12. Anti-Patterns To Avoid

- Using roadmap placeholder issues as the primary representation of milestones
- Creating milestones without checking whether they already exist
- Mixing multiple naming schemes for milestone titles
- Assuming project-board visibility means milestone configuration is correct
- Assuming issue deletion permissions exist on the current GitHub token
- Using milestones for individual engineering tasks
- Creating too many milestones too early

## 13. Useful Commands

List milestones:

```bash
gh api repos/<owner>/<repo>/milestones
```

Create milestone:

```bash
gh api repos/<owner>/<repo>/milestones -f title='M1 Foundation' -f description='Complete the foundation work needed before product feature delivery begins.'
```

Assign issue to milestone:

```bash
gh issue edit <issue-number> --repo <owner>/<repo> --milestone '<milestone-title>'
```

List issues with milestone info:

```bash
gh issue list --repo <owner>/<repo> --state open --json number,title,milestone
```

---

## References

- `gh issue edit --help`
- `gh api --help`
- `gh project item-add --help`
- `gh project item-delete --help`
