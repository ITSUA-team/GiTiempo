# Chrome Web Store listing

This is copy-ready listing content for the GiTiempo Chrome extension. Publisher and production details below use the confirmed project values. Verify that each public URL loads before submitting the extension.

The feature claims below match the current Manifest V3 extension: authenticated GiTiempo members can start and stop timers from supported GitHub issue, pull-request, and organisation-project pages. The extension is not an issue tracker and does not claim to work on every GitHub page.

## Store Listing

| Chrome Web Store field | Value |
| --- | --- |
| Name | `GiTiempo` |
| Category | `Productivity` |
| Language | `English (United States)` |
| Summary | `Start and stop GiTiempo timers from GitHub issues, pull requests, and project pages.` |
| Homepage URL | `https://gitiempo.com` |
| Support URL | Leave blank — no dedicated public support page is currently configured. |
| Privacy policy URL | `https://gitiempo.com/privacy` |
| Official URL | `https://gitiempo.com` — select it only after the domain is verified in Google Search Console. |
| Mature content | `No` |

The summary is 84 characters long, within Chrome Web Store's 132-character limit.

### Detailed description

```text
GiTiempo brings time tracking into the GitHub pages where your work happens. Sign in with your GiTiempo workspace account, open a supported GitHub issue, pull request, or organisation project page, and start or stop your timer without leaving Chrome.

With GiTiempo you can:

• Start a timer for a supported GitHub work item.
• Stop a running GiTiempo timer from the extension popup.
• See your signed-in state and return to your GiTiempo dashboard.
• Keep GitHub work context connected to your GiTiempo time entries.

GiTiempo is for authenticated members of a GiTiempo workspace. A GiTiempo account and access to a workspace are required.
```

## Visual assets to prepare

The ready-to-upload screenshots follow a clear carousel story: start from an issue, keep the timer running, retain project context, then control the timer inline. They are editorial compositions based on publisher-supplied GiTiempo captures; the embedded product states must be rechecked against the release build before submission.

| Asset | Required size | Content | Filename |
| --- | --- | --- | --- |
| Store icon | 128 × 128 px | Selected GiTiempo time-monogram mark on a transparent background. | [`store-icon-128.png`](./chrome-web-store-assets/store-icon-128.png) |
| Screenshot 1 | 1280 × 800 px | Start a GiTiempo timer from a supported GitHub issue. | [`01-track-time-from-issues.png`](./chrome-web-store-assets/01-track-time-from-issues.png) |
| Screenshot 2 | 1280 × 800 px | Keep focus while a GiTiempo timer is running; stop when work is done. | [`02-stay-in-the-flow.png`](./chrome-web-store-assets/02-stay-in-the-flow.png) |
| Screenshot 3 | 1280 × 800 px | Retain task context when opening GiTiempo from GitHub Projects. | [`03-keep-project-context.png`](./chrome-web-store-assets/03-keep-project-context.png) |
| Screenshot 4 | 1280 × 800 px | Start and stop the timer without leaving a supported GitHub page. | [`04-timer-controls-in-github.png`](./chrome-web-store-assets/04-timer-controls-in-github.png) |
| Small promo tile | 440 × 280 px | Required Store promotional image: GiTiempo extension popup over a work screen. | [`promo-small-440x280.png`](./chrome-web-store-assets/promo-small-440x280.png) |
| Marquee promo tile | 1400 × 560 px | Optional featured-placement image: GiTiempo extension popup visibly anchored to its browser-extension trigger. | [`promo-marquee-1400x560.png`](./chrome-web-store-assets/promo-marquee-1400x560.png) |

Chrome requires a small promo tile and at least one screenshot; it permits up to five screenshots. Use square-corner images; 1280 × 800 px is the preferred screenshot size. Upload the two promo tiles and four screenshots listed above after release-build verification.

## Publisher details

| Field | Value |
| --- | --- |
| Offered by | `ITSUA` |
| Support email | `admin@itsua.com` |
| Privacy contact | `admin@itsua.com` |
| Privacy policy controller | `ITSUA` |

## Before submission

- Confirm the Store name equals the release manifest name (`GiTiempo`) and that the manifest version is newer than every previously uploaded version.
- Upload the final ZIP with `manifest.json` at its root.
- Check the final screenshots against the released extension; each image must show a state users can actually reach.
- Complete the privacy-practices declaration using [the package data inventory](./chrome-web-store-privacy.md), then confirm that its answers and the live privacy policy match the release package.
- Confirm the homepage, support, and privacy-policy URLs load publicly before submitting.

## References

- [Chrome: Prepare your extension](https://developer.chrome.com/docs/webstore/prepare)
- [Chrome: Creating a great listing page](https://developer.chrome.com/docs/webstore/best-listing)
