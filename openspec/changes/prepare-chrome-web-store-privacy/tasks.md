## 1. Docs and implementation prerequisites

- [x] 1.1 Read the extension/landing AGENTS and required skills, inspect the approved extension and privacy page frames, and confirm the existing logout, provider persistence, and public route behavior against this design, using `https://gitiempo-landing.itsua.dev/privacy/` as the current deployed policy baseline.
- [x] 1.2 Create `docs/chrome-web-store-privacy.md` with separate technical, publisher-fact, and public/Dashboard verification statuses; record missing owner/contact, recipients, retention/deletion/backups, transfers, and certification facts without inventing values. Local technical work may proceed while these publication prerequisites remain open.
- [x] 1.3 Reconcile the documented logout ordering in `docs/ui/chrome-ext.md` with local-first cleanup and bounded revocation, and document the consumed `add-landing-ga4-analytics` requirements without changing that active change or marking its outstanding verification complete.

## 2. Chrome extension authentication

- [x] 2.1 Add focused regressions for Firebase cleanup on logout, GitHub-only/no-provider cleanup, and provider cleanup when the GiTiempo pair is already absent; preserve existing backend failure/timeout, refresh-race, and active-timer tests.
- [x] 2.2 Add extension-local Firebase SDK sign-out and launch it independently of the existing API client's `exitSession()` promise; settle both operations without serially waiting for the revoke before Firebase cleanup, and preserve bounded revocation, refresh invalidation, and MV3 handler lifetime.
- [x] 2.3 Persist token-free pending-provider-cleanup status and expose `Retry sign-out` in the unauthenticated popup error presentation after a failure. Verify retry before and after reopening/restarting without a new login, clearing the marker on success, and preserving GiTiempo cleanup/backend revocation despite provider failure. Include the recovery state in the design review and storage disclosure.
- [x] 2.4 Verify popup/injected-control updates after logout and that running timers and user/admin SPA or provider website sessions remain unaffected.

## 3. Chrome extension permissions and package verification

- [x] 3.1 Inventory all tab API calls and lock relevant context/navigation behavior with targeted existing tests; remove broad `tabs` permission while retaining identity, storage, configured API host, and required GitHub access.
- [x] 3.2 Run extension lint, typecheck, tests, and `pnpm --filter chrome-ext build` for both browser targets; inspect each manifest for the intended permissions and supported target keys.
- [ ] 3.3 In Chrome and Firefox, verify popup context and injected controls on issues, pull requests, and organization-project issue surfaces, timer updates across tabs, and app/profile navigation; document any demonstrated browser-specific permission requirement.
- [ ] 3.4 In a packaged extension with non-sensitive test accounts, verify Google, email/password, and GitHub login/logout, reopening the runtime, absence of authenticated Firebase persistence after successful logout, backend-unavailable logout, and the running-timer invariant. Store no credentials in evidence.

## 4. Landing Privacy Policy

- [x] 4.1 Obtain and record operator confirmation of controller identity/contact, actual provider/recipient list, retention/deletion/backups, applicable transfers, and organizational Limited Use practices before finalizing public factual statements. — **Completed 2026-09-16.** Controller (`ITSUA`), contact (`admin@itsua.com`), provider/recipient list (Hetzner, Cloudflare, Firebase/Google, GitHub, Backblaze, Google/Gmail), processing regions (Germany/EU for hosting and backups; global for Firebase and GitHub), retention periods (account data: active lifetime; backups: 90d daily / 1y weekly; logs: 30d; tokens: 15min access / 7d refresh; invites: 7d), deletion process (manual via privacy email, 30-day response, backup persistence until expiration), transfer safeguards (SCC for non-EU transfers), and access controls all verified from production infrastructure. Public policy (`privacy.astro` §4–§6) and `docs/chrome-web-store-privacy.md` publisher-facts table updated with confirmed facts only.
- [x] 4.2 Update the existing policy with authentication providers/storage, local GitHub context versus timer-start payload and server retrieval, authorized workspace sharing, all-data Limited Use, and the difference between logout/uninstall and server deletion.
- [x] 4.3 Add optional landing GA4 disclosures matching the active analytics contract: measured events and sanitized fields, cookies/consent storage, withdrawal controls and limitations, and separation from extension behavior; avoid an anonymity guarantee.
- [ ] 4.4 Confirm that the currently displayed staging controller `ITSUA` identifies the actual responsible person/organization and that the separate contact `admin@itsua.com` is monitored; use confirmed production inputs and a truthful revision date, preserve fail-fast handling of missing/malformed inputs, and update `docs/ui/pages-landing.md` with the approved content contract. The earlier issue of an email being displayed as the controller is already resolved on staging. — **Partially complete, 2026-09-16.** Controller, contact, and revision date (16 September 2026) confirmed and used in the local build. Remaining: update `docs/ui/pages-landing.md` and verify the production deployment after release.
- [x] 4.5 Verify existing `/privacy` generation, footer link, canonical metadata, and sitemap inclusion in the actual build artifact; repair only demonstrated omissions and confirm no analytics/timer scripts are emitted on the policy page.
- [x] 4.6 Add or update focused landing route/content/configuration regressions, including analytics-enabled and disabled builds, mandatory policy inputs, disclosure coverage, and sitemap/footer behavior.
- [ ] 4.7 Run landing lint, typecheck, tests, and build; verify the updated policy at 390, 768, 1024, and 1440 pixels for keyboard access, heading order, readability, and no horizontal overflow.

## 5. Docs and declaration preparation

- [x] 5.1 Complete the candidate data inventory and proposed current Dashboard category mapping, including locally handled page data and explicit consideration of manual timer records under User activity; distinguish draft choices from confirmed Dashboard values.
- [x] 5.2 Prepare the single-purpose text, exact permission/host justifications, and remote-code declaration from the final package; record version/hash and review date, and link the checklist from the extension README and `docs/deployment.md`.
- [x] 5.3 Record publisher confirmation for actual data-use/transfer certifications, including the absence of unrelated and creditworthiness/lending uses; keep unresolved facts visibly open and exclude secrets/test credentials from documentation.
- [x] 5.4 Run strict OpenSpec validation and review the final diff for scope, preserved logout scenarios, and compatibility with the active analytics delta; do not mark implementation or release tasks complete merely because artifacts validate.

## 6. Release verification under applicable authorization

- [ ] 6.1 Verify the revised policy on the existing staging deployment, including its homepage footer link and sitemap, then promote the approved artifact to production with confirmed production inputs using the existing release process when authorized. Treat the earlier production 404 as pending release, not a proven routing defect; keep this task open until production deployment has occurred.
- [ ] 6.2 Verify anonymously on the public domain: HTTP 200 with the expected policy text and confirmed controller/contact/date, working homepage footer link, sitemap inclusion, and no sign-in requirement. Record URL, deployment revision, and timestamp.
- [ ] 6.3 Compare the publisher's actual Chrome Web Store Privacy practices fields and policy URL against the candidate package and approved policy; update them under applicable authorization and record their verified state. Do not infer values from an unseen Dashboard.
- [ ] 6.4 Record final privacy submission readiness only after all public policy, publisher-fact, package, and Dashboard checks pass. Store submission itself remains a separately authorized release action; unresolved gates remain pending.
