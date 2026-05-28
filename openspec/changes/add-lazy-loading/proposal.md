## Why

Both frontend routers currently import route view components eagerly, so the initial application bundle includes page code that is not needed for the first screen. As the user and admin SPAs grow, this makes time-to-interactive scale with the full route inventory instead of the route being visited.

## What Changes

- Convert non-entry route view components in `user-web` and `admin-web` routers from static imports to Vue Router lazy route component loaders using dynamic `import()`.
- Keep `LoginView` eager because it is the public entry route users need immediately.
- Keep authenticated app shell layout components eager so the shell remains available for normal authenticated entry and only child route pages are split.
- Preserve existing route paths, names, auth metadata, redirects, shell ownership, and 403/404 behavior.
- Update router and navigation tests to account for lazy route component functions and asynchronous lazy-route resolution.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `frontend-routing`: Require user-web protected, invite, and error route views to be loaded on demand while preserving existing routing behavior.
- `admin-routing`: Require admin-web protected and error route views to be loaded on demand while preserving existing routing behavior.

## Impact

- Affected user app code: `apps/user-web/src/router/index.ts`, router tests, and any view tests that assert post-login navigation to lazy routes.
- Affected admin app code: `apps/admin-web/src/router/index.ts`, router tests, and any view tests that assert post-login navigation to lazy routes.
- Build output: Vite/Rollup will emit separate dynamic chunks for lazy route views instead of placing every view in the initial route bundle.
- APIs/contracts: no backend, database, OpenAPI, Firebase, or shared Zod contract changes are expected.
- Dependencies: no new runtime or dev dependencies are expected.
