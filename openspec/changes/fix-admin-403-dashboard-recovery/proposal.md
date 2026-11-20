# Restore dashboard navigation from admin 403

## Why

A signed-in member who opens the admin panel reaches the expected 403 page. Clicking `Back to dashboard` then requests the restricted admin dashboard again and leaves the member on the same error page. [Issue #555](https://github.com/ITSUA-team/GiTiempo/issues/555)

## What Changes

- Use the approved `Back to dashboard` label for every role on the admin 403 page.
- Open the configured user dashboard for members and the admin dashboard for admins and project managers.
- Cover the member's click and destination in a regression test. Existing coverage checks the label for members and exercises the primary click for admins.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-pages` specifies the primary action's label and destination for each workspace role.

## Impact

The change affects frontend navigation in `apps/admin-web` and its tests. It uses the existing dashboard access rules, user-app URL configuration and session behavior. It requires no API or authentication contract changes.
