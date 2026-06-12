## Why

GiTiempo now has approved UI/docs for a `/register` workflow that lets a new customer create the first owner account for a new workspace, but the current specs and API still only support invite-based member onboarding. Implementation needs an approved cross-layer contract before the route can be exposed without becoming a disabled placeholder or misusing login/invite endpoints.

## What Changes

- Add a public first-workspace-owner registration flow that creates a workspace, creates or links the owner user, creates the owner membership, and returns the normal API session token pair.
- Keep existing-workspace member onboarding invite-only; registration does not replace invite acceptance for joining an existing workspace.
- Add shared request/response/error contracts and OpenAPI coverage for the registration endpoint.
- Add User SPA `/register` route behavior, login-page `Create workspace` entry point, form validation, submission, success redirect, mapped backend errors, and tests.
- Preserve membership-gated login behavior; `/auth/login` still does not create users or memberships.

## Capabilities

### New Capabilities
- `workspace-registration`: Public first-workspace-owner registration, workspace/user/membership creation behavior, endpoint semantics, and registration error handling.

### Modified Capabilities
- `auth`: Clarify that membership-gated login remains unchanged while registration is the only public owner-creation path that can issue an initial session.
- `frontend-auth`: Add the unauthenticated `/register` route, login entry point, register page behavior, session adoption, redirect, and error-state requirements.
- `contracts`: Add shared registration request and response schemas for backend validation, frontend clients, and OpenAPI export.

## Impact

- Backend: `apps/api` auth/registration controller/service flow, Firebase Admin integration, workspace/user/membership persistence, throttling, error mapping, and OpenAPI export.
- Shared contracts: `packages/shared/src/contracts/*` schemas and exported TypeScript types for registration payloads and responses.
- User SPA: `apps/user-web` route map, login page link, register page/view/composable or client, form validation, session state handoff, and route/view tests.
- Docs/design: existing `docs/ui/pages-user.md`, `docs/TECHNICAL-REQUIREMENTS.md`, `docs/API-ENDPOINTS.md`, and approved `GITiempo.pen` screens are treated as source inputs and must stay aligned.
