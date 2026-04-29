## 1. Shared Contracts And DTO Surface

- [x] 1.1 Add shared project contracts for response, create input, update input, and project status/active-state validation in `packages/shared/src/contracts/`
- [x] 1.2 Add shared project assignment contracts for assignment response, list response, and create-assignment input
- [x] 1.3 Add shared task contracts for response, create input, update input, and task status validation
- [x] 1.4 Export the new contracts from `packages/shared/src/index.ts`
- [x] 1.5 Add NestJS DTO wrappers in `apps/api/src/projects/dto/` and `apps/api/src/tasks/dto/` using `createZodDto`

## 2. Database Schema And Migration

- [x] 2.1 Add Drizzle schemas for `projects` and `project_assignments` under feature-owned project schema files
- [x] 2.2 Add Drizzle schema for `project_external_refs` with provider/external type/key/id indexes
- [x] 2.3 Add Drizzle schemas for `tasks` and `task_external_refs` under feature-owned task schema files
- [x] 2.4 Re-export all new schemas from `apps/api/src/db/schema.ts` so DB types and Drizzle config include them
- [x] 2.5 Generate and review the SQL migration for project, assignment, task, and external ref tables without applying it to a database

## 3. Project Authorization And Services

- [x] 3.1 Add reusable role-check support for admin-only and admin-or-PM backend routes using current database membership, not stale JWT role claims
- [x] 3.2 Add project visibility query/service support where admins have implicit access and `pm`/`member` users require assignment to an active project
- [x] 3.3 Implement project list behavior for admin and non-admin visibility policies
- [x] 3.4 Implement project creation with PM creator auto-assignment in a single transaction
- [x] 3.5 Implement project read and update behavior with admin-any, PM-assigned, and member-forbidden policies
- [x] 3.6 Implement admin-only project assignment list, create, and delete behavior with target role validation for `pm` and `member`

## 4. Project API Module

- [x] 4.1 Create `ProjectsModule` and wire it into `AppModule`
- [x] 4.2 Add `ProjectsController` routes for `GET /projects`, `POST /projects`, `GET /projects/:id`, and `PATCH /projects/:id`
- [x] 4.3 Add project assignment routes for `GET /projects/:id/assignments`, `POST /projects/:id/assignments`, and `DELETE /projects/:id/assignments/:userId`
- [x] 4.4 Add Swagger decorators and Zod serializers for all project and assignment routes

## 5. Task Services And API Module

- [x] 5.1 Add task service support for listing tasks by visible project
- [x] 5.2 Add task creation behavior for any active workspace member with visibility to an active project
- [x] 5.3 Add task read and update behavior for any active workspace member with visibility to the task's project
- [x] 5.4 Create `TasksModule` and wire it into `AppModule`
- [x] 5.5 Add task routes for `GET /projects/:id/tasks`, `POST /projects/:id/tasks`, `GET /tasks/:id`, and `PATCH /tasks/:id`
- [x] 5.6 Add Swagger decorators and Zod serializers for all task routes

## 6. Seed Data

- [x] 6.1 Update `apps/api/src/db/seed.ts` to seed deterministic active projects in the default workspace
- [x] 6.2 Seed project assignments for the existing seeded PM/member users so visibility policies can be exercised locally
- [x] 6.3 Seed deterministic tasks under seeded projects without provider-specific external refs
- [x] 6.4 Keep the seed idempotent across repeated local runs

## 7. Unit And E2E Coverage

- [x] 7.1 Add focused unit tests for project visibility and role-policy helpers
- [x] 7.2 Add service tests for PM project creation auto-assignment and assignment target validation
- [x] 7.3 Add service tests for task create/read/update visibility rules
- [x] 7.4 Add e2e coverage for admin project list/read/update and assignment management
- [x] 7.5 Add e2e coverage for PM assigned-project behavior, PM project creation, and PM denial on unassigned projects
- [x] 7.6 Add e2e coverage for member assigned-project visibility, task create/update behavior, and forbidden project mutation

## 8. Verification And API Artifacts

- [x] 8.1 Run `pnpm --filter @gitiempo/shared build` if direct API commands need the built shared package
- [x] 8.2 Run `pnpm --filter @gitiempo/api lint`
- [x] 8.3 Run `pnpm --filter @gitiempo/api typecheck`
- [x] 8.4 Run `pnpm --filter @gitiempo/api test`
- [x] 8.5 Run relevant API e2e tests after applying migrations and seed to the local test database
- [x] 8.6 Refresh `packages/shared/openapi.json` with the build-based `pnpm --filter @gitiempo/api openapi:export` workflow
