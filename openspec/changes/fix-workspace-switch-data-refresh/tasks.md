# Tasks

## 1. Admin Projects

- [ ] 1.1 Scope project rows, counters, member options and open actions to the current visit. In a mounted Projects view, switch between two populated workspaces and verify the displayed values and available actions before and after the destination resolves.
- [ ] 1.2 Guard asynchronous completions. Cover a rapid A → B → A, an empty destination, a failed destination load, a rejected switch and same-workspace token renewal. Verify obsolete results cannot replace current data or load status and the initial mount loads each resource once.

## 2. Admin Members

- [ ] 2.1 Reload members, project assignment choices and invitations on switch. In the mounted Members view, verify distinct rows and counters in both workspaces and independent handling of a delayed or failed invitation response.
- [ ] 2.2 Reset open edits, dialogs and pending action targets. Exercise a switch during an assignment or invitation action and verify no action against an A identity can be submitted from B.

## 3. Admin Add Project

- [ ] 3.1 Reload manager choices and reset the selected manager in the actual form state. Verify the submitted payload after switching cannot contain A's manager ID.
- [ ] 3.2 Reset GitHub selection and reload import metadata for the active workspace while preserving the source mode. Cover distinct installations, already-imported boards or repositories, a late scan and a disconnected destination. Verify only a valid destination board can be submitted.

## 4. Admin Reports

- [ ] 4.1 Reset the saved preset collection, active selection, saved baseline and dialogs on switch. Verify the mounted Reports view shows B's tabs and clears A's dirty indicator and actions, including when B has no presets.
- [ ] 4.2 Isolate in-flight preset reads and writes by visit. Resolve an A mutation after B's list arrives and fail B's preset load in a separate test. Verify B's bar reflects only B's results and the report rows remain available within the existing request budget.

## 5. Integration verification

- [ ] 5.1 Prepare manual QA in a local or test environment. Sign in as an admin with access to workspaces A and B. Record their distinct project totals, members, managers, invitations and saved report names. Use GitHub installations with distinct boards and import history for the import checks. Verify the fixtures can distinguish the source data from the destination data.
- [ ] 5.2 Manually reproduce [#522](https://github.com/ITSUA-team/GiTiempo/issues/522). Open Projects in A, select a member filter and expand a project edit, then switch to B through the header without reloading. Verify the route stays open, A's rows, counters, member selection and edit disappear immediately, and B's rows, counters and member options load automatically. Switch back and verify A's values return. Repeat with an empty destination and verify its empty state and counters.
- [ ] 5.3 Manually check Members. In A, open a member edit or assignment and an invitation action where available, then switch to B. Verify the old actions close and the members, counters, assignment choices and pending invitations all belong to B. Open a fresh action and verify it offers only B's identities.
- [ ] 5.4 Manually check manual project creation. On Add Project in A, select an eligible manager, then switch to B. Verify the source mode stays selected, the old manager clears and the dropdown contains B's eligible managers. Submit a disposable test project and inspect its request payload to verify it contains only B's selected manager ID. Remove the test project after checking the result.
- [ ] 5.5 Manually check GitHub import. In A, select an organization and board, start a repository scan and switch to B. Verify import mode stays open, A's selection and scan summary clear, and connection status, organizations, boards and import eligibility reflect B. Try a destination with no GitHub connection and verify its unavailable state prevents submission. Verify the late scan from A cannot restore its board or enable import.
- [ ] 5.6 Manually check Reports. Load a saved report in A, change its configuration and open a preset action, then switch to B. Verify A's tabs, active selection, dirty indicator and action disappear, B's presets load with none selected, and B's report rows remain usable. Repeat with a destination that has no presets. Verify A's preset cannot be overwritten, renamed or deleted from B.
- [ ] 5.7 Manually check delayed and failed requests using browser network throttling and request blocking. On each affected page, switch A → B → A while reads are pending and verify late responses cannot restore a previous visit's data or change the current loading state. Block a destination request and verify the relevant error state keeps source data unavailable. On Members and Reports, fail invitations and preset loading separately and verify the remaining destination content stays usable. Restore the browser network settings afterward.
- [ ] 5.8 Record manual QA results for each scenario with workspace names, expected and actual results, and screenshots or request evidence for any failure. Verify every scenario above has a pass result or a documented blocker before marking manual QA complete.
- [ ] 5.9 Run `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm exec openspec validate fix-workspace-switch-data-refresh --strict`. Record the results with the implementation.
