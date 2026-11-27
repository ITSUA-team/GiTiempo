# Design

## Context

The approved Admin 403 Forbidden frame and `docs/ui/pages-admin.md` use the same primary label for every role. The current `admin-pages` spec prohibits that label for members. The delta resolves the conflict and specifies the destination of a click.

## Goals / Non-Goals

Dashboard recovery uses the signed-in user's role in the active workspace. Selecting another membership is a separate action governed by the existing `layout` spec.

## Decisions

### Admin web

Follow `apps/admin-web/AGENTS.md`. In `src/views/ForbiddenView.vue`, reuse the destination decision that already runs after a successful workspace switch. Evaluate the current profile against the dashboard route's allowed roles at the time of navigation. This keeps the button consistent with the router if the role policy changes.

For an allowed role, use the named admin dashboard route. For a member, use the existing external-navigation function with the user-app root derived from `VITE_USER_APP_URL`. The configured URL can end in `/login`, so using it verbatim could open the wrong page. Keep the membership-switch call and its reload/error handling in the secondary action's handler.

## Risks / Trade-offs

A test that checks only the member's button label passes even when the click returns to 403. Exercise the click with the actual admin router and assert the cross-app destination. Then verify the complete round trip with a signed-in member and configured user and admin apps.
