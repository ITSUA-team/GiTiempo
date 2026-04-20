---
name: github-milestones-gh
description: General workflow for creating and managing GitHub repository milestones with gh CLI. Use when organizing roadmap phases, assigning issues to milestones, and verifying milestone state.
license: MIT
metadata:
  author: OpenCode
  version: "1.0.0"
---

# GitHub Milestones With gh

General GitHub milestone workflow using `gh` CLI.

Use this skill when:

- creating repository milestones for roadmap phases
- organizing work without creating placeholder milestone issues
- assigning existing issues to milestones with `gh`
- verifying milestone state and common GitHub Projects edge cases

## Scope

- Tooling: `gh` CLI and GitHub GraphQL where needed
- Focus: repository milestones, not GitHub Project draft items

## Core Decision

- Prefer repository milestones for roadmap phases when high-level grouping is needed.
- Do not create roadmap parent issues if milestones are sufficient for organization.
- Use project board items only for execution issues, not for milestone placeholders.

## How To Use

- Read `AGENTS.md` in this skill for the full workflow.
- Use repository milestones for roadmap phase grouping.
- Add issues to milestones with `gh issue edit -m`, not by creating extra milestone issues.

## Verification

- `gh api repos/<owner>/<repo>/milestones`
- `gh issue list --repo <owner>/<repo> --state open --json number,title,milestone`
