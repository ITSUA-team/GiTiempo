<!-- Scope: public Astro landing page, responsive parity, CTA behavior, SEO, accessibility, and deployment intent -->
<!-- Read when: designing, implementing, reviewing, or deploying apps/landing-web -->

# Public Landing Page

## App Boundary

- App path: `apps/landing-web`.
- Stack: Astro, TypeScript, and Tailwind CSS v4.
- Routes: `/` and `/privacy`.
- Output: static by default.
- Local development URL: `http://localhost:4321`.
- Port `4321` must be strict so the landing never silently moves onto the user app port `5173` or admin app port `5174`.
- Do not add Vue, PrimeVue, Pinia, SPA routing, or an Astro island unless a documented interaction cannot be delivered with semantic HTML.
- The approved Pencil frames are the visual source of truth:
  - `GITiempo Landing Page` — desktop, 1440px.
  - `GITiempo Landing Page — Tablet` — tablet, 768px.
  - `GITiempo Landing Page — Mobile` — mobile, 390px.
  - `GITiempo Privacy Policy` — desktop, 1440px.
  - `GITiempo Privacy Policy — Mobile` — mobile, 390px.

## Origins And Links

| Environment | Landing origin | User app entry | Admin app entry |
|---|---|---|---|
| Local | `http://localhost:4321` | `http://localhost:5173/login` | `http://localhost:5174` |
| Staging | `https://gitiempo-landing.itsua.dev` | `https://gitiempo.itsua.dev/login` | `https://gitiempo-admin.itsua.dev` |

- Treat origins as environment configuration. Do not hard-code staging URLs in Astro components.
- The canonical URL comes from the configured public landing origin.
- Links into the user and admin apps remain normal same-tab navigation unless a later approved requirement says otherwise.

## Privacy Policy Route

`/privacy` is a static, crawlable legal page linked from the landing footer and included in the sitemap. It has one `h1`, a skip link supplied by the shared layout, a canonical URL, and no analytics prompt or illustrative timer script.

- The page must identify the data controller and provide a monitored privacy contact email from `PUBLIC_PRIVACY_CONTROLLER_NAME` and `PUBLIC_PRIVACY_CONTACT_EMAIL`. These build-time values are mandatory; do not replace them with example addresses or product-name guesses.
- Cover service account and time-tracking data, extension session tokens stored in `chrome.storage.local`, and the GitHub repository name plus issue number submitted when a user starts a timer. State the important boundary: an issue title and full page URL may be read locally to recognise the GitHub page but are not part of the timer-start API request.
- State the service purposes, recipients/categories of providers, retention approach, security limitations, user rights, a policy-update mechanism, and the Chrome Web Store Google API Limited Use disclosure.
- The compact header links back to `/`; it does not reuse the home-page in-page navigation or app-entry CTAs. Its footer uses the dark landing treatment and marks `Privacy Policy` as the current page.
- The desktop and mobile Pencil frames are content and hierarchy checkpoints; the mobile page remains one column with readable body copy and visibly separated sections.

## Analytics Consent

Landing analytics is optional. It is available only when the deployed build supplies a valid `PUBLIC_GA_MEASUREMENT_ID`; local development and tests leave this value blank by default. A missing value emits no analytics controls or Google script.

When analytics is configured, display the first-visit consent card in the lower-right corner without covering the primary page CTA. Its approved copy is:

- Heading: `Help us improve GITiempo`
- Body: `Allow anonymous analytics to understand which landing pages and entry points are useful. We do not send account, workspace, project, task, repository, or form data.`
- Primary action: `Allow analytics`
- Secondary action: `Decline`

The prompt is not a modal: page content stays available while it is visible. It has an accessible label, a logical keyboard order, and controls with a minimum 44px target. Selecting either action hides the prompt and stores the visitor choice. The footer has a persistent `Analytics settings` button; it reopens the same card with the current choice visible and lets the visitor change it. On a narrow viewport, the card uses the page shell width and sits above the safe bottom inset.

The implementation is framework-free and uses basic Consent Mode v2: analytics storage and all advertising consent values default to denied. It loads `gtag.js` asynchronously only after a visitor grants analytics consent. It must not enable advertising consent, Google Signals, User-ID, remarketing, or cross-domain tracking. With a configured Measurement ID, the consent and analytics scripts are the only approved browser-script exception in addition to the illustrative preview timer.

The GA4 web data stream for this Measurement ID must have every Enhanced Measurement option disabled, and the associated Google tag must have automatic event detection disabled. These are stream-side settings, so `send_page_view: false` in the landing code suppresses only the initial automatic page view; it cannot suppress stream-generated scroll, outbound-click, or history events.

Only the following analytics events are approved:

| Event | Fields |
|---|---|
| `page_view` | Rendered document title and a page location restricted to the origin, pathname, and approved campaign parameters (`utm_*`, `gclid`, `dclid`, `gbraid`, `wbraid`) |
| `landing_cta_click` | Fixed `cta_location` (`header`, `hero`, `final_cta`) and fixed `destination_app` (`user_app`, `admin_app`) |

Never send link URLs, CTA labels, arbitrary DOM text, hashes, unapproved query values, or any personally identifiable or application data. Analytics failure or blocking must not interrupt CTA navigation.

## Page Order And Anchors

Use one `h1` and preserve this section order:

1. Header and hero.
2. Product benefits: `id="product"`.
3. GitHub workflow demo: `id="github-workflow"`.
4. How it works: `id="how-it-works"`.
5. Roles.
6. MVP Scope.
7. FAQ: `id="faq"`.
8. Final CTA and footer.

The home footer includes a normal same-tab `Privacy Policy` link before the conditional `Analytics settings` control.

Anchor targets must use scroll margin that clears the header. Navigation labels and targets are:

| Label | Target |
|---|---|
| Product | `#product` |
| How it works | `#how-it-works` |
| FAQ | `#faq` |

## CTA Contract

| Location | Label | Target | Visual priority |
|---|---|---|---|
| Header | Start tracking | Configured user app entry URL | Primary |
| Hero | Start tracking now → | Configured user app entry URL | Primary |
| Hero | Open admin workspace | Configured admin app entry URL | Secondary |
| Final CTA | Start tracking now | Configured user app entry URL | Primary |
| Final CTA | Open admin workspace | Configured admin app entry URL | Secondary |

Keep the user-app CTA visually dominant. Both CTA paths take users into the working applications; do not describe either destination as a preview.

## Approved FAQ Copy

FAQ is static question-and-answer content, not a JavaScript accordion. Every answer remains present in the document and available to assistive technology.

### Do I need GitHub to use GITiempo?

No. Create local projects and tasks, then connect GitHub only when synced issue context helps.

### Can I start timers from GitHub?

Yes. After signing in to the Chrome extension, supported GitHub issue pages can start a timer with repository and issue context attached.

### Who can review tracked time?

Members manage their own entries. Project managers and admins review time according to their workspace role and project visibility.

### Where do reports and invoice records fit?

Approved time stays available for filtering and reporting, then can continue into invoice records when the work is ready to bill.

## Responsive Contract

The three Pencil frames define the parity checkpoints. Use content-driven Tailwind breakpoints, with these expected layout branches:

- Desktop, `1024px` and wider:
  - Full inline navigation.
  - Two-column hero with product preview.
  - Three workflow steps in one row.
  - A selectable role list with its matching detail panel; Member, Project Manager, and Admin are available roles.
  - Side-by-side final CTA copy and actions.
  - Analytics consent card is a compact fixed lower-right card; the footer settings control stays in the final footer row.
- Tablet, `640px` through `1023px`:
  - Compact inline navigation.
  - Hero copy followed by the preview.
  - Workflow and role content stack without hiding information.
  - CTA actions may stack beneath the copy.
  - Analytics consent card is fixed to the lower-right page inset and remains within the viewport.
- Mobile, below `640px`:
  - Brand and primary CTA in the first header row.
  - Product, How it works, and FAQ anchors in a compact second row; no JavaScript menu.
  - All content, cards, workflow steps, and CTA actions use one column.
  - Preserve the approved information hierarchy and enabled states.
  - Analytics consent card becomes a full-width fixed card inset by the page shell, above the safe bottom inset; actions may stack.

Do not implement disabled Pencil nodes. Member, Project Manager, and Admin role details are part of the landing UI; the disabled Reports + Invoices scope card is not.

## Roles

- On desktop, render a native radio role selector beside one matching detail panel. Member is selected by default; selecting Project Manager or Admin replaces the detail panel.
- On tablet and mobile, render all three role details as stacked cards so no role information is hidden.
- The selector must remain clickable and keyboard-operable without client JavaScript.

### Admin role detail

- Selector label: `Admin`.
- Eyebrow: `RUN THE WORKSPACE`.
- Heading: `Admin`.
- Detail points, in order: `Invite teammates and assign roles`; `Manage settings and GitHub connection`; `See the full workspace across projects`.
- Use the inverse brand-purple detail treatment from the approved role section: inverse heading/body text with lavender eyebrow and point markers. This approved Admin detail overrides the stale desktop Pencil node that only exposes the role label.

## Landing Tokens And Typography

- Reuse shared semantic tokens from `packages/web-config/src/styles/tokens.css`; do not copy Vue or PrimeVue components.
- Use Tailwind v4 CSS-first configuration and semantic token utilities. Do not place raw hex values in Astro markup.
- Inter is the primary typeface. IBM Plex Mono is reserved for eyebrows and workflow metadata shown in Pencil.
- The authenticated-app typography table in `components.md` does not constrain marketing headlines. Match each landing frame for weight, wrapping, and layout.
- Heading scale is the exception to that frame-matching rule, and is standardised in `global.css` instead. Every section heading uses `section-heading` (30 / 36 / 42px) and every card heading uses `card-heading` (22 / 25px). One definition each, no per-element size, leading, or tracking overrides — a section that needs a different size needs a new utility, not an override, so the next reader can still tell the scale from the class name.
- This deliberately supersedes the per-frame heading sizes where they differ. The frames drew the final CTA at 48px and card titles at five sizes between 20px and 28px; the Roles heading had also drifted to 40px against the same utility it was already applying.
- The eyebrow above a heading uses the `eyebrow` utility and varies only by colour token. The utility draws its own leading dot from `::before`, so every eyebrow carries one and no call site adds, repeats, or forgets it. The dot inherits the eyebrow's text colour instead of owning a token, which is what lets one rule read correctly on the dark, white, and brand-purple backgrounds.
- The approved Brand Purple MVP Scope section is a landing-only large-background exception. It does not change the authenticated app rule.
- Body copy must not be smaller than 14px. Keep paragraph line length near 50–75 characters.

## Accessibility

- Target WCAG 2.2 AA.
- Use semantic `header`, labelled `nav`, `main`, `section`, and `footer` landmarks.
- Provide a visible-on-focus skip link to `main`.
- Keep heading order logical and use exactly one `h1`.
- All links require descriptive accessible names, visible `:focus-visible` treatment, and a minimum 24×24px target; 44×44px is preferred for CTA and navigation controls.
- Ensure anchored content and focused elements are not obscured by the header.
- Product screenshots require useful alt text when they communicate workflow. Decorative graphics use empty alt text.
- Do not rely on color alone for status or workflow meaning.
- Respect `prefers-reduced-motion`; smooth scrolling and decorative motion must be disabled when reduced motion is requested.
- The active timer values in landing app previews may advance once per second unless reduced motion is requested. They are illustrative only and do not represent a signed-in session or API data. The timer and, when configured, the documented consent/analytics behavior are the only approved browser scripts. They must remain framework-free and must not add a client application runtime.
- Verify keyboard order, 200% zoom, contrast, and no horizontal overflow.

## SEO And Performance

- Current approved copy is English, so the document language is `en`.
- Provide a unique title, meta description, canonical link, favicon links, Open Graph metadata, and Twitter card metadata.
- Derive canonical and social URLs from the configured public landing origin.
- Include `robots.txt` and sitemap support for the deployed site.
- Use `astro:assets` for local content images, include intrinsic dimensions, and avoid layout shifts.
- Prefer local or self-hosted fonts and avoid render-blocking third-party scripts. The conditional Google Analytics loader is permitted only after consent.
- Ship zero client framework JavaScript and hydrated islands. The documented illustrative preview timer and optional framework-free consent/analytics behavior are the only approved browser scripts; document any additional script or island and its hydration reason before implementation.
- Do not invent review counts, customer logos, guarantees, pricing, support commitments, or structured-data claims that are not approved elsewhere.

## Verification

When implementation exists, run:

```bash
pnpm --filter landing-web lint
pnpm --filter landing-web typecheck
pnpm --filter landing-web build
```

Run the development server on strict port `4321` and compare it with the approved Pencil frames at 390px, 768px, 1024px, and 1440px. Verify CTA destinations, anchors, keyboard navigation, reduced motion, console output, image dimensions, metadata, and absence of horizontal overflow.
