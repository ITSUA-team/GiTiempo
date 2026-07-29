## Context

The popup renders one branded shell per state and previously exposed the web app only through body-level links built from `config.userSpaUrl`. That value points at the sign-in route, so the links sent signed-in users to a login page. Separately, the runtime snapshot carried only `authenticated`, `currentTimer`, and `errorMessage`, so the popup had no user identity except the one nested inside a running timer — which is why the user badge existed in a single state.

Relevant source-of-truth and constraints:

- `apps/chrome-ext/AGENTS.md`: Manifest V3 only, Tailwind-only UI, extension-owned storage/messaging/runtime, and shared imports limited to browser-safe contract and token surfaces.
- `docs/ui/chrome-ext.md`: popup header treatment and per-state affordances.
- `GITiempo.pen`: approved extension frames showing the header home icon and user avatar.
- `packages/shared` is Zod-only and browser-safe; `packages/web-shared` is Vue-coupled and therefore not importable from the extension.

## Goals / Non-Goals

**Goals:**

- One dependable entry point into the web app home from every signed-in popup state.
- One identity shown consistently across signed-in states, including the running-timer state.
- Keep the home destination environment-driven without introducing a new environment variable.
- Keep identity derivation in a single layer.

**Non-Goals:**

- No new API endpoint or profile fetch for the extension.
- No avatar imagery; initials only.
- No home affordance before sign-in, where there is no workspace to open.
- No change to timer start/stop behavior or GitHub issue detection.

## Decisions

**Home destination is the origin of the configured SPA URL.** `VITE_EXTENSION_USER_SPA_URL` already identifies the deployed User SPA, so `userSpaHomeUrl` is derived from its origin instead of adding a second variable to every environment. The trade-off is that the SPA is assumed to be hosted at the root of its origin; a subpath deployment would need the variable split.

**Identity comes from the stored session token, not a new request.** The access token already carries the user email, so the background reads it while building the snapshot. Opening the popup therefore costs no extra network call, and the header stays populated even when the timer request fails — which is what makes the disconnected state able to show the avatar. The display name is only available from a running timer, so the snapshot carries the email always and upgrades to the display name when a timer supplies one.

**The background owns identity derivation.** The snapshot's `user` is a required nullable field, and the popup reads it directly rather than re-deriving from the running timer. Keeping the rule in one layer avoids two components disagreeing about who the header describes.

**Shared helpers rather than extension-local copies.** Base64url claim reading and initials derivation both already existed in `packages/web-shared`; the extension cannot import that package, so both moved to `packages/shared` and are consumed from both sides. The SPA initials rule was kept as the canonical one because it is older and covered by tests, which changes the popup's label for an account without a display name.

## Planned File Changes

**`packages/shared`**

- `src/auth/access-token-claims.ts`: browser-safe access-token payload decode and string-claim read.
- `src/auth/profile-initials.ts`: initials derivation shared by SPA and extension headers.

**`packages/web-shared`**

- `src/query/scope.ts` and `src/auth/profile-presentation.ts`: consume the shared helpers instead of local copies.

**`apps/chrome-ext`**

- `src/lib/config.ts`: derive and expose `userSpaHomeUrl`.
- `src/lib/token.ts`: read the session email through the shared claim reader.
- `src/lib/runtime.ts`: add the signed-in user to the runtime snapshot.
- `src/background/main.ts`: populate the snapshot user for every session-bearing state.
- `src/popup/main.ts`: header home action and initials avatar; drop the body-level workspace link.
- `src/content/main.ts`: keep the fallback snapshot shape aligned.

**Docs and design**

- `docs/ui/chrome-ext.md`: describe the shared header once rather than per state.
- `GITiempo.pen`: extension frames updated with the header home icon and avatar.

## Risks / Trade-offs

- The popup depends on the access token carrying an email claim, which is owned by the API. If that claim changes, the avatar degrades to hidden rather than breaking the popup.
- Unifying initials changes the popup label for accounts with no display name (first letter of the email rather than two letters of its local part), in exchange for the SPA and extension never disagreeing.
