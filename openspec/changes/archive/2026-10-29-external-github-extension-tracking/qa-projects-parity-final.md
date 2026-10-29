# Projects visual parity — final local check

Date: 14 October 2026. Source: `e0714382` plus the current local patch.
Approved design: `GITiempo.pen`, desktop `yAu6B` / external section `dQaDV`
and mobile `FRM1d`. The user confirmed saving the duration-free revision.

## Scope and implementation

`ProjectsTaskSection.vue` remains the single project/task renderer. No new page,
route, external-only view, API request or authorization rule was introduced.
The existing table shell, mobile card, PrimeVue Tag/Button, source-link and timer
leaves are reused. Header/table changes apply to the common renderer; compact
external mobile styling is local and changes neither the shared card nor other
pages. Add/edit continue to depend on server capabilities; `?` appears only for
`own-time`, including when the same external project is rendered for a full-scope
user without that restriction. Projects displays no tracked durations.

## Executed browser checks

An isolated Chromium session rendered the actual Vue component with the real
PrimeVue preset, app CSS and synthetic props. This is component visual/interaction
evidence; it does not replace the earlier API-backed scope/timer checks in
[web QA](qa-web-final.md) or native extension/Firefox evidence.

- At 1280×900, the title/count is left aligned; External and `?` are right aligned.
  Desktop headers are Task / Status / Updated, followed by 52px rows. The custom
  shared header measures 44px; External tags measure approximately 68×27px with
  6px radius, purple text and accent-tint background. Task order is timer, title,
  source icon, External. No duration is shown despite a 43,200-second fixture total.
- At 390×844, the project header is 64px tall; `?` measures 44×44px with a 6px
  radius and divider border. Cards measure 358×112px, with 12px padding, 8px radius
  and 8px separation. Each card contains title/source and timer, plain status /
  Updated metadata, then External. Timer buttons measure 48×32px, icons 18px.
- At 320px, long project/task names truncate while source links and timer actions
  remain visible. The open tooltip spans x=16…304, keeping 16px viewport margins.
  At 390px it fits within the viewport; desktop tooltip width is 340px and its
  right edge remains inside the content. No document overflow at either width.
- At exactly 640px, mobile cards are absent and the table returns. Its minimum
  width scrolls inside the existing shell (606px client / 740px content), without
  overflowing the document.
- Hover/focus/click open the explanatory tooltip; Escape and outside interaction
  dismiss it. Visible keyboard focus, accessible help/timer/source labels and
  readonly own-time titles were inspected. Full-scope props retain Add/edit and
  omit own-time help.
- Desktop and mobile Start → running → blocked-other-task → Stop emit the existing
  intents exactly once. The observed fixture sequence was `start`, `stop-first`,
  `stop`; this verifies component transitions, not server writes. Pending shows
  one spinner / `aria-busy` and natively disables all timer requests.

Inspected final screenshots: [desktop](design-review/projects-desktop.png),
[mobile](design-review/projects-mobile.png), and
[320px long titles / tooltip](design-review/projects-mobile-long-tooltip.png).
Additional transient runtime screenshots are under `/private/tmp` with prefix
`external-projects-` and date `20261014`.

## Design/documentation boundaries

The mobile Pen example omits a source link; the implementation retains its compact
accessible icon because `docs/ui/pages-user.md` requires source links on both
branches. Existing app shell, three search/filter controls, browser-local timestamp
formatting and repository-standard Heroicons remain the documented runtime
contract rather than being replaced by the simplified static mockup chrome.
The Inter font stack/theme is reused unchanged. No PrimeVue conflict forced a
design deviation. The component geometry, hierarchy, badges and controls in this
scope were compared with the approved frames; this is not a claim of whole-app
pixel identity or a new cross-browser end-to-end run.

## Verification and cleanup

- Full User suite: **551 tests / 52 files passed**, including 19 focused component
  tests and four new desktop/mobile own-time/full-scope cases.
- User lint: **0 errors**, 11 pre-existing warnings outside the changed files.
  Typecheck and root Turbo User build passed. Existing lockfile-sync and build
  chunk-size warnings remain non-failing.
- Independent read-only review: approved with no actionable findings; focused
  19-test suite plus the existing 2-test legacy file passed, diagnostics clean.
- Temporary fixture entry files were removed, dedicated Vite process stopped,
  browser session closed and port 5398 verified not listening. No database,
  customer data, real timer or GitHub resource was modified by this visual pass.
- The requested codebase-memory indexing tools are unavailable in this session;
  no graph/index-coverage assertion is made. Source, compiler, lint, tests and
  browser evidence are the verification surfaces used here.

Task 9.21 is complete in combination with the previously recorded extension,
admin, privacy and other User-view checks. Production privacy publication remains
explicitly user-skipped and is still required before distribution.
