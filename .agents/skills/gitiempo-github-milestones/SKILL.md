---
name: github-milestones-gh
description: General workflow for managing GitHub milestones and issues with gh CLI. Use when organizing roadmap phases, creating execution issues, assigning issues to milestones, and verifying project tracking state.
license: MIT
metadata:
  author: OpenCode
  version: "1.0.0"
---

# GitHub Milestones And Issues With gh

General GitHub milestone and issue workflow using `gh` CLI.

Use this skill when:

- creating repository milestones for roadmap phases
- organizing work without creating placeholder milestone issues
- creating and updating actionable GitHub issues
- assigning existing issues to milestones with `gh`
- structuring parent issues and sub-issues
- verifying milestone state and common GitHub Projects edge cases

## Scope

- Tooling: `gh` CLI and GitHub GraphQL where needed
- Focus: repository milestones and issues, not GitHub Project draft items

## Core Decision

- Prefer repository milestones for roadmap phases when high-level grouping is needed.
- Prefer actionable issues for real work tracking.
- Do not create roadmap parent issues if milestones are sufficient for organization.
- Use project board items only for execution issues, not for milestone placeholders.

## How To Use

- Read `AGENTS.md` in this skill for the full workflow.
- Use repository milestones for roadmap phase grouping.
- Use issues for execution work, not milestone descriptions.
- Add issues to milestones with `gh issue edit -m`, not by creating extra milestone issues.

## Verification

- `gh api repos/<owner>/<repo>/milestones`
- `gh issue list --repo <owner>/<repo> --state open --json number,title,milestone`
- `gh issue view <issue-number> --repo <owner>/<repo> --json title,body,labels,milestone,projectItems`
