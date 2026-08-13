## 1. Persist avatar ownership

- [x] 1.1 Add an `avatar_source` column to the `users` schema with values `provider` and `user`, defaulting to `provider`, and generate the Drizzle migration
- [x] 1.2 Confirm the new column stays out of `userRowSelection` consumers that feed the public contract, so `packages/shared` needs no change
- [x] 1.3 Add focused tests asserting that a record created before the column existed reads as provider-owned

## 2. Identity synchronisation rules

- [x] 2.1 Add regression tests locking the existing `preserves locally saved profile fields` behaviour for both `updateFromFirebase` and `upsertFromFirebase` before changing either
- [x] 2.2 Refresh a provider-owned avatar from the verified identity picture in `updateFromFirebase`, leaving `displayName` merge behaviour untouched
- [x] 2.3 Apply the same rule to the `upsertFromFirebase` conflict branch so invite acceptance behaves identically
- [x] 2.4 Leave the stored avatar untouched when the verified identity supplies no picture, so a GitHub or email sign-in cannot clear a Google photo
- [x] 2.5 Never replace a user-owned avatar from either sync path
- [x] 2.6 Add unit tests for each sync outcome: fill when empty, refresh when changed, preserve when user-owned, preserve when no picture claim

## 3. Current-user update ownership

- [x] 3.1 Mark the avatar as user-owned when `PATCH /users/me` sets a non-null `avatarUrl`
- [x] 3.2 Return ownership to the provider when `PATCH /users/me` sets `avatarUrl` to null, so the next login refills it
- [x] 3.3 Leave both the avatar and its ownership untouched when the payload omits `avatarUrl`
- [x] 3.4 Add unit tests for the three update paths above
- [x] 3.5 Add an API e2e case proving a login sync after an explicit avatar update does not replace it

## 4. Shared frontend leaves

- [x] 4.1 Expose the current user's avatar URL from the shared auth profile presentation used by both SPAs
- [x] 4.2 Add a shared browser helper that owns the avatar image-load fallback, resetting when the URL changes, and export it from the package barrel
- [x] 4.3 Add an optional avatar image input to the shared `WorkspaceHeader` and render it in the profile trigger with initials as the fallback
- [x] 4.4 Keep the shared header free of auth-store reads and current-user clients for the new input
- [x] 4.5 Add focused tests for the helper and for the header rendering image, initials, and post-failure initials

## 5. Application surfaces

- [ ] 5.1 Inspect the approved `.pen` Profile and top-bar screens and record a parity checklist for the circular crop, sizing, and open-state trigger border before editing components
- [x] 5.2 Pass the avatar from the `user-web` shell into the shared header
- [x] 5.3 Pass the avatar from the `admin-web` shell into the shared header
- [x] 5.4 Render the avatar on the `user-web` Profile account card with the initials fallback, keeping the GitHub connection card unchanged
- [x] 5.5 Add component tests covering avatar, initials, and image-failure states on the Profile account card
- [x] 5.6 Verify a non-square source image is cropped to the circle without distortion at both render sites

## 6. Documentation and verification

- [x] 6.1 Update `docs/ui/pages-user.md` with the Profile account card avatar behaviour and its fallback rules
- [x] 6.2 Note in `docs/API-ENDPOINTS.md` that setting an avatar through the current-user endpoint stops identity synchronisation from replacing it
- [x] 6.3 Run `pnpm --filter @gitiempo/api lint`, `typecheck`, and `test`
- [x] 6.4 Run lint, typecheck, and test for `@gitiempo/web-shared`, `user-web`, and `admin-web`, since this change touches a shared auth leaf and the shared header
- [ ] 6.5 Complete the design parity review against the `.pen` checklist from 5.1 and document any PrimeVue-only compromise
- [x] 6.6 Confirm no new lint warnings were introduced in the touched Vue files
- [x] 6.7 Call out in the rollout note that members see their photo only after their next login, and that members whose Firebase user has no picture remain on initials
