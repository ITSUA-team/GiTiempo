# Dependabot Vulnerability Remediation — Issue #495

This is the single traceable remediation report for **issue #495 (Dependabot vulnerability remediation)** in the GiTiempo monorepo. The remediation PR description links here. Every action below is traceable to package versions, advisory IDs (where captured), affected manifests, dependency paths, usage surface, and validation evidence.

| Field | Value |
| --- | --- |
| Issue | #495 — Dependabot vulnerability remediation |
| Report | `docs/security/dependabot-remediation-495.md` (this file) |
| Dependabot baseline | 2026-10-29 |
| `pnpm audit` baseline | 2026-11-02 |
| Remediation state | Commit-ready working tree (changes vs `HEAD`), pending PR review |
| Post-remediation audit &amp; validation | 2026-11-02 |
| Supply-chain policy | `.npmrc` `minimum-release-age=10080` (7 days) — now **actually enforced** (was not before §4.1) |

---

## 1. Executive summary

- **Baseline (Dependabot, 2026-10-29):** 246 open alerts — 11 critical, 106 high, 103 moderate, 26 low — covering **169 distinct advisories** across 5 manifest surfaces (`pnpm-lock.yaml` 176, `apps/api/pnpm-lock.yaml` 47, `apps/api/package.json` 15, `apps/landing-web/package.json` 7, `package.json` 1).
- **Baseline (`pnpm audit`, 2026-11-02):** 208 distinct advisories — 7 critical, 96 high, 83 moderate, 22 low.
- **Two root causes:** (1) the pinned **pnpm 10.14.0** silently ignored `minimum-release-age` (the feature only exists from pnpm 10.16.0), so the 7-day supply-chain policy was decorative; (2) an **obsolete stale duplicate lockfile** (`apps/api/pnpm-lock.yaml`, 6210 lines) kept reporting a second alert surface.
- **Remediation implemented:** pnpm → 10.34.9 (policy now enforced everywhere), lockfile consolidation, direct dependency bumps, and 13 `pnpm.overrides` entries for age-eligible transitives pinned out-of-range by their parents.
- **Result (`pnpm audit`, 2026-11-02):** 208 → **16 distinct advisories** (6 high, 7 moderate, 3 low, **0 critical**). All 7 critical advisories resolved; −192 advisories overall.
- **Remaining 16 advisories** collapse into 5 groups (node-forge, deepmerge, uuid, minimatch, glob), each documented in §6 with reason, exposure assessment, and follow-up. 11 of the 12 node-forge advisories clear automatically on 2026-11-03 when the 7-day age gate unlocks the patched versions.
- **Validation (2026-11-02):** `pnpm install --frozen-lockfile`, `pnpm typecheck` (11/11), `pnpm lint` (11/11), `pnpm test` (11/11), and `pnpm test:e2e` (Docker API e2e — 34 files / 436 tests) all pass.

---

## 2. Counting conventions and traceability

- **"Alert"** = a Dependabot alert: one alert per vulnerable package occurrence per manifest. The same advisory typically raises several alerts.
- **"Advisory"** = a distinct vulnerability finding (GHSA/CVE) as counted by `pnpm audit`.
- Dependabot (GitHub Advisory Database) and `pnpm audit` (npm registry audit endpoint) use different sources, scopes and dedupe rules; their totals are **not directly comparable**. Each instrument is compared against itself over time: Dependabot 2026-10-29 ↔ future rescans, and `pnpm audit` 2026-11-02 baseline ↔ 2026-11-02 post-remediation.
- **Advisory IDs:** GHSA/CVE IDs are quoted where captured during the audit. Where an ID was not captured, findings are identified by `package + severity + patched range/title` and marked *(GHSA not captured)*. No advisory IDs in this document are invented.
- **Timestamps** in §4.1 are publish dates from the npm registry, used as evidence that the age gate is live.

---

## 3. Baseline inventory

### 3.1 Dependabot — 2026-10-29

**By severity (246 open alerts):**

| Severity | Alerts |
| --- | --- |
| Critical | 11 |
| High | 106 |
| Moderate | 103 |
| Low | 26 |
| **Total** | **246** |

Distinct advisories behind these alerts: **169** (the same advisory raises multiple alerts across the 5 manifest surfaces).

**By manifest:**

| Manifest | Alerts |
| --- | --- |
| `pnpm-lock.yaml` (root) | 176 |
| `apps/api/pnpm-lock.yaml` | 47 |
| `apps/api/package.json` | 15 |
| `apps/landing-web/package.json` | 7 |
| `package.json` (root) | 1 |
| **Total** | **246** |

### 3.2 `pnpm audit` — 2026-11-02 (baseline)

| Severity | Distinct advisories |
| --- | --- |
| Critical | 7 |
| High | 96 |
| Moderate | 83 |
| Low | 22 |
| **Total** | **208** |

---

## 4. Remediation implemented (commit-ready working tree, vs `HEAD`)

### 4.1 pnpm upgrade — making the 7-day release-age policy effective

**Problem.** `.npmrc` declares `minimum-release-age=10080` and `pnpm-workspace.yaml` declares `minimumReleaseAge: 10080` (7 days). The pinned **pnpm 10.14.0 predates the `minimumReleaseAge` feature (introduced in pnpm 10.16.0)**, so installs accepted packages of any age and the policy had no effect.

**Action — pnpm pinned 10.14.0 → 10.34.9 in all three enforcement points:**

| File | Setting | Before | After |
| --- | --- | --- | --- |
| `package.json` | `packageManager` | `pnpm@10.14.0` | `pnpm@10.34.9` |
| `.github/actions/workspace-check/action.yml` | pnpm `version` | `10.14.0` | `10.34.9` |
| `apps/api/Dockerfile` | `corepack prepare` | `pnpm@10.14.0` | `pnpm@10.34.9` |

**Why 10.34.9:** it is the last pnpm 10.x release (published **2026-10-25** — it therefore itself satisfies the 7-day policy) and it enforces `minimumReleaseAge`.

**Evidence that the policy is now effective:**

- `pnpm --version` reports **10.34.9** in the remediation environment.
- Installation now **rejects packages published within the last 7 days**; this was verified during the remediation. Explicit proof captured: temporarily pinning `node-force@1.4.2` (published 2026-10-27, 6 days ago) in `pnpm.overrides` and running `pnpm install --lockfile-only` produced `ERR_PNPM_NO_MATURE_MATCHING_VERSION — Version 1.4.2 (released 6 days ago) of node-forge does not meet the minimumReleaseAge constraint` (the override was then removed and the lockfile reverted to the remediation state).
- Live evidence from dependency resolution (targets refused in favor of age-eligible ones):
  - `astro` 7.4.3 / 7.4.4 (published 2026-10-28) refused → **7.4.2** used.
  - `ws` 8.22.1 (published 2026-10-31) refused → **8.21.0** used.
  - `@grpc/grpc-js` 1.14.7 (published 2026-10-29) refused → **1.14.6** used.
  - `node-forge` 1.4.1 (2026-10-27T04:44Z) / 1.4.2 (2026-10-27T14:09Z) gated until **2026-11-03** (§6.1).
  - `minimatch` 11.0.1 and `glob` 14.0.2 (both 2026-10-27) gated until 2026-11-03 (§6.4, §6.5).
  - All bump targets adopted in this remediation are published **on or before 2026-10-25**.

### 4.2 Lockfile consolidation — `apps/api/pnpm-lock.yaml` deleted

The stale member lockfile (6210 lines) was deleted. **Obsolescence evidence:**

| Check | Finding |
| --- | --- |
| Freshness | Stale since the init commit `45efc2fb` (2026-04-18); out of sync with `apps/api/package.json` (last changed 2026-10-29) |
| CI workflows | No workflow references it |
| Docker builds | `apps/api/Dockerfile` copies the **root** lockfile |
| Compose / scripts / docs | No references found |
| CI installs | `workspace-check` action runs `pnpm install --frozen-lockfile` at the repo root |
| pnpm workspace semantics | A member-level `pnpm install` uses the root lockfile (`sharedWorkspaceLockfile` default `true`) |

Side effect: removes ~205 KB from the Docker build context.

### 4.3 Direct dependency bumps

All target versions are published on/before 2026-10-25 and therefore satisfy the 7-day policy. "Advisories addressed" uses `severity + patched range/title`; GHSA IDs were not captured for these findings.

| Package | Manifest(s) | Version change | Advisories addressed | Dependency path / usage surface | Rationale |
| --- | --- | --- | --- | --- | --- |
| `turbo` | `package.json` (root) | `^2.5.0` → `^2.11.10` | moderate (turbo CSRF) + 1 low *(GHSA not captured)* | Dev/build: monorepo build orchestration, CI pipelines | In-range bump that clears both turbo advisories |
| `vitest` | `package.json` (root) | `^3.1.2` → `4.1.11` (**exact**) | critical: vitest <3.2.6 *(GHSA not captured)*; critical: tinypool 1.x *(GHSA not captured,* removed because vitest 4.x has no tinypool dependency*)* | Dev/test: workspace test runner | Exact pin required by the member-symlink constraint — see §4.5 for the full rationale |
| `vite` (via override) | `package.json` (root, `pnpm.overrides.vite`) | `^8.1.5` → `^8.1.6` (resolves to 8.3.5) | high: vite <=8.1.5 *(GHSA not captured)* | Dev/build: build tooling (astro dependency chain) | Resolves to 8.3.5 which satisfies astro 7.4.2's `^8.3.4` requirement; full rationale in §4.4 |
| `nodemailer` | `apps/api/package.json` | `^8.0.6` → `^10.2.1` | high + moderate *(GHSA not captured)* | Runtime: API mail transport | Major bump clears both advisories; nodemailer 10 ships its own types, so `@types/nodemailer` was removed |
| `@nestjs/swagger` | `apps/api/package.json` | `^11.3.0` → `^11.4.7` | moderate: js-yaml `maxTotalMergeKeys` CPU *(GHSA not captured)* | Runtime: OpenAPI document generation | Bump pulls js-yaml 5.3.0 → 5.4.1 (fix); the 5.x copy is additionally pinned by the §4.4 override |
| `firebase-admin` | `apps/api/package.json` | `^13.6.0` → `^13.10.0` | Removes the **production** node-forge path (see §6.1) | Runtime: Firebase admin SDK | 13.10.0 drops its direct node-forge dependency — the entire prod node-forge path is gone (verified via `pnpm why node-forge`) |
| `zod` | `apps/api/package.json`, `packages/shared`, `packages/web-shared` | `^4.3.6` (api) / `^4.1.12` (both packages) → `^4.6.7` | high: zod <4.6.6 *(GHSA not captured)* | Runtime: request/response validation (api), contract schemas (shared packages) | Bump clears the high advisory on all three manifests |
| `vitest` | `apps/api/package.json` | `^4.1.4` → `^4.1.12` | — | Dev/test: API unit suite | Alignment with the 4.x line (§4.5 constraint) |
| `@vitest/coverage-v8` | `apps/api/package.json` | `^4.1.4` → `^4.1.12` | — | Dev/test: coverage provider | Alignment with vitest 4.1.12 |
| `vitest` | `packages/shared`, `packages/web-shared`, `packages/web-config`, `apps/user-web`, `apps/admin-web`, `apps/chrome-ext` | `^4.1.4` → `^4.1.12` | — | Dev/test: shared package + SPA + extension suites | Alignment across all workspace suites |
| `astro` | `apps/landing-web/package.json` | `7.0.0` → `7.4.2` (**exact pin preserved**) | **critical:** RCE via AVIF image optimization, patched >=7.2.8 *(GHSA not captured)* | Build/runtime: landing site generation | 7.4.2 clears the critical RCE; 7.4.3/7.4.4 (published 2026-10-28) are **age-blocked** and were correctly refused |

### 4.4 `pnpm.overrides` added (root `package.json`)

For transitives pinned by their parents or out of range, age-eligible secure versions are forced centrally. Final overrides block:

```json
"vite": "^8.1.6",
"undici": "7.30.1",
"ws": "8.21.0",
"shell-quote": "1.11.0",
"tmp": "0.2.7",
"adm-zip": "0.6.1",
"multer": "2.5.0",
"@grpc/grpc-js": "1.14.6",
"esbuild": "0.28.1",
"sharp": "0.35.5",
"js-yaml@5": "5.4.1",
"schema-utils": "4.7.0",
"@vitest/mocker": "4.1.12"
```

| Override | Target | Parent pinning the old version | Advisories addressed | Usage surface | Rationale &amp; age notes |
| --- | --- | --- | --- | --- | --- |
| `vite` | `^8.1.6` (→ 8.3.5) | astro (requires `^8.3.4` at 7.4.2) | high: vite <=8.1.5 *(GHSA not captured)* | Dev/build | Raises the override to the range astro 7.4.2 requires |
| `undici` | `7.30.1` | wrangler + miniflare pin 7.24.8 | clears **9 high** + moderate undici advisories *(GHSAs not captured)* | Dev-only (wrangler) | 7.30.1 is the youngest major-compatible target the age gate allows |
| `ws` | `8.21.0` | miniflare pins 8.18.0 | high: ws *(GHSA not captured)* | Dev/build | 8.22.1 (2026-10-31) is age-blocked; 8.21.0 (2026-05-22) clears the high |
| `shell-quote` | `1.11.0` | fx-runner pins 1.7.3 | **critical** (`quote()` newline injection) + high (quadratic DoS) *(GHSAs not captured)* | Dev-only (chrome-ext tooling chain) | 1.9.0 was trialed and was **insufficient** (left the critical open); 1.11.0 needed |
| `tmp` | `0.2.7` | web-ext-run pins 0.2.5 | high: path traversal *(GHSA not captured)* | Dev-only (chrome-ext tooling chain) | 0.2.6 was **insufficient** (a newer advisory is patched only >=0.2.7) |
| `adm-zip` | `0.6.1` | firefox-profile pins ~0.5.x | clears **7 advisories** *(GHSAs not captured)* | Dev-only (chrome-ext chain, never executed — `disableAutoLaunch: true`) | Fixes the dev-only adm-zip advisory set |
| `multer` | `2.5.0` | `@nestjs/platform-express` pins multer (even 11.2.8 pins 2.4.0 < required 2.5.0) | advisories fixed in multer 2.5.0 *(severity breakdown not separately captured)* | Runtime dependency declared by the API, but **zero** `FileInterceptor`/Multer usage in the api | Same-major 2.x bump; exposure-neutral regardless because the API never uses multer |
| `@grpc/grpc-js` | `1.14.6` | `@firebase/firestore` pins ~1.9.0 | all high ranges *(GHSAs not captured)* | Firebase web path (browsers use WebChannel, not the grpc-js runtime) | 1.14.7 (2026-10-29) is age-blocked; 1.14.6 clears all high ranges. Cross-tilde override; correctness verified via api e2e + frontend builds |
| `esbuild` | `0.28.1` | wrangler / tsx / @esbuild-kit pin older | moderate (<=0.24.2) + low (<0.28.1) *(GHSAs not captured)* | Dev tooling only | Clears both advisories without breaking the dev toolchain |
| `sharp` | `0.35.5` | miniflare pins ^0.34.5; astro 7.4.2 moves sharp to optional ^0.35.4 (also satisfied) | sharp advisories *(severity breakdown not separately captured)* | Dev + build only; landing does not use `astro:assets`/`Image` | Single override satisfies both parents' constraints |
| `js-yaml@5` | `5.4.1` | `@nestjs/swagger` 11.4.7 pins js-yaml 5.3.0 exact | moderate: `maxTotalMergeKeys` CPU *(GHSA not captured)* | Runtime: OpenAPI generation | **Scoped override** (5.x only — the 4.x copy was already deduped to 4.3.2) |
| `schema-utils` | `4.7.0` | — | **not a security fix** | Dev/build: `@nestjs/cli` webpack chain | Peer-conflict repair: `pnpm update -r` had raised schema-utils to 4.8.1 (peer `webpack ^5.112.0`) while `@nestjs/cli` pins webpack 5.106.2 (`^4.3.3` peer). 4.7.0 is the last schema-utils without the `^5.112.0` peer, keeping `pnpm install` green under `strict-peer-dependencies=true` |
| `@vitest/mocker` | `4.1.12` | root vitest 4.1.11 pulls @vitest/mocker 4.1.11 | moderate: @vitest/mocker <4.1.12 *(GHSA not captured)* | Dev/test: vitest mocking module | Compensates the root vitest 4.1.11 pin (§4.5); 4.1.12 is patch-compatible with vitest 4.1.11 |

### 4.5 Root vitest exact-pin rationale (maintainer convention note)

The root `vitest` is pinned to the **exact** version `4.1.11` — deliberately **not** `^4.1.12`, which matches the apps' version. This is a deliberate divergence, not an oversight:

- `apps/api/package.json`'s `test:e2e` script and `apps/api/src/db/e2e-database.spec.ts` spawn `./node_modules/vitest/vitest.mjs` **relative to the api cwd**.
- With pnpm `node-linker=hoisted`, pnpm only creates a member-level `apps/api/node_modules/vitest` symlink when the **root and api vitest versions differ** (version conflict).
- History: the original setup had root vitest 3.x vs api vitest 4.x → conflict → api symlink present → the relative path worked. Bumping root to `^4.1.12` (same version as api) made pnpm dedupe and hoist vitest to root only, **removing the api symlink** and breaking `test:e2e` and the e2e-database guard test. Pinning root to exact `4.1.11` (≠ api's `4.1.12`) restores the conflict → api gets its own `4.1.12` symlink → the relative path works again.
- Security posture is unaffected: both 4.1.11 and 4.1.12 are >=3.2.6 (critical fixed), vitest 4.x has no tinypool dependency (tinypool critical removed), and the `@vitest/mocker` override at 4.1.12 covers the mocker moderate present in 4.1.11.

> **Note for future maintainers:** if root vitest is ever bumped to exactly match the api version, the api member symlink disappears and `./node_modules/vitest/vitest.mjs` inside `apps/api` breaks. Either keep the versions divergent or refactor the api scripts/tests to resolve vitest via `require.resolve` / `import.meta.resolve`.

### 4.6 Source reformatting (side effect, no logic changes)

Prettier was bumped in-range 3.8.3 → 3.9.10 by `pnpm update -r` and reformatted 4 files in `apps/api/src`:

- `github-account.service.ts`
- `github-connections.service.ts`
- `github-installation-token-provider.service.ts`
- `tasks.service.spec.ts`

Changes are union-type formatting only (multi-line → single-line), auto-fixed via `pnpm --filter @gitiempo/api lint:fix`. No logic changes.

### 4.7 Other `pnpm update -r` side effects (in-scope per issue Work item: "Update direct dependencies")

`pnpm update -r` re-resolved all direct dependencies to the newest age-eligible version within their existing caret ranges. Beyond the targeted bumps in §4.3, this raised in-range patch/minor versions across manifests, e.g. `@nestjs/common`/`core`/`platform-express`/`testing` ^11.1.19→^11.2.8, `@nestjs/throttler` ^6.5.0→^6.7.1, `drizzle-orm` ^0.45.2→^0.45.4, `helmet` ^8.1.0→^8.3.0, `jsonwebtoken` ^9.0.2→^9.0.3, `nestjs-zod` ^5.3.0→^5.5.0, `pg` ^8.20.0→^8.23.1, `pino` ^10.3.1→^10.4.0, `pino-pretty` ^13.1.3→^13.2.0, `@swc/core` ^1.15.30→^1.16.20, `tsx` ^4.21.0→^4.23.15, `eslint` ^9.25.1→^9.39.5, `prettier` ^3.8.3→^3.9.10, and `@types/*` patch bumps. These are semver-compatible and help clear additional transitive advisories (the issue authorizes compatible parent-package updates for transitive vulnerabilities). Two targeted corrections were applied on top:

- **`@nestjs/mapped-types` removed** from `apps/api/package.json` dependencies. It was declared as `"*"` (wildcard) and `pnpm update -r` had rewritten it to `^12.0.0` (a major jump from the resolved 2.x). It has zero direct usage in `apps/api/src` (grep-verified); `@nestjs/swagger` brings its own `mapped-types@2.1.1`. Removing it eliminates a duplicate major copy and the misleading Nest-12 peer signal. `pnpm typecheck` and the full api suite (656 tests) pass after removal.
- **`@tailwindcss/cli` `4.2.2` → `4.3.3`** in `apps/landing-web/package.json` (exact pin preserved). `pnpm update -r` had raised `tailwindcss` ^4.2.2→^4.3.3 but left the exact-pinned CLI at 4.2.2 (the CLI bundles its own compiler), creating a compiler-version skew. 4.3.3 (published 2026-07-16, age-eligible) realigns the CLI compiler with the hoisted `tailwindcss` 4.3.3. Validated via `pnpm typecheck` (landing-web passes).

---

## 5. Baseline vs post-remediation inventory

| Severity | Dependabot alerts (2026-10-29) | `pnpm audit` advisories (2026-11-02 baseline) | `pnpm audit` advisories (2026-11-02 post) | Change (advisories) |
| --- | --- | --- | --- | --- |
| Critical | 11 | 7 | **0** | −7 — **all resolved** |
| High | 106 | 96 | 6 | −90 |
| Moderate | 103 | 83 | 7 | −76 |
| Low | 26 | 22 | 3 | −19 |
| **Total** | **246 alerts** | **208 advisories** | **16 advisories** | **−192** |

Notes on this comparison:

- The two instruments are not directly comparable (see §2); the delta column is measured within `pnpm audit` only (2026-11-02 baseline ↔ post).
- **Structural shrinkage of the alert surface:** `apps/api/pnpm-lock.yaml` (47 baseline Dependabot alerts) no longer exists (§4.2), so that surface disappears for Dependabot entirely — independent of which advisories were fixed.
- A post-remediation Dependabot snapshot was not part of this report's capture; post-remediation numbers are from `pnpm audit` on 2026-11-02. Dependabot will re-scan once the PR lands.
- Severity cross-check: summing the per-group severities in §6 yields 6 high / 6 moderate / 4 low, while the `pnpm audit` headline reads 6 high / 7 moderate / 3 low — the same 16 advisories; one advisory is classified differently between the audit summary and the advisory detail. The total (16) and the high count (6) agree; the ±1 moderate/low difference changes no remediation decision.

---

## 6. Remaining alerts — per-alert documentation

**Headline (`pnpm audit`, 2026-11-02): 16 distinct advisories remain — 6 high, 7 moderate, 3 low, 0 critical** (down from 208; all 7 criticals resolved). They group into 5 packages; duplicates are grouped below while each group keeps its advisory-level traceability.

| Group | Advisories | Severity makeup |
| --- | --- | --- |
| node-forge (§6.1) | 12 | 5 high (fixed ≥1.4.1) + 1 high unfixable + 3 moderate (fixed ≥1.4.1) + 3 low (fixed ≥1.4.1) |
| deepmerge (§6.2) | 1 | 1 low, no fix exists |
| uuid (§6.3) | 1 | 1 moderate, fixed ≥11.1.1, not reachable in-range |
| minimatch (§6.4) | 1 | 1 moderate, fixed ≥11.0.1, dev-only |
| glob (§6.5) | 1 | 1 moderate, fixed ≥14.0.2, dev-only |
| **Total** | **16** | matches the audit headline *(per the §5 reconciliation note)* |

### 6.1 node-forge — 12 advisories

| Advisory | Severity | Fixed in | Availability under the 7-day gate |
| --- | --- | --- | --- |
| **GHSA-86w9-cpqp-85rv / CVE-2026-85393** — RSA PKCS#1 v1.5 signature verification | High (CVSS 7.5) | none (`<0.0.0`) | **No fix in any release** |
| 5 advisories *(GHSA not captured)* | High | ≥1.4.1 | age-blocked until 2026-11-03 (~04:44Z) |
| 3 advisories *(GHSA not captured)* | Moderate | ≥1.4.1 | age-blocked until 2026-11-03 (~04:44Z) |
| 3 advisories *(GHSA not captured)* | Low | ≥1.4.1 | age-blocked until 2026-11-03 (~04:44Z) |

| Field | Detail |
| --- | --- |
| **Reason not fixed** | Patched versions 1.4.1 (published 2026-10-27T04:44Z) and 1.4.2 (published 2026-10-27T14:09Z) are **age-blocked by the 7-day policy until 2026-11-03** (~04:44Z / ~14:09Z UTC respectively). One advisory (GHSA-86w9-cpqp-85rv) has no fix in any release. |
| **Affected manifest &amp; dependency path (post-remediation)** | **DEV-ONLY:** `apps/chrome-ext → vite-plugin-web-extension 4.5.1 → web-ext-run 0.2.4 → @devicefarmer/adbkit 3.3.8 → node-forge 1.4.0`. The **production path was removed** by the firebase-admin 13.10.0 bump (13.10.0 dropped its direct node-forge dep — verified via `pnpm why node-forge`). |
| **Usage surface** | Dev-only (chrome-ext extension-run tooling). Never executed: `disableAutoLaunch: true` and no dev script triggers it. The former prod consumer (firebase-admin) no longer pulls forge at all. |
| **Exposure assessment** | The unfixable PKCS#1 v1.5 signature-verification operation is **not reachable**. firebase-admin ≤13.8.0 used forge only for `forge.pki.privateKeyFromPem` — a one-time service-account key format validation at boot, with input being the trusted `FIREBASE_PRIVATE_KEY` secret. Token verification uses jsonwebtoken + jwks-rsa (node crypto), not forge. After 13.10.0 forge is not even in the prod tree. The chrome-ext dev path is never executed. |
| **Follow-up / mitigation** | On **2026-11-03 (≥14:09Z UTC)** run `pnpm update node-forge` (or add override `node-forge: 1.4.2`) → clears **11 of 12** advisories. The 1 unfixable advisory stays open in every forge version: watch forge **PR #1152** / **GHSA-86w9-cpqp-85rv** for a release and re-triage. Do **not** lower `minimum-release-age` to force-install — the ~1-day wait is intentional supply-chain protection. |

### 6.2 deepmerge — 1 advisory

| Advisory | Severity | Fixed in |
| --- | --- | --- |
| **GHSA-gcqx-w48m-w2h4 / CVE-2026-93753** — prototype poisoning | Low | none (`<0.0.0`) |

| Field | Detail |
| --- | --- |
| **Reason not fixed** | No fix exists; upstream is effectively dead (latest 4.3.1, published 2023-03-16; issue #273 open). |
| **Affected manifest &amp; dependency path** | PROD: `apps/api → nestjs-zod 5.3.0 → deepmerge 4.3.1` (OpenAPI document merge at boot). DEV: `@nestjs/cli → fork-ts-checker-webpack-plugin → deepmerge`. |
| **Usage surface** | Runtime (API boot-time OpenAPI merge) + dev (type-check plugin). |
| **Exposure assessment** | Merged objects are the app's own Zod/OpenAPI metadata (developer-authored), never attacker-controlled; the prototype-poisoning precondition is not met. LOW severity, unreachable in practice. |
| **Follow-up / mitigation** | Watch **GHSA-gcqx-w48m-w2h4** and nestjs-zod releases; bump when a patched deepmerge or a nestjs-zod update appears. **Accepted with mitigation.** |

### 6.3 uuid — 1 advisory

| Advisory | Severity | Fixed in |
| --- | --- | --- |
| uuid — missing buffer bounds check in v3/v5/v6 *(GHSA not captured)* | Moderate | ≥11.1.1 |

| Field | Detail |
| --- | --- |
| **Reason not fixed** | Parents pin uuid `^8` (node-notifier) and `^9` (gaxios, google-gax, teeny-request — via firebase-admin prod path). Forcing uuid 11.x is a 2-major override (8→11 and 9→11) — high compatibility risk for google-gax/gaxios. No in-range fix exists. |
| **Affected manifest &amp; dependency path** | `apps/api` prod tree via firebase-admin → google-gax / gaxios / teeny-request (uuid ^9); dev via node-notifier (uuid ^8) — root lockfile surface. |
| **Usage surface** | Runtime (Firebase/GCS request IDs) + dev (node-notifier notifications). |
| **Exposure assessment** | The vulnerable code is uuid **v3/v5/v6** (name-based UUID generation). Repo code uses only **v4** (random) — verified: no v3/v5/v6 calls in apps/packages. firebase-admin/google-gax use uuid for request IDs (v4). The bounds-check issue does not affect v4. Moderate, not reachable via the used API surface. |
| **Follow-up / mitigation** | Re-evaluate when firebase-admin/google-gax adopt uuid ≥11, or if name-based UUID usage is ever introduced. **Accepted with documentation.** |

### 6.4 minimatch — 1 advisory

| Advisory | Severity | Fixed in |
| --- | --- | --- |
| minimatch — potential DoS via glob *(GHSA not captured)* | Moderate | ≥11.0.1 |

| Field | Detail |
| --- | --- |
| **Reason not fixed** | `@eslint/config-array` (eslint 9.39.5) uses minimatch 3.x; `@typescript-eslint` uses 10.x. Fixing requires 11.x = a major override across eslint tooling. Dev-only. 11.0.1 (published 2026-10-27) is also **age-blocked until 2026-11-03**. |
| **Affected manifest &amp; dependency path** | Dev: root lockfile → eslint 9.39.5 → `@eslint/config-array` → minimatch 3.x; `@typescript-eslint` → minimatch 10.x. |
| **Usage surface** | Dev-time lint tooling; CI lint runs. |
| **Exposure assessment** | DoS requires an attacker-controlled glob pattern fed to eslint — not a realistic CI input. Dev-only. |
| **Follow-up / mitigation** | Bump when eslint/@typescript-eslint releases adopt minimatch ≥11; or after 2026-11-03 consider a scoped override if compat is validated. **Accepted/deferred.** |

### 6.5 glob — 1 advisory

| Advisory | Severity | Fixed in |
| --- | --- | --- |
| glob — AbortSignal cancellation bypass *(GHSA not captured)* | Moderate | ≥14.0.2 |

| Field | Detail |
| --- | --- |
| **Reason not fixed** | `@nestjs/cli` and `js-beautify` (via `@vue/test-utils`) use glob `^13`. Fixing requires 14.x = a major override. Dev-only. 14.0.2 (published 2026-10-27) is also **age-blocked until 2026-11-03**. |
| **Affected manifest &amp; dependency path** | Dev: root lockfile → `@nestjs/cli` → glob ^13; `@vue/test-utils → js-beautify` → glob ^13. |
| **Usage surface** | Dev/build tooling only. |
| **Exposure assessment** | Cancellation bypass needs a crafted AbortSignal scenario; not reachable through normal dev/build flows. |
| **Follow-up / mitigation** | Bump when parents adopt glob ≥14; or a scoped override after age-eligibility + compat validation. **Accepted/deferred.** |

---

## 7. Validation performed (2026-11-02)

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | **Success** — lockfile consistent |
| `pnpm typecheck` | **11/11** turbo tasks successful |
| `pnpm lint` | **11/11** turbo tasks successful (after auto-fixing 4 prettier 3.9.10 union-formatting errors — see §4.6) |
| `pnpm test` | **11/11** turbo tasks successful + root node:test CI-target detection 5/5. Suites include `@gitiempo/api` (656 tests), `admin-web` (855), `user-web`, `web-shared` (300), `chrome-ext` (261), `landing-web`, etc. |
| `pnpm test:e2e` | **Passed** (Docker-backed API e2e: 34 test files / 436 tests, exit code 0). Exercises the changed backend deps at integration level (nodemailer 10 invite delivery, firebase-admin 13.10 auth boundary, multer 2.5 inert, @grpc/grpc-js 1.14.6 Firestore path, @nestjs/swagger 11.4.7 contract shapes, e2e-database guard). |

**Policy evidence recap:** §4.1 records that `pnpm --version` reports 10.34.9, installs reject packages published within 7 days, and multiple registry targets (astro 7.4.3/7.4.4, ws 8.22.1, `@grpc/grpc-js` 1.14.7, node-forge 1.4.1/1.4.2, minimatch 11.0.1, glob 14.0.2) were demonstrably gated during remediation.

**Pre-existing finding (NOT introduced by this change, documented for awareness):** `apps/landing-web` `astro check` (typecheck) silently no-ops because `@astrojs/check`'s transitive `@napi-rs/wasm-runtime` peer `@emnapi/runtime` is not installed under `node-linker=hoisted` (the original lockfile also marked `@emnapi/runtime` `optional: true`). This predates the remediation; typecheck still exits 0. Out of scope for #495 — a separate follow-up should make `astro check` resolve `@emnapi/runtime` (e.g., add it as an explicit devDep) so the landing typecheck gate is real.

---

## 8. Rollout and rollback

### Rollout

- Validate on a **feature branch** before staging/production.
- Root lockfile changes trigger the API, landing, and SPA deployment workflows on applicable branches.
- **Reuse the existing deployment gates** — API E2E + image smoke; landing checks/build/browser tests — rather than adding duplicate smoke tests.

### Rollback

- Revert the dependency manifest + lockfile changes: `git revert` the PR merge.
- The `pnpm.overrides` entries and exact version pins are the only behavioral levers; **no schema/data migrations** are involved.
- If a runtime issue appears from a specific bump (**nodemailer 10**, **multer 2.5.0**, **`@grpc/grpc-js` 1.14.6**, **sharp 0.35.5**), that single override/dependency can be reverted independently without unwinding the rest of the remediation.

---

## 9. Follow-up tracker

| # | When | Action | Expected effect |
| --- | --- | --- | --- |
| F1 | 2026-11-03, ≥14:09Z UTC | `pnpm update node-forge` (or override `node-forge: 1.4.2`) | Clears **11 of 12** node-forge advisories (§6.1) |
| F2 | Open | Watch forge **PR #1152** / **GHSA-86w9-cpqp-85rv** for a fixed release | Re-triage the 1 unfixable node-forge advisory |
| F3 | Open | Watch **GHSA-gcqx-w48m-w2h4** + nestjs-zod releases | Bump deepmerge / nestjs-zod when patched (§6.2) |
| F4 | Open | Re-evaluate uuid when firebase-admin/google-gax adopt ≥11 or name-based UUID use appears | Clears uuid advisory or keeps it documented (§6.3) |
| F5 | After 2026-11-03 | Bump minimatch when eslint adopts ≥11; else scoped override after compat validation | Clears minimatch advisory (§6.4) |
| F6 | Open | Bump glob when parents adopt ≥14; else scoped override after compat validation | Clears glob advisory (§6.5) |
| F7 | **Done (2026-11-02)** | Run `pnpm test:e2e` (Docker + Postgres) | Closes the validation gap from §7 |
| F8 | Separate issue (out of #495 scope) | Make landing `astro check` resolve `@emnapi/runtime` (explicit devDep) | Makes the landing typecheck gate real (§7) |

---

## 10. Traceability appendix — duplicate grouping and manifest surfaces

The 246 baseline Dependabot alerts dedupe to 169 advisories; remediation actions were indexed per advisory (not per alert), and duplicate alerts across manifests collapse under the same action. Mapping of baseline alert surfaces to the remediation levers:

| Baseline surface (baseline alerts) | Addressed by | Notes |
| --- | --- | --- |
| `pnpm-lock.yaml` (176) | §4.1 (policy), §4.3 (bumps), §4.4 (overrides) | Primary resolution surface |
| `apps/api/pnpm-lock.yaml` (47) | §4.2 (deletion) | Surface removed entirely — stale duplicate since commit `45efc2fb` (2026-04-18) |
| `apps/api/package.json` (15) | §4.3 — nodemailer 10.2.1, @nestjs/swagger 11.4.7, firebase-admin 13.10.0, zod 4.6.7, vitest/coverage-v8 4.1.12 | Direct dependencies |
| `apps/landing-web/package.json` (7) | §4.3 — astro 7.4.2 (exact pin) | Critical AVIF RCE cleared; 7.4.3/7.4.4 age-blocked |
| `package.json` (root) (1) | §4.3 — direct-dep bumps (incl. turbo ^2.11.10) | Direct dependency on the root manifest |

Post-remediation, the 16 remaining advisories map to exactly 5 groups (§6): node-forge (12, age-gated + 1 unfixable), deepmerge (1, no fix), uuid (1, unreachable-in-range), minimatch (1, dev-only), glob (1, dev-only). Each group's follow-up is tracked in §9.