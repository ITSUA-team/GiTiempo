# ADR 008: Unified PR CI and Deploy Gates

**Status:** Approved  
**Date:** 2026-05-07

## Context

GI Tiempo is a pnpm/Turbo monorepo with an API, two frontend SPAs, and shared packages. The previous GitHub Actions setup had an API-only pull request workflow, frontend checks embedded in staging deploy workflows, and repeated install/lint/typecheck/test steps across workflows. This left frontend PRs without automated checks and made workflow behavior harder to keep consistent.

The repository needs one required PR status check for `main`, no standalone push CI for `staging`, and deploy workflows that can gate deployment without duplicating CI logic.

## Decision

Use one unified `CI` workflow for pull requests targeting `main`.

The workflow detects changed files, builds a package matrix, and runs the shared `.github/actions/workspace-check` composite action for each affected target. A stable aggregate job named `CI required` is the only status check that branch protection or repository rulesets should require.

Deploy workflows reuse the same composite action as their pre-deploy gate. The `staging` branch does not have a separate push CI workflow; staging deploy workflows perform the checks they need before deployment.

Frontend staging deployment uses one matrix workflow for both SPAs. API deployment remains separate because it builds and smoke-tests a Docker image before VPS rollout.

## Alternatives Considered

### Separate CI Workflow Per App

Separate workflows are easy to understand per app, but they duplicate setup and make required branch checks brittle as apps/packages change.

### Require Every Matrix Job In Branch Protection

Requiring each dynamic package job would make branch protection depend on matrix names. Docs-only PRs and future package changes could leave required checks missing or pending.

### Standalone Push CI On `staging`

Standalone push CI would repeat deploy gates. The staging branch is a deployment branch, so deployment workflows should own the checks required before rollout.

## Consequences

- PRs to `main` have one stable required status: `CI required`.
- Frontend PRs receive checks before merge.
- Shared package changes fan out to the apps that depend on them.
- Deploy workflows and PR CI share one package-check implementation.
- Direct pushes to `main` must be blocked in GitHub rules because there is intentionally no push CI for `main`.
- Prebuilt API image deploys skip source checks and rely on prior image provenance, but still run Docker image smoke tests before rollout.
