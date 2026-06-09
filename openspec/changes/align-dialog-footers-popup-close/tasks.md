## 1. Source Review And Audit

- [ ] 1.1 Re-read `docs/ui/INDEX.md`, `docs/ui/patterns.md`, `apps/user-web/AGENTS.md`, and `apps/admin-web/AGENTS.md` before frontend edits.
- [ ] 1.2 Open `GITiempo.pen` in the Pencil editor and inspect the affected popup frames for task create/update, time-entry create/edit, admin create-invoice, and top-bar timer task-picker parity.
- [ ] 1.3 Audit current PrimeVue popup dialogs in `apps/user-web` and `apps/admin-web` for footer/body `Cancel` buttons, and classify each as in-scope non-destructive popup, destructive confirmation, non-popup reset form, or row action.

## 2. User-Web Dialog Updates

- [ ] 2.1 Update `ProjectTaskDialog` so task create/update popup footers render only the primary `Create task` or `Save changes` action while preserving close-control and mask dismissal when not saving.
- [ ] 2.2 Update `TimeEntryDialog` so create/edit popup footers render only the primary save action while preserving close-control and mask dismissal behavior.
- [ ] 2.3 Update `TopBarTimerTaskDialog` so desktop and mobile footers remove the `Cancel` dismissal button, keep the state-appropriate primary action, and preserve the running-timer `Change task` domain action where applicable.
- [ ] 2.4 Ensure user-web dialog save/loading/disabled states and request-error retry behavior are unchanged after footer updates.

## 3. Admin-Web Dialog Updates

- [ ] 3.1 Audit `InvoicesView` and any create-invoice dialog implementation on the current branch; if the dialog exists, make its footer primary-action-only with `Save Invoice`, otherwise document that the route remains scaffolded and no invoice code change is needed.
- [ ] 3.2 Update `MemberInviteDialog` if still a non-destructive popup form so its footer/body renders only `Send Invite` and Dialog close/mask dismissal replaces the old footer `Cancel` path.
- [ ] 3.3 Preserve invite form reset/cleanup behavior when `MemberInviteDialog` is dismissed through the built-in Dialog close control or mask.
- [ ] 3.4 Confirm destructive admin confirmation dialogs, Settings form `Cancel`, inline member/project form `Cancel`, and pending-invite `Cancel invite` row actions remain present.

## 4. Tests And Manual Checks

- [ ] 4.1 Update `ProjectTaskDialog` tests to cover create/update primary actions, absence of footer `Cancel`, close dismissal, and save emission.
- [ ] 4.2 Update `TimeEntryDialog` tests to cover create/edit primary actions, absence of footer `Cancel`, close dismissal, and save emission.
- [ ] 4.3 Update `TopBarTimerTaskDialog` tests for desktop and mobile footer behavior, including no dismissal `Cancel`, full-width mobile primary action, retained running `Change task`, close dismissal, and primary action emission.
- [ ] 4.4 Update admin dialog tests for any changed admin popup, including `MemberInviteDialog` close/reset behavior, absence of popup `Cancel`, and submit behavior.
- [ ] 4.5 Add or update regression checks that excluded actions remain: destructive confirmation safe/reject actions, non-popup Profile/Settings reset `Cancel` actions, and pending-invite `Cancel invite` row actions.

## 5. Verification

- [ ] 5.1 Run `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, and `pnpm --filter user-web test`.
- [ ] 5.2 Run `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test` if any admin-web implementation or test files changed.
- [ ] 5.3 Perform targeted browser/manual checks for opening, dismissing via top-right close or allowed mask, and saving each affected popup; include mobile footer checks for the timer task-picker.
- [ ] 5.4 Complete a final design parity review against `GITiempo.pen` and `docs/ui/patterns.md`, and document any PrimeVue-only compromise explicitly.
