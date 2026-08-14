## Why

Members who have a photo on their Google account still see initials everywhere in the product, and nothing in the app can currently show them otherwise. Two independent gaps stack: `apps/user-web` never binds an avatar image at all — the only `:image` binding in the whole app is the GitHub connection card — and the backend accepts the verified Firebase `picture` claim on every login and then drops it, because the login sync writes only `email`, `displayName`, and `updatedAt`. The local `users.avatar_url` column is therefore only ever populated at row creation, so the only avatars visible anywhere today are seeded ones in the admin member list. Fixing either half alone changes nothing a member can see.

## What Changes

- Refresh the local user avatar from the verified Firebase identity on every login and on invite-acceptance sync, instead of writing it only when the local user record is first created.
- Record whether the stored avatar came from the identity provider or was set explicitly by the user, so provider refreshes keep flowing while an explicitly chosen avatar is never overwritten by a later login. This resolves the current conflict between "the photo should update when it changes in Google" and the existing rule that Firebase must not overwrite locally saved profile fields.
- Render the avatar image on the user-web profile account card and on the shared top-bar profile trigger in both `user-web` and `admin-web`, keeping initials as the fallback when no avatar is stored.
- Fall back to initials when a stored avatar URL fails to load, since the PrimeVue `Avatar` component exposes an `image` prop but emits no error event, so a dead provider URL would otherwise render a broken image.
- Keep `PATCH /users/me` as the only way to set a non-provider avatar; this change adds no upload surface and no new endpoint.

Non-goals for this change: uploading an avatar file (needs object storage, size/type limits, and resizing), using the stored GitHub connection avatar as a source, and any change to how the admin member list renders avatars.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `auth`: `Local User Upsert On First Login` currently says the backend *may* refresh mutable profile fields on a returning login. It becomes specific for the avatar: provider-owned avatars are refreshed from the verified identity on every login, and a user-owned avatar is preserved.
- `users`: current-user updates that set an avatar mark it as user-owned, so a later login sync does not replace it; clearing it returns the record to provider-owned.
- `data-model`: the local user record stores which source owns the current avatar.
- `layout`: the top-bar profile trigger renders the member's avatar image when one is stored and initials otherwise, in both shells.
- `user-pages`: the user-web Profile page account card renders the member's avatar image when one is stored and initials otherwise.
- `frontend-shared-leaves`: the shared authenticated header accepts the avatar image as prop-driven input while app shells keep owning auth-store reads.

## Impact

- `apps/api`: login and invite sync paths in `users.service.ts` (`updateFromFirebase`, `upsertFromFirebase`) and the current-user update path (`updateById`); one Drizzle migration adding the avatar-source column to `users`. The existing tests that pin "preserves locally saved profile fields" stay meaningful and must keep passing.
- `packages/web-shared`: the shared auth profile presentation gains the avatar URL, the shared `WorkspaceHeader` gains an optional avatar image input, and a small shared helper owns the image-load fallback used by both render sites.
- `apps/user-web`: profile account card and app shell.
- `apps/admin-web`: app shell only; it already renders member avatars in its own table.
- No change to `packages/shared` contracts — `userResponseSchema` and `updateUserSchema` already carry `avatarUrl`, and the avatar source stays internal to the backend.
- No new dependency. No change to `packages/web-config`.
- Members will not see their photo until their next login, because the sync runs during login. Members whose Firebase user has no `photoURL` at all — the backend creates Firebase users without one — will still see initials until they sign in through a provider that supplies a picture.
