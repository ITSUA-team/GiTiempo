## Why

Updated dialog designs and `docs/ui/patterns.md` now rely on PrimeVue Dialog's built-in top-right close control for non-destructive popup dismissal. Existing frontend dialogs still render duplicate footer/body `Cancel` buttons, which creates visual drift from the approved popup designs and conflicts with the documented primary-action-only footer rule.

## What Changes

- Remove secondary `Cancel` footer buttons from non-destructive popup form dialogs and keep only the primary action in those footers.
- Preserve top-right close dismissal and non-destructive mask dismissal where the dialog already allows it.
- Keep mobile popup footers focused on full-width primary action presentation, without adding a stacked secondary `Cancel` action.
- Preserve explicit safe/reject action patterns in destructive confirmation dialogs.
- Preserve non-popup form reset controls such as Profile and Settings `Cancel` buttons.
- Preserve row-level actions such as pending-invite `Cancel invite`.
- Update focused frontend tests or targeted manual checks for opening, closing through dialog dismissal, and saving affected popup dialogs.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `components`: Add the shared frontend requirement that non-destructive PrimeVue popup form dialogs use primary-action-only footers and rely on Dialog dismissal controls.
- `user-projects-list-page`: Align task create/update popup dialog footers with the primary-action-only pattern.
- `user-pages`: Align time-entry create/edit popups and the top-bar timer task-picker popup with the primary-action-only pattern, including mobile footer behavior.
- `admin-pages`: Align the admin create-invoice dialog workflow with the primary-action-only footer pattern.
- `admin-members-page`: Align the Invite Member non-destructive popup dialog with the shared footer pattern while preserving pending-invite row actions and destructive confirmation behavior.

## Impact

- Affected user-web surfaces include `ProjectTaskDialog`, `TimeEntryDialog`, and `TopBarTimerTaskDialog`, plus their tests and any route/composable tests that assert footer button order or labels.
- Affected admin-web surfaces include the create-invoice dialog implementation when present or added, and currently implemented non-destructive popup form dialogs such as `MemberInviteDialog` where they fall under the shared pattern.
- Destructive `ConfirmDialog` flows, non-popup settings/profile reset forms, and row actions remain out of scope except for regression verification that their existing actions remain present.
- No backend API, shared contract, database, dependency, or OpenAPI changes are expected.
