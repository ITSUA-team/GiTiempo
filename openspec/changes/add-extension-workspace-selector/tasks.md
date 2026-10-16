## 1. API/shared contract reuse and extension session

- [x] 1.1 Add extension membership-list and switch API methods using existing shared schemas; test valid responses and rejected/invalid sessions without changing backend contracts.
- [x] 1.2 Serialize refresh and workspace-switch rotations, atomically persist accepted pairs, and guard against sign-out/new-login overwrites; best-effort revoke late switch pairs after sign-out and test cleanup failure, overlapping operations and uncertain network outcomes.
- [x] 1.3 Test current-workspace no-op, removed target membership, single membership, popup reopen and worker-restart session reconstruction.

## 2. Extension background and tracking surfaces

- [x] 2.1 Add typed membership/switch messages and background-owned state; expose progress/errors without exposing tokens to popup/content-script consumers.
- [x] 2.2 Order timer mutations against switching, invalidate prior snapshots/preflight and reject stale actions before dispatch; add race tests for switch versus Start/Stop.
- [x] 2.3 Refresh timer/capability/destination after switching and notify popup plus existing issue/Projects controls in all tabs; test stale responses and target-workspace denial.
- [x] 2.4 Preserve the global running timer and conditional Stop across workspace switches; test A → B while running, Stop, then new Start in B.

## 3. Extension account dropdown

- [x] 3.1 Implement the Workspace label and selector above Open profile using the approved `.pen` menu and extension tokens.
- [x] 3.2 Implement loading, one-membership disabled state, load retry, pending switch and switch errors; keep profile/sign-out available.
- [x] 3.3 Preserve selection, focus and menu visibility across timer ticks; verify keyboard selection, Escape, outside dismissal and accessible feedback in focused UI tests.

## 4. Documentation

- [x] 4.1 Update `docs/ui/chrome-ext.md`: replace the two-actions-only/no-switcher restriction and document selector placement, states, dismissal, persistence and timer behavior.
- [x] 4.2 Update `docs/TECHNICAL-REQUIREMENTS.md` with extension-local selection, independence from web-app sessions and global-timer semantics; verify `docs/API-ENDPOINTS.md` and correct any actual gaps.
- [x] 4.3 Add `qa.md` for this change with environment/build, command results, design comparison evidence, manual case outcomes and remaining blockers/deltas; keep historical change artifacts unchanged.

## 5. Automated verification

- [x] 5.1 Run `pnpm --filter chrome-ext typecheck`, `pnpm --filter chrome-ext test` and `pnpm --filter chrome-ext build`; record results in `qa.md`.
- [x] 5.2 Run `pnpm typecheck`, `pnpm lint` and `pnpm test`; run relevant API/e2e checks if API or integration code is touched, and record results or pre-existing failures precisely.
- [x] 5.3 Review the implementation against every delta-spec scenario and run `pnpm exec openspec validate add-extension-workspace-selector --strict`.

## 6. Design parity and manual acceptance

Execute the manual matrix in both supported browsers, Chrome and Firefox, recording per-browser results and background-lifecycle differences.

- [x] 6.1 Compare built popup screenshots at 320 × 480 against `GITiempo.pen` running frame `cvEiV` and no-display-name frame `V6FKLq` through Pencil; check selector placement, spacing, type, colors, identity/timer variants and overflow. Fix unintended deltas and record screenshots/results.
  - Chrome and Firefox static comparisons plus workspace-row/destructive-token design reconciliation are complete; updated `.pen` exports, actual Firefox RDP screenshots, geometry and independent review are recorded in `qa.md`. Native options and keyboard/focus/dismissal acceptance are recorded under the completed 6.2 / M04.
- [x] 6.2 Run manual cases M01–M04 in `manual-test.md`: membership states, workspace selection, destination and refresh/reopen/restart persistence.
  - On 2026-10-16 the user explicitly confirmed task 6.2 is verified. This closes the remaining M04 manual acceptance; second-Escape host popup closure is accepted as non-critical. See `qa.md` for the distinction between agent evidence and user confirmation.
- [x] 6.3 Run manual cases M05–M07: global timer survival/Stop, direct issue and Projects controls, multiple tabs and web-app session independence.
  - On 2026-10-16 the user explicitly confirmed task 6.3 is verified, closing the remaining Projects-pane M06 acceptance. See `qa.md` and the recorded user confirmation.
- [x] 6.4 Run manual cases M08–M12: loading/retry, network/auth/membership failure, rotation races, sign-out/new login, mutation ordering and post-switch capability denial. Record evidence and any blocked case explicitly.
- [x] 6.5 Complete final parity/documentation/manual-QA review and resolve acceptance failures before marking the change implemented.
  - Final independent popup/design and runtime reviews passed on 2026-10-16 after fixing a cross-login refresh coalescing race and adding its regression. Root typecheck/lint/test, Chrome/Firefox builds, strict OpenSpec validation and evidence checks passed; see `qa.md`. All 21 tasks are complete. Synchronization and archiving remain assigned to the user.
