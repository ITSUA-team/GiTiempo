## 1. Data And State

- [ ] 1.1 Add app-local user-web HTTP helpers for visible projects, project tasks, current timer, timer start/stop, and manual time-entry creation using existing shared contract types.
- [ ] 1.2 Add page-local loading, error, selected project, selected task, current timer, and manual interval state in `TimerView.vue`.
- [ ] 1.3 Implement elapsed timer formatting from `current.timeEntry.startedAt` using `HH:MM:SS` and update it while a timer is running.

## 2. Timer Page UI

- [ ] 2.1 Replace the placeholder `TimerView.vue` content with the approved header and two-column desktop / stacked mobile layout from `GITiempo.pen`.
- [ ] 2.2 Implement PrimeVue `Select` controls for `Project -> Task`, including disabled and loading states for downstream task loading.
- [ ] 2.3 Implement the running timer card with centered elapsed time, current project/task summary, and a single large CTA labeled `Start` when idle and `Stop` when running.
- [ ] 2.4 Implement the manual interval panel below timer actions with PrimeVue date/time controls and add-entry action.
- [ ] 2.5 Add empty/error UI states for no visible projects, no tasks in selected project, and failed API actions using existing token-backed styling.

## 3. Behavior

- [ ] 3.1 Load visible projects and current timer when the page mounts.
- [ ] 3.2 Load tasks when the selected project changes and clear invalid selected task state.
- [ ] 3.3 Start a timer for the selected task when idle and refresh current timer state after success.
- [ ] 3.4 Stop the running timer when active and refresh current timer state after success.
- [ ] 3.5 Validate and submit manual interval entries for the selected task, then reset manual interval inputs after success.

## 4. Verification

- [ ] 4.1 Add focused tests for timer page helper logic or component behavior where practical.
- [ ] 4.2 Run `pnpm --filter user-web lint`.
- [ ] 4.3 Run `pnpm --filter user-web typecheck`.
