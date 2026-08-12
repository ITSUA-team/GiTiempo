## Context

`users.avatar_url` already exists and is already exposed through `userResponseSchema`, so no contract work is required. What is missing is a writer that keeps it current and a reader that renders it.

On the write side, `auth.service.ts` passes `avatarUrl: decoded.picture ?? null` into `UsersService.updateFromFirebase` on every login, and `invites.service.ts` passes the same value into `upsertFromFirebase`. Both destinations ignore it: the login `.set(...)` writes only `email`, `displayName`, and `updatedAt`, and the `onConflictDoUpdate` branch does the same. Only the `INSERT` branch persists an avatar, so the column is written once at row creation and never again.

On the read side, `apps/user-web` never binds an avatar image. `ProfileView.vue` and the shared `WorkspaceHeader.vue` both pass initials only; the single `:image` binding in the app belongs to the GitHub connection card, which renders `github_connections.avatar_url` — a different column for a different purpose. `apps/admin-web` is the one place that renders `users.avatar_url`, in its member table, which is why seeded members appear with photos and everyone else does not.

Two constraints shape the design. First, `openspec/specs/auth/spec.md` allows a returning login to refresh mutable profile fields, while `UsersService` carries an explicit, tested rule that Firebase must not overwrite locally saved profile values — `displayName` is merged with `COALESCE(users.display_name, <incoming>)` and two unit tests pin "preserves locally saved profile fields" for both sync paths. Second, the product requirement from the originating discussion is that a photo changed in Google should propagate. Those two pull in opposite directions and the design has to reconcile them rather than pick one silently.

## Goals / Non-Goals

**Goals:**

- Make a member's Google photo appear in the product without any manual step.
- Keep the photo current when it changes at the identity provider.
- Never overwrite an avatar the member set deliberately.
- Never clear a stored avatar because a particular sign-in carried no picture.
- Render the same avatar in the user-web profile card and in the top bar of both shells, with initials as the fallback.

**Non-Goals:**

- Uploading an avatar file. That needs object storage, size and MIME limits, and resizing, and is a separate change.
- Using `github_connections.avatar_url` as an avatar source.
- New endpoints. `PATCH /users/me` already accepts `avatarUrl`.
- Any change to the admin member table, which already renders avatars correctly.
- Exposing the avatar source in the public user contract.

## Decisions

### Store which source owns the avatar

Add an `avatar_source` column to `users` with values `provider` and `user`, defaulting to `provider`. Login and invite sync refresh the avatar only while the row is provider-owned. A current-user update that sets a non-null `avatarUrl` flips the row to `user`, and one that sets it to `null` returns it to `provider` so the next login refills it from Google.

Two alternatives were rejected. Mirroring the `displayName` treatment — `COALESCE(users.avatar_url, <incoming>)` — keeps the existing tests green and fills every empty avatar, but once a value is stored it can never change, so a photo updated in Google never propagates and the product requirement is not met. Unconditionally overwriting from the identity satisfies the refresh requirement but violates the preserve-local-edits rule, breaks its two tests, and makes `PATCH /users/me`'s existing `avatarUrl` support pointless, since any login would undo it.

The column is not speculative flexibility: two writers already exist in production code — the Firebase sync and `PATCH /users/me` — and this marker is what arbitrates between them.

### Refresh only when the identity actually supplies a picture

An absent `picture` claim must leave the stored avatar untouched rather than clear it. The backend creates Firebase users through `createUser({ displayName, ... })` with no `photoURL`, so tokens minted for members who sign in through GitHub or email/password carry no picture at all. Treating the claim as authoritative in both directions would erase a member's Google photo the first time they signed in through another provider.

This means the sync rule is "fill or refresh when a picture is present", not "mirror the identity". Clearing an avatar remains a deliberate act through `PATCH /users/me`.

### Keep the sync in the existing sync methods

`updateFromFirebase` and the `upsertFromFirebase` conflict branch already receive the value and already own the merge policy for `displayName`; the avatar rule belongs beside it. A separate avatar-sync service or a post-login hook would add a second place where identity data reaches the user row, which is exactly the ambiguity this change is trying to remove.

### Share the image-failure rule, not the avatar component

PrimeVue's `Avatar` exposes an `image` prop and emits no events, so a provider URL that 404s renders a broken image with no automatic fallback. The fallback therefore has to be written, and it has to exist at both render sites.

Extracting a shared `UserAvatar.vue` was considered and rejected: the two sites have materially different PrimeVue contracts — the header renders `unstyled` with a computed open-state border class, while the profile card uses styled mode with token classes and a different size — so the wrapper would need enough styling knobs to cost more than the duplication it removes. Duplicating the failure handling at both sites was also rejected.

Instead a small shared browser helper in `packages/web-shared` owns the rule: it exposes the URL to render and an error handler, resets when the URL changes, and each call site wires the handler through PrimeVue's `pt.image` passthrough. Each site keeps its own styling; only the failure policy is shared.

### Keep the avatar source out of the public contract

The frontend renders whatever URL it receives and does not need to know where it came from. Leaving `avatar_source` internal keeps `packages/shared` untouched. Exposing it would only be justified by a UI that offers "reset to my Google photo", and shipping the field before that UI exists would add an unreachable contract field.

### Reuse the existing avatar shape rather than introducing new chrome

The top-bar trigger and the profile account card already render a circular avatar at fixed sizes. This change replaces the glyph inside that circle, so the approved `.pen` screens are a parity check for the image treatment — circular crop, no distortion for non-square source images, unchanged trigger sizing and open-state border — rather than a source of new layout.

## Risks / Trade-offs

- **Provider avatar URLs rot.** Google `lh3.googleusercontent.com` URLs can expire or start returning 404 → the image-error fallback renders initials, and provider-owned rows re-read the current URL on every login.
- **Nothing appears until the next login.** The sync runs during login, so existing members keep seeing initials until they sign in again → acceptable for this change; communicate it when shipping rather than adding a backfill job.
- **Members whose Firebase user has no `photoURL` still see initials.** This change cannot fix that, because there is no picture to read → out of scope; it would require populating `photoURL` at Firebase user creation or adding a second source.
- **Defaulting existing rows to `provider` could mislabel a deliberately set avatar.** No UI writes `avatarUrl` today, so stored values came from the Firebase insert path or the seed → the default is correct in practice, and a mislabelled row self-corrects the next time the member sets an avatar.
- **The change touches a shared auth leaf and the shared header used by both SPAs.** A regression would hit admin-web as well as user-web → both frontend suites, lint, and typecheck run as part of verification, per the monorepo rule for shared auth/session leaves.
- **Avatar URLs are third-party image requests from the app shell.** They are already rendered to other members through the admin member table, so this introduces no new exposure, but it does add an outbound image request on every authenticated page.

## Migration Plan

The `avatar_source` column is additive and defaulted, so it can ship ahead of the code that reads it. Order: migration, then API, then `packages/web-shared`, then both apps, since the shared package is a build dependency of the two SPAs.

Rollback is reverting the code; the column can stay in place unused, because nothing else reads it and its default keeps the pre-change sync behaviour reachable. No data backfill is required in either direction.

## Open Questions

None.
