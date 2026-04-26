## 1. Data Model And Seed Foundation

- [ ] 1.1 Add Drizzle schemas for `workspaces`, `workspace_settings`, `workspace_members`, and `invites` under feature-owned schema files in `apps/api/src/`
- [ ] 1.2 Re-export the new tables from `apps/api/src/db/schema.ts` and update any DB types that depend on the schema barrel
- [ ] 1.3 Generate and review the SQL migration for the new workspace, membership, and invite tables
- [ ] 1.4 Update `apps/api/src/db/seed.ts` to create the default workspace, workspace settings, seeded admin membership, and practical dev seed data needed for critical flows

## 2. Shared Contracts And DTO Surface

- [ ] 2.1 Add shared Zod contracts for workspaces and workspace settings in `packages/shared/src/contracts/`
- [ ] 2.2 Add shared Zod contracts for workspace members and role updates in `packages/shared/src/contracts/`
- [ ] 2.3 Add shared Zod contracts for invite list/create/accept/cancel flows in `packages/shared/src/contracts/`
- [ ] 2.4 Expand the shared current-user contract to include workspace role and re-export all new contracts from `packages/shared/src/index.ts`
- [ ] 2.5 Add or update API DTO wrappers in `apps/api/src/` so new endpoints and modified `/users/me` use the shared contracts

## 3. Membership Context And Authorization

- [ ] 3.1 Create `MembersModule` service-layer support for resolving a user's active workspace membership and role
- [ ] 3.2 Add role-aware request-context and guard/decorator support for admin-only workspace, member, and invite routes
- [ ] 3.3 Implement last-admin protection in the membership domain so demotion or removal cannot leave the workspace without an admin

## 4. Auth And Current-User Integration

- [ ] 4.1 Extend auth payload types, token signing, and token verification to include `workspaceId` and `role`
- [ ] 4.2 Change `POST /auth/login` so it succeeds only for users with active workspace membership and returns `401` otherwise
- [ ] 4.3 Change `POST /auth/refresh` so it rejects sessions whose user no longer has active workspace membership
- [ ] 4.4 Update `UsersService` and `/users/me` so the current-user response includes workspace role without exposing internal auth identifiers

## 5. Workspace Endpoints

- [ ] 5.1 Create `WorkspacesModule` with services/controllers for reading the current workspace and updating mutable workspace identity fields
- [ ] 5.2 Implement admin-only workspace-settings read/update behavior in `WorkspacesModule`
- [ ] 5.3 Add Swagger and serializer wiring for `/workspace` and `/workspace/settings` endpoints

## 6. Member Administration Endpoints

- [ ] 6.1 Implement `GET /members` to return workspace members with their roles and public identity fields
- [ ] 6.2 Implement `PATCH /members/:id/role` with validation and last-admin protection
- [ ] 6.3 Implement `DELETE /members/:id` with validation, authorization, and last-admin protection

## 7. Invite Lifecycle And Delivery

- [ ] 7.1 Create `InvitesModule` with persistence and service logic for listing, creating, canceling, and accepting invites
- [ ] 7.2 Implement strict invite acceptance rules: valid token, matching Firebase email, membership creation, invite status transition, and `204` response
- [ ] 7.3 Add invite-delivery infrastructure with SMTP transport and the `INVITES_EMAIL_CONSOLE_FALLBACK` runtime flag for console fallback
- [ ] 7.4 Update `apps/api/src/config/env.validation.ts` and `apps/api/.env.example` for SMTP delivery and console-fallback configuration

## 8. Critical Tests And Verification

- [ ] 8.1 Add focused unit tests for the dense membership and invite rules: strict email match, membership creation, and last-admin protection
- [ ] 8.2 Add e2e coverage for membership-gated login and refresh behavior, including unauthorized access when membership is missing
- [ ] 8.3 Add e2e coverage for workspace admin routes, member administration, and invite lifecycle including `POST /invites/accept`
- [ ] 8.4 Run backend verification for `apps/api` (`lint`, `typecheck`, `test`, relevant `test:e2e`) and refresh shared API artifacts if the repo's OpenAPI export path is available
