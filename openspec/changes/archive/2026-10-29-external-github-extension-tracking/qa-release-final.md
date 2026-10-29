# Release candidate inspection — 13 October 2026

Source revision: `e0714382`, branch `feat/external-github-time-tracking`.
This is a local artifact/configuration review. No production deployment,
GitHub variable change, Store upload or submission was performed.

## Production-configured extension artifacts

Both targets were built from a temporary source copy using explicit
`--mode prod`, then preserved under
`apps/chrome-ext/dist/release-candidate-20261013/`. Temporary source and
environment files were removed. Public Firebase configuration is bundled as
required for browser authentication; server/provider credentials and `.env`
files are not packaged.

| Archive in that directory | SHA-256 | Bytes |
| --- | --- | --- |
| `gitiempo-chrome-0.1.1-production-candidate-20261013.zip` | `f0bb01c92dd93c340cc0911705c91fd063462f43d34f1fa5e1266b7159d1a49b` | 158446 |
| `gitiempo-firefox-0.1.1-production-candidate-20261013.zip` | `7ae8bbcafa05f637d534af8060c1b5f34b05b8f876fd77ef589e8602d23fe8f3` | 158037 |

Each archive has exactly ten files, byte-for-byte equal to its unpacked
candidate, with `manifest.json` at the root and no source maps, TypeScript,
macOS metadata or environment files. Package and manifest version: **0.1.1**.
Permissions are exactly `identity` and `storage`; host permissions are
`https://api.gitiempo.com/*` and `https://github.com/*`. Popup/background
configuration explicitly uses the production API and `https://app.gitiempo.com/`.
The localhost string retained in bundled validation is an unused default,
not the selected candidate origin. No tunnel origin is bundled.

Manifest executable entries resolve to packaged popup, background and content
files. Content scripts cover GitHub navigation with PR exclusions and strict
issue-context validation. Inspection found zero remote literal dynamic
imports, `importScripts` calls, `eval` calls or remote script tags. Three
bundled `Function` expressions are the existing local schema-parser
capability/JIT paths; this candidate does not introduce remote executable
sources or relax CSP. The plugin could not reach SchemaStore; schema-network
validation was skipped, so the manifest entries above were checked directly.

The existing data inventory remains applicable: a Start request sends
repository, issue number, bounded issue title and direct canonical HTTPS issue
URL. Managed mappings retain installation-based verification; external
reference recording does not call GitHub or claim provider access. Derived
visibility covers only the caller's entries and exact tasks, while separate
project/admin rights remain independent. Logout does not stop/delete server
time records. Store Dashboard declarations remain publisher-owned.

The initial CLI outDir override did not affect the plugin's Chrome child
builds. Those files briefly went into ordinary `dist/chrome`; an explicit dev
rebuild restored it. All ten ordinary Chrome files and all ten Firefox files
were subsequently compared with the previously reviewed `local-final`
archives and matched exactly. Later release builds used only the isolated
copy. No product source was changed.

## Production privacy artifact and publication gate

A separate static Astro build used the publisher-confirmed public values:
site `https://gitiempo.com`, user app `https://app.gitiempo.com/login`, admin
app `https://gitiempo-admin.gitiempo.com`, controller **ITSUA**, contact
**admin@itsua.com**, with analytics disabled. Its output is preserved under
`apps/landing-web/dist/release-candidate-20261013/`.

The generated `/privacy/` HTML contains the **13 October 2026** revision,
title/canonical URL transmission, external recording and scoped sharing. Its
canonical URL is `https://gitiempo.com/privacy/`; no script element or hydrated
island is present. HTML SHA-256:
`ef05acfaeac913bc49fb888fd21d2cb2c44b5aac915d61232c9b83eafaf29d80`.
This configuration build supplements the already executed landing tests and
four-width browser checks; it does not claim production publication.

An anonymous GET of `https://gitiempo.com/privacy/` on 13 October returned
**HTTP 200**, but still served **22 September 2026**, repository/number-only
transmission and subsequent provider retrieval. The response had no scripts
and the expected canonical URL; the anonymous homepage footer and public
sitemap still link to privacy. Published HTML SHA-256:
`224f78eedf817acc624f97d24602727b14c90ea0e75d09f2b6e7d1b0c7bedf5c`.
It does not disclose the changed payload and
external flow. Distribution remains blocked until the new policy is deployed
and anonymously verified.

Read-only GitHub configuration checks found the production environment's
site/admin URLs, controller/contact and public API URL. `PUBLIC_USER_APP_URL`
was absent from environment and repository variables; the production workflow
requires it. Organization-level variables could not be inspected because the
current GitHub authorization returned 403 for that read. Therefore this is a
configuration preflight concern with organization inheritance unverified,
not proof that the effective workflow variable is empty. No extra GitHub
scope was requested and no variable was changed.

A read of the GitHub commit API for `e0714382` returned 422, commit not found.
That local revision is not currently available as a deployable remote ref.
Pushing the prepared branch and running the production landing workflow were
presented together as a concrete, approval-dependent publication step. The user subsequently chose to keep everything local and explicitly skip
production verification. No publication action is authorized or pending in
this implementation pass.

The user explicitly deferred production publication/verification on 13 October.
Tasks **8.2** and **9.23** are resolved for the current local scope: artifact and
inventory checks passed; the deployed-policy clause is **skipped by user**,
not passed. The public policy gate still applies before future distribution.
These archives remain local review candidates and do not establish a production
API/SPA rollout or permission to distribute.
