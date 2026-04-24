## Context

`apps/admin-web/src/main.ts` currently creates Vue Router with `routes: []`, and `App.vue` still renders a bootstrap placeholder rather than a routed application shell. At the same time, the project docs already define the intended admin surface area in `docs/ui/pages-admin.md` and the shared shell expectations in `openspec/specs/layout/spec.md`.

Issue `#48` is specifically about removing route ambiguity before page implementation continues. The nearest app instructions in `apps/admin-web/AGENTS.md` also require admin-web to stay aligned with user-web on auth direction: Firebase Auth on the frontend, backend token exchange, refresh-token bootstrap, and logout cleanup. That means the route map should be designed around authenticated shell entry from the start rather than as a public-only route list.

This change is frontend-only and route-structure focused. It does not implement the admin pages themselves, but it should define a stable map for dashboard, reports, invoices, members, projects, and settings so later admin work lands against known route contracts.

## Goals / Non-Goals

**Goals:**

- Define the admin-web route inventory based on the documented admin page set.
- Define how protected admin pages mount through the shared application shell pattern.
- Define guest-only versus authenticated route entry behavior so future auth/bootstrap work has a stable route target.
- Keep admin-web aligned with the same frontend auth direction as user-web.

**Non-Goals:**

- Building the full page content for dashboard, reports, invoices, members, projects, or settings.
- Changing backend auth semantics, contracts, or role rules.
- Designing a separate admin-only auth model that diverges from user-web.
- Introducing browser-level auth tests or non-routing feature work in this change.

## Decisions

### D1. Introduce a dedicated admin-routing capability

- Model the route-map behavior in a new `admin-routing` spec instead of overloading `admin-pages`.
- **Why:** `admin-pages` already defines what each screen must do, while this issue is about how those screens are entered and mounted.
- **Alternatives considered:** modifying `admin-pages` only (rejected because route inventory and auth-aware entry are a different concern than page behavior).

### D2. Mirror the user-web route architecture pattern where practical

- The admin route map should use the same high-level pattern as user-web: a guest entry route for login and a protected shell route with child page routes.
- **Why:** project docs and app instructions already require the same auth direction across both SPAs, and using one routing shape reduces future divergence.
- **Alternatives considered:** keeping admin-web as a flat route list until auth is implemented (rejected because it would force later route reshaping and make guard behavior ambiguous).

### D3. Keep route definitions ahead of page implementation

- Define route names, paths, and protected-route ownership now, even if some routes still mount placeholders initially.
- **Why:** this unblocks future page work and avoids multiple changes competing to define the same route structure later.
- **Alternatives considered:** waiting for each page issue to define its own route incrementally (rejected because it increases the chance of inconsistent paths and shell behavior).

## Risks / Trade-offs

- **[Risk] Route names or paths may need revision once admin auth/bootstrap work is implemented.** → Mitigation: keep the route inventory aligned with user-web patterns and document the auth-aware entry assumptions explicitly in the spec.
- **[Risk] Defining the shell-first route structure before real pages exist can feel abstract.** → Mitigation: keep the spec centered on concrete page paths from `docs/ui/pages-admin.md` and the existing shared layout requirements.
- **[Trade-off] This change defines navigation structure, not completed screens.** Accepted because issue `#48` is about removing route ambiguity, not delivering the full admin experience.
