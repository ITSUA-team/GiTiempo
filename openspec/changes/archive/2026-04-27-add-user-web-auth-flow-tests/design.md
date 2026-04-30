## Context

`apps/user-web` already has a working auth store, login view, and router guard flow from the earlier `user-web-auth-routes` change. The current coverage is limited to refresh-based bootstrap restoration, invalid refresh fallback, one successful email/password login path, logout cleanup when API logout fails, and the main guest/authenticated redirect rules.

Project docs confirm the intended frontend auth model: `docs/TECHNICAL-REQUIREMENTS.md` defines Firebase Auth on the frontend, backend token exchange, access-token-in-memory storage, refresh-token persistence, and refresh-based restoration. `docs/ui/INDEX.md` and `docs/ui/pages-user.md` establish the user-web surface area and confirm that the login and profile flows are part of the supported user experience. `apps/user-web/AGENTS.md` also notes that `vitest` exists today, but current frontend verification is mostly lint/typecheck and existing tests should be treated as focused coverage rather than full end-to-end proof.

This change is frontend-only. It formalizes the expected user-web auth journey in a new OpenSpec capability and deepens the existing focused Vitest coverage without introducing a browser automation stack.

## Goals / Non-Goals

**Goals:**

- Capture the expected user-web auth journey in a dedicated `frontend-auth` spec.
- Extend the existing focused `vitest` coverage for the auth store and router so the main auth states are explicitly verified.
- Cover both successful and failing login paths, refresh-based session restoration, guest/authenticated redirect behavior, and logout cleanup.
- Document any remaining gaps that still require future browser-level e2e coverage.

**Non-Goals:**

- Introducing Playwright, Cypress, or another new browser-test dependency in this change.
- Changing backend auth semantics, shared contracts, or Firebase/Auth API payloads.
- Reworking the login UI or route structure beyond what is needed to support focused tests.
- Adding admin-web auth-flow coverage; this change is scoped to `apps/user-web` only.

## Decisions

### D1. Build on the existing focused Vitest layer

- Extend `apps/user-web/src/stores/auth.spec.ts` and `apps/user-web/src/router/index.spec.ts` instead of adding a new testing framework.
- **Why:** the repo already has this path in place, the current auth logic is organized around store and router boundaries, and issue `#81` is about filling meaningful coverage gaps quickly.
- **Alternatives considered:** browser-level Playwright flow tests now (rejected for this change because there is no existing browser test stack in `user-web` and the setup cost would dominate the actual auth assertions); component-mount tests for `LoginView` (deferred unless a gap cannot be expressed cleanly through store/router-focused coverage).

### D2. Treat auth-runtime boundaries as the seam for deterministic tests

- Continue mocking the injected auth runtime rather than reaching real Firebase or backend endpoints in tests.
- **Why:** this keeps tests deterministic, fast, and aligned with the current architecture where auth side effects are funneled through `auth-runtime`.
- **Alternatives considered:** mocking lower-level network calls directly (rejected because it couples tests to implementation details instead of the store/runtime contract); live backend integration (rejected because it moves this change toward end-to-end testing).

### D3. Explicitly cover both success and failure transitions

- Add missing assertions around failed login attempts, post-bootstrap guest state, preserved redirect handling, and logout returning the app to guest behavior.
- **Why:** these are the transitions most likely to regress as more authenticated pages and shell behaviors are added.
- **Alternatives considered:** only verifying happy paths (rejected because current coverage already does that in part and the issue exists specifically to reduce regressions around state transitions).

### D4. Record future e2e gaps in the change artifacts

- Keep this change focused on targeted Vitest coverage and document what still belongs in a later browser-level test effort.
- **Why:** it prevents this proposal from overpromising full auth end-to-end confidence while still creating a clear handoff for later work.
- **Alternatives considered:** leaving remaining gaps implicit (rejected because the repo already has issue `#64` for current test-coverage limitations and this change should improve that clarity, not hide it).

## Risks / Trade-offs

- **[Risk] Focused store/router tests can miss real browser integration issues.** → Mitigation: document the remaining browser-level gaps explicitly and keep future Playwright-style work available as a follow-up.
- **[Risk] Tests become too coupled to internal store implementation details.** → Mitigation: keep assertions at the public store and router behavior level and continue using `auth-runtime` as the mocking seam.
- **[Risk] The `node` Vitest environment limits view-level assertions.** → Mitigation: prioritize store and router coverage in this change and only expand to component-level mounting if an auth behavior cannot be verified otherwise.
- **[Trade-off] This change improves confidence, not full end-to-end proof.** Accepted because it matches the current repo tooling and the immediate need is regression protection around the existing auth journey.

## Remaining Browser E2E Gaps

- The current focused coverage does not exercise the rendered `LoginView` form, inline validation messaging, or button disabled states through a browser DOM.
- The current focused coverage does not verify the real Firebase popup flow, identity-provider redirects, or browser storage behavior across full page reloads.
- The current focused coverage does not prove post-login navigation from the actual login screen into the authenticated shell, only the store and router transitions that underpin it.
- A follow-up browser-level test change should cover the visible login/logout journey end to end once the repo adopts a dedicated browser automation stack for `user-web`.
