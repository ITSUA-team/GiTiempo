# Design

## Context

The API and `adminMembersClient.updateMemberRole` already accept a membership ID and a role. The Members view currently connects the inline form to assignment and invoice-permission actions only. Its row model uses the same `canManage` flag for opening settings and showing Remove. The page derives workspace scope from the access token while the router also reads the current profile.

## Goals and boundaries

Keep one Member settings panel and the existing name entry point in both layouts. Apply role changes to the selected membership. Preserve the existing assignment, invoice-permission and removal contracts. This change needs no new roles, database migration or cross-app sign-in mechanism.

## Decisions

### Admin-web

Follow `apps/admin-web/AGENTS.md`. Give opening settings and removing another member independent eligibility checks in `useMembersTableState`, the desktop and mobile renderers, and the action handlers. Pass the membership ID to the role client. Use the user ID only to identify the current account or an existing project assignment.

In `MemberEditForm.vue`, show identity followed by a labelled role selector and the shared footer **Save changes** action. Save a changed role first, then apply edited assignments when the destination role supports them. If assignment writes fail after the role is saved, refresh from the server so a retry can pick up the remaining assignments. Selecting Admin shows all-project access and omits assignment edits. Derive invoice controls from the saved membership. On a rejected save, keep the panel open and surface the server error. Apply the returned membership and the confirmed assignment changes to the affected data. Collapse the editor after all requested writes succeed. For a successful invoice-permission update, apply the returned membership while keeping the editor open.

Delegate the request to the Members page or its focused composable. Follow the existing account, workspace and visit checks so a late completion cannot update a different workspace or session.

### Authorization after self-demotion

As soon as the self-update succeeds, suppress admin-only content and clear cached privileged data before another admin read. Renew the current session using the existing refresh flow, reconcile profile and memberships, and verify the account, workspace and effective role. A profile-only refresh can leave the token-derived page scope stale. For this same-workspace change, use the existing standalone `/403` destination for a newly disallowed route. The PM or Member sees the existing role-appropriate recovery links. If renewal fails after the write, retain the restricted state and offer the existing session recovery flow. Retry session synchronization independently of the committed mutation.

### API

Follow `apps/api/AGENTS.md`. Reuse the admin guard, workspace-scoped target lookup and transactional last-admin protection in `MembersService`. Verify role-sensitive operations authorize against current membership after a committed change, including with a previously issued token. Correct any authorization or serialization gaps at the existing boundary. The self-edit control does not add a self-removal action.

### Documentation and design

Update the Members section of `docs/ui/pages-admin.md` and the corresponding Member settings frame in `GITiempo.pen` during implementation. Include the role editor and saved-role variants. Compare the resulting panel with the frame on desktop and mobile.

## Risks and trade-offs

- A concurrent demotion or removal can change who the last admin is. Keep the database transaction authoritative and verify concurrent requests against PostgreSQL.
- A successful self-demotion requires session renewal and navigation to prevent further admin-only operations.
- Losing a response can leave the write outcome unknown. Reconcile the current membership before enabling admin actions again or offering to resend a self-role change.
