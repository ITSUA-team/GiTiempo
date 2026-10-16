# Frontend verification evidence

## Automated checks

- Final sequential workspace run passed user-web: 50 files, 528 tests; admin-web: 65 files, 524 tests.
- `pnpm --filter admin-web typecheck` passed.
- `pnpm --filter user-web typecheck` passed.
- `pnpm --filter user-web exec vitest run src/views/ProfileView.spec.ts src/composables/profile/useProfileGithubConnection.spec.ts src/services/profile-github-client.spec.ts src/components/profile/ProfileGithubConnectionCard.spec.ts src/views/LoginView.spec.ts` passed: 5 files, 59 tests.

## Local browser smoke

Agent Browser exercised local Vite applications only, with isolated fixture network responses and synthetic refresh tokens. No provider or user credentials were used.

- User Profile, desktop and 390 × 844 mobile: a connected OAuth identity fixture rendered the account form and GitHub Connection card. The keyboard focus moved from **Reconnect** to **Disconnect** with Tab.
- Admin Settings, 390 × 844 mobile: an admin fixture rendered **GitHub Account**, **GitHub Workspace Access**, the organization selector, and **Add organization**. Shift+Tab from **Add organization** reached the preceding selector control.
- OAuth-only Settings fixture (`organizationDiscovery: ready`, `personalData: authorization_required`): a method-aware local fixture selected and saved `Smoke-Org`; the saved policy row rendered and the browser captured `POST /workspace/github/organizations` followed by list refreshes, with no installation setup or completion request. Its **Install App** action showed the targeted personal-App/organization-owner guidance and still made no setup/complete request. This used only synthetic local API responses.
- Both-grants Settings fixture (`organizationDiscovery: ready`, `personalData: ready`): selected and saved `Smoke-Org`, rendered the saved policy row, and captured `POST /workspace/github/installations/setup` after the policy save. With no installation ID, the browser remained on `/settings`; the explicit **Install App** action navigated only to the controlled local `/fixture-install` URL. A fresh fixture session persisted the saved policy through a Settings reload. A separate existing-installation fixture (`existingInstallationId: '987654'`) captured the automatic `POST /workspace/github/installations/complete` and remained on `/settings`. No provider page, real installation, or confirmation callback was invoked.

The Profile shell made unrelated workspace/timer requests that were intentionally not included in the narrow fixture set, producing error toasts while Profile and GitHub status content remained usable.

## Accessibility smoke limitations

`agent-browser a11y --tags wcag2a,wcag2aa` reported the following observed PrimeVue/form findings, which were not remediated in this OAuth-gate change:

- Profile: two InputText label-association findings and danger-button contrast.
- Settings: unnamed PrimeVue select-trigger buttons, currency accessible-name/incomplete ARIA checks, and toast contrast.

Live OAuth redirects, GitHub consent/policy pages, app installation, and provider revocation confirmation require real GitHub credentials and were not exercised.

## Continued frontend acceptance simulation

The following browser checks used isolated local Vite fixtures, synthetic refresh tokens, and method-aware `fetch` responses. They did not use GitHub credentials, provider pages, or external mutations.

- Profile at the desktop fixture rendered the linked identity, missing personal-App authorization panel, reconnect, personal-data authorization, and Disconnect actions. The synthetic user role was corrected to the schema-valid `member` value before interpreting the rendered state.
- Disconnect confirmation: opening the dialog then canceling produced no `DELETE /github/connection` request. Confirming through the dialog's accept control produced `DELETE /github/connection`, a status refresh, and the disconnected card actions. The fixture returned `providerRevocation: unconfirmed`; the warning was captured in the additional browser pass recorded below.
- Alternative-login-required simulation rendered the explanatory guidance, disabled Disconnect, and made no delete request. The additional browser pass below also rendered `verification_unavailable`.
- Profile callback simulation opened `/profile?github=error&code=github_denied`; it displayed the established error toast and replaced the URL with `/profile`, removing both handled parameters. Captured URL, local storage, and fixture request records contained only synthetic tokens and no authorization code or provider secret.
- Existing local Settings fixture evidence above covers desktop/mobile selector focus, OAuth-only saved policy behavior, both-grants setup, controlled explicit-install navigation, reload persistence, and automatic existing-installation completion.

Existing unrelated shell fixture errors for timer/workspace endpoints were excluded from these GitHub-surface assertions. Additional UI states are recorded below; controlled database and HTTP lifecycle assertions are recorded in `api-acceptance-evidence.md` and `implementation-evidence.md`.

### Additional locally executed 11.16 states

- At 390 × 844, a delayed `GET /github/connection` fixture rendered the Profile GitHub card loading skeleton without action controls; a fixture 500 rendered the separate request-error copy with **Retry** and **Connect GitHub** controls. Keyboard Tab did not create a focus trap in either mobile state.
- At 390 × 844, an OAuth `read:org` permission-required fixture rendered **Organization access needs permission**, retained **Reconnect** and the independent **Authorize GitHub data** action, and remained keyboard reachable. A `verification_unavailable` fixture rendered its retry-later disconnect guidance with Disconnect disabled. The earlier alternative-sign-in-required fixture covered the corresponding add-another-sign-in copy and disabled state.
- The unconfirmed-revocation fixture confirmed Disconnect and immediately captured both success feedback and the exact warning: **GitHub revocation needs review** — “GiTiempo removed the connection, but GitHub could not confirm revocation. Review GitHub authorized applications if needed.” The card then showed **Disconnected** while the browser URL stayed `/profile`.
- Successful and denied callback simulations both showed their established toast and removed `github` and `code` from the Profile URL. The success fixture was `/profile?github=connected&code=fixture-status`; it resolved to `/profile` and displayed **GitHub connected**. Fixture values were non-secret markers; no real authorization code, token, or provider secret appeared in URL, local storage, or captured evidence.

These locally executed fixtures now cover Profile loading, request-error, linked, OAuth permission, App-authorization, alternative-login/verification guards, disconnect warning, callback success/error cleanup, mobile rendering, and keyboard focus behavior. Remaining live-only acceptance facets include real provider consent/revocation, authoritative Firebase alternative-login verification and post-logout behavior, and private GitHub data browsing/import. Controlled server-side credential deletion and generation checks do not replace those live checks.

### Admin Settings local state simulation

- At 390 × 844, a delayed workspace-organization response rendered the GitHub Workspace Access loading state without selector/add controls. A controlled workspace-organization failure rendered the separate **Try again** request-error action at desktop and 390px; it did not render an empty state.
- A schema-valid missing organization-permission fixture (`authorized` OAuth status with a missing account permission) rendered the connected-account recovery guidance and the workspace instruction to grant permission from Profile. The selector, manual entry, and Add organization controls were absent at 390px.
- A ready-organization/ready-App fixture with a different missing account permission rendered the new plain reconnect guidance while keeping the selector, manual entry, and Add organization controls available at desktop and 390px. No provider data or secrets were used.

### Missing account-permission recovery

A missing account permission can coexist with ready organization discovery and personal App data. Profile and Settings now show plain recovery guidance to reconnect GitHub in that state without disabling organization access or private-data controls. Focused Profile and Settings component tests cover `read:project` missing with both capabilities ready, and the existing GitHub Project fields test remains green for App-ready controls.
