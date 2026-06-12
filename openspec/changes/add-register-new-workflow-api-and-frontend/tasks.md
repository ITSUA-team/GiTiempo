## 1. Shared Contracts

- [ ] 1.1 Add registration request schema, registration error identifiers, and exported TypeScript types in `packages/shared/src/contracts`.
- [ ] 1.2 Extend the shared token-pair contract usage so registration responses are validated with the existing token-pair response schema.
- [ ] 1.3 Add focused shared-contract tests for valid registration payloads, missing/invalid fields, required owner acknowledgement, unknown-key rejection, and registration error identifiers.
- [ ] 1.4 Export registration contracts through the shared package barrel without exposing low-level transport helpers.

## 2. Backend Registration API

- [ ] 2.1 Add a public throttled `POST /auth/register` endpoint using the shared registration request DTO and existing token-pair response DTO.
- [ ] 2.2 Implement backend registration orchestration that creates the Firebase email/password identity, local user, workspace, owner membership, and normal token pair.
- [ ] 2.3 Wrap local user/workspace/membership writes in one transaction and attempt Firebase identity cleanup if persistence fails after identity creation.
- [ ] 2.4 Map expected failures to stable registration errors: duplicate email, weak password, invalid workspace name, workspace name unavailable, rate limited, and registration service unavailable.
- [ ] 2.5 Extend sensitive-data redaction so registration passwords and session credentials are not logged in request, validation, or provider-failure paths.
- [ ] 2.6 Add backend unit tests for registration success, validation rejection, duplicate email, unavailable workspace name, Firebase failure, persistence failure cleanup, token claims, and redaction.
- [ ] 2.7 Add API e2e coverage for public registration success, expected error responses, rate limiting, and confirmation that `/auth/login` remains membership-gated.
- [ ] 2.8 Export and commit the updated OpenAPI snapshot showing `POST /auth/register`.

## 3. User Web Registration Flow

- [ ] 3.1 Add a typed user-web registration API client using the shared registration request/response contracts and existing frontend request/error conventions.
- [ ] 3.2 Add `/register` route name and route registration as a guest-only standalone page outside the authenticated app shell.
- [ ] 3.3 Implement the register page to match `docs/ui/pages-user.md` and the approved `Register New Workflow` and `Register New Workflow Mobile` `.pen` screens.
- [ ] 3.4 Add form validation for required fields, email format, matching password confirmation, owner acknowledgement, and no API request on invalid local input.
- [ ] 3.5 Wire successful registration to the normal auth session path, refresh-token persistence, current dashboard redirect, and duplicate-submit prevention.
- [ ] 3.6 Map registration API errors inline in the panel and through toast feedback while keeping the user on `/register`.
- [ ] 3.7 Add the secondary outlined `Create workspace` link to the login page below `Continue with Google`, preserving login error scoping.
- [ ] 3.8 Add user-web tests for login link navigation, register default render, validation, successful session redirect, duplicate-submit prevention, existing-account sign-in link, known backend errors, guest/authenticated route behavior, and desktop/mobile DOM branches where applicable.

## 4. Verification

- [ ] 4.1 Run shared package tests for the new registration contracts.
- [ ] 4.2 Run API unit/e2e tests that cover registration and existing auth/login behavior.
- [ ] 4.3 Run `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, and `pnpm --filter user-web test`.
- [ ] 4.4 Run root or affected-package OpenAPI export verification and confirm the committed OpenAPI snapshot matches the backend decorators.
- [ ] 4.5 Perform a final design parity review against the approved login/register `.pen` screens and document any PrimeVue-only compromises.
