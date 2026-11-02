# Firefox parity capture blocker

Date: 2026-10-15

The isolated browser was Firefox Nightly 151.0, BuildID `20260611192437`, from
`/Users/alexeytsukanov/Library/Caches/ms-playwright/firefox-1532`.

The final Firefox extension build was produced with
`VITE_EXTENSION_API_BASE_URL=http://127.0.0.1:3035` and loaded as a temporary,
unpacked add-on through Firefox DevTools RDP. Firefox returned the expected
add-on ID, `gitiempo-dev@example.com`; the temporary profile also resolved its
`moz-extension://` UUID. The build contained `fonts/InterVariable.woff2`.

The headless DevTools RDP connection worked after setting
`devtools.debugger.prompt-connection=false` in the isolated profile. WebDriver
BiDi accepted `session.new` at `/session`, but did not respond to
`browsingContext.create` within 10 seconds. Without a browsing context, the
popup could not be opened or captured. The temporary Firefox process was then
stopped.

No Firefox popup screenshot or visual-parity pass is claimed. This is an
automation-protocol limitation of the available Nightly/browser tooling, not a
product failure.
