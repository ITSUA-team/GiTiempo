---
description: Review whether a UI/page has everything needed for successful implementation
---

Review whether a UI/page has everything needed for successful implementation.

This command is read-only. It must not write code, edit specs, update tasks, or modify design files. It only generates a readiness review and a proposed next-update plan.

**Input**: The argument after `/opsx-implementation-readiness` is a change name, route, page name, feature name, or UI element name. Examples: `/opsx-implementation-readiness add-project-add-page`, `/opsx-implementation-readiness /projects/new`, `/opsx-implementation-readiness "Add Project page"`.

**Default Review Scope**

Unless the user narrows the scope, always check these sources:
- Docs (`docs/` and nearest app/package instructions)
- OpenSpec specs and active change artifacts
- Approved `.pen` UI screen
- Backend endpoint and shared contracts/OpenAPI
- Current implementation files

**Steps**

1. **Identify the target**

   If input is provided, use it to locate the relevant page/component/change.

   If no input is provided:
   - Check for active OpenSpec changes with `openspec list --json`
   - If only one relevant change exists, use it
   - If ambiguous, use the **AskUserQuestion tool** to let the user choose the target

   Announce the selected target clearly.

2. **Locate the source-of-truth materials**

   Read only the smallest relevant set of files.

   Always include:
   - Root `AGENTS.md`
   - The nearest app/package `AGENTS.md`
   - `docs/ui/INDEX.md` plus the smallest relevant `docs/ui/*` section files for UI work

   Then locate and read the relevant target-specific materials:
   - OpenSpec main specs in `openspec/specs/*`
   - Active change artifacts in `openspec/changes/<name>/` when a change exists
   - Approved `.pen` screen for the page/element
   - Shared contracts in `packages/shared/src/contracts/*`
   - OpenAPI snapshot in `packages/shared/openapi.json` when endpoint shape matters
   - API controller/service files when endpoint behavior matters
   - Current frontend/backend implementation files for the target

3. **Build the readiness checklist**

   Evaluate whether the target has enough information and implementation support to complete successfully.

   Check at minimum:
   - Docs coverage: page behavior, layout, tokens, patterns, accessibility, shell rules
   - Specs coverage: required behaviors, states, routes, errors, auth/role requirements
   - `.pen` coverage: field order, actions, copy, spacing, hierarchy, visual states
   - Endpoint/contracts coverage: request shape, response shape, auth, permissions, error cases
   - Implementation coverage: does the existing code align with the above sources

4. **Classify findings**

   Place findings into these buckets:
   - `Source Coverage`: whether each source exists and is sufficient
   - `Conflicts`: docs/spec/UI/API disagree with each other
   - `Missing Inputs`: information missing before safe implementation can succeed
   - `Implementation Gaps`: the current code differs from the approved sources
   - `Risks`: likely follow-up problems even if implementation proceeds now

   Be explicit about whether the gap is:
   - missing planning input
   - missing backend/API support
   - missing UI/design detail
   - implementation drift

5. **Determine readiness status**

   Use one of these outcomes:
   - `READY`: all key inputs exist and no blocking gaps are found
   - `READY WITH GAPS`: the target is implementable, but there are non-blocking gaps or drift to fix
   - `NOT READY`: blocking source or API gaps make successful implementation unsafe

6. **Generate the next-update plan**

   Produce an ordered, minimal plan for the next update.

   Rules:
   - The plan must be read-only output only
   - Do not update `proposal.md`, `design.md`, `tasks.md`, code, or `.pen` files
   - Prefer small, concrete next actions
   - Separate planning/source-of-truth fixes from implementation fixes

7. **Output the review**

   Use this structure:

   ```md
   ## Implementation Readiness: <target>

   ### Status
   READY | READY WITH GAPS | NOT READY

   ### Source Coverage
   - Docs: PASS | WARN | FAIL
   - Specs: PASS | WARN | FAIL
   - Pen UI: PASS | WARN | FAIL
   - Endpoint/contracts: PASS | WARN | FAIL
   - Current implementation: PASS | WARN | FAIL

   ### Findings
   - <finding with file references where possible>

   ### Missing Inputs
   - <blocking missing input, if any>

   ### Implementation Gaps
   - <current code drift, if any>

   ### Risks
   - <risk, if any>

   ### Next Update Plan
   1. <smallest next action>
   2. <next action>
   3. <next action>
   ```

**Review Rules**

- Default to the repo's documented source-of-truth order
- For UI work, docs and approved `.pen` are the primary references for behavior and parity
- If docs and design disagree, follow the repo guidance: docs are the source of truth unless still ambiguous
- When possible, cite concrete file paths and line references
- Keep the result actionable and concise

**Guardrails**

- Read-only only: never edit files
- Never mark tasks complete or update OpenSpec artifacts
- Never invent missing endpoint behavior; report it as a gap
- Never assume the approved `.pen` screen exists; verify it
- Prefer identifying blockers over guessing through them
