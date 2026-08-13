## 1. Two-target build

- [x] 1.1 Add `vite-plugin-web-extension` and pin vite to one version, so the plugin's own copy does not fork the `Plugin` type
- [x] 1.2 Write the manifest once with browser-prefixed keys and emit the matching subset per target
- [x] 1.3 Send each target to its own output folder, `dist/chrome` and `dist/firefox`
- [x] 1.4 Make `pnpm --filter chrome-ext build` produce both, with per-target scripts available separately
- [x] 1.5 Drop the separate content-script build config, now that entry points come from the manifest
- [x] 1.6 Confirm each built manifest carries only its own browser's keys

## 2. Firefox manifest metadata

- [x] 2.1 Give Firefox a background event page and leave Chrome its service worker, neither manifest carrying the other's key
- [x] 2.2 Declare `browser_specific_settings.gecko` with the add-on id, minimum version, and data-collection declaration
- [x] 2.3 Read the add-on id from `VITE_EXTENSION_GECKO_ID` and require it, so a missing value fails the build rather than the sign-in
- [x] 2.4 Keep `strict_min_version` in code, and record in the README why 112 is not a preference

## 3. Google sign-in without a Chromium-only key

- [x] 3.1 Read the OAuth client id from extension configuration instead of `manifest.oauth2`
- [x] 3.2 Remove `oauth2` from the manifest, since nothing reads it any more
- [x] 3.3 Replace the two tests asserting on the manifest cross-check with ones covering the `identity` permission and the configured id

## 4. GitHub sign-in returns to the right browser

- [x] 4.1 Bake the build target into the extension and send it on the sign-in start URL
- [x] 4.2 Accept a browser discriminator on the start endpoint, validated against a closed set and defaulting to Chrome
- [x] 4.3 Resolve the extension destination per browser, leaving every other `'extension'` branch untouched
- [x] 4.4 Carry the browser in the signed state, omitted when Chrome, so states signed earlier stay valid
- [x] 4.5 Declare `GITHUB_SIGNIN_EXTENSION_FIREFOX_REDIRECT_URL` and carry it through the deploy workflow
- [x] 4.6 Strengthen the "contributes nothing that could steer the destination" test rather than widening its key list

## 5. Documentation

- [x] 5.1 Document loading each build, including that Firefox takes the manifest file rather than the folder
- [x] 5.2 Document both redirect URIs per provider and how to read them from the running add-on
- [x] 5.3 Record why one shared manifest would cost nine Firefox releases
- [x] 5.4 Note that a temporarily installed add-on has no host permissions until they are granted by hand

## 6. Verification

- [x] 6.1 Run typecheck, lint and unit suites for the API and the extension
- [x] 6.2 Confirm no database migration and no shared contract change
- [x] 6.3 Confirm the gecko id override changes the emitted manifest, and that its absence fails the build by name
- [ ] 6.4 Load both builds and exercise popup, content scripts, timer actions and session persistence (needs a browser)
- [ ] 6.5 Complete Google and GitHub sign-in in Firefox against a deployed API with both destinations configured (needs a browser and a deploy)

## 7. Rollout

- [ ] 7.1 Register both Google redirect URIs on a Web application OAuth client
- [ ] 7.2 Set `SIGNIN_GITHUB_EXTENSION_FIREFOX_REDIRECT_URL` in the API environment
- [ ] 7.3 Set `VITE_EXTENSION_GECKO_ID` wherever the extension is built, before the next build runs there
