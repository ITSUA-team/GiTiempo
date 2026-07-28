# Landing Verification Evidence

This record retains the completed evidence for `add-public-landing-page`. It is not a deployment runbook; [docs/deployment.md](../../../docs/deployment.md) remains the canonical operator guide.

## Automated checks

The following commands passed after the review reconciliation. They are the required local gates before a landing deployment workflow can invoke Wrangler:

- `pnpm --filter landing-web lint`
- `pnpm --filter landing-web typecheck`
- `pnpm --filter landing-web test`
- `pnpm --filter landing-web build`
- `pnpm --filter landing-web test:browser`

## Responsive and interaction evidence

The passing browser check covers the approved reference widths and asserts no horizontal overflow:

- 1440px: Member is selected by default; the desktop roles layout does not overflow.
- 1024px: all three native radio options remain visible and operable without horizontal overflow.
- 768px and 390px: all three role details render as stacked cards without horizontal overflow.
- Desktop: selecting Admin reveals the documented Admin panel; keyboard navigation reaches it from Project Manager.

The landing contract test also verifies the exact enabled Admin copy, the absence of disabled Reports + Invoices content, the single permitted preview timer script, and a useful text label for the illustrative GitHub workflow preview that preserves its heading and supporting copy.

## Deployment boundary

These checks build and preview locally only. They do not publish a Cloudflare Worker. A staging rollback redeploys a previous landing Worker version only, independently from user-web, admin-web, and API deployments.
