# ADR 005: Cloudflare Workers Static Assets for Frontend SPAs

**Status:** Approved  
**Date:** 2026-05-01

## Context

GI Tiempo has two independent Vue/Vite SPAs:

- `apps/user-web` for members
- `apps/admin-web` for admins and project managers

The frontend applications need separate deployments, separate public domains, fast static delivery, SPA route fallback, and room for lightweight edge logic later if runtime bootstrap configuration or request routing becomes necessary.

## Decision

Deploy both frontend applications to **Cloudflare Workers Static Assets**.

Each app is deployed as a separate Cloudflare Worker/static assets project:

- `apps/user-web` deploys independently from `apps/admin-web`.
- Each app has its own Wrangler configuration.
- Each app deploy workflow supports manual `workflow_dispatch` and automatic deployment from the `staging` branch.
- Automatic deploy workflows use path filters so only affected frontend apps are deployed.
- Production frontend configuration is injected at build time through `VITE_*` variables owned by GitHub Environments or repository secrets/variables.

Unknown frontend routes must use SPA fallback to `index.html`.

## Alternatives Considered

### Cloudflare Pages

Cloudflare Pages is a good static hosting option for Vite SPAs and was the earlier documented target. However, Workers Static Assets gives us the same static delivery model while keeping the deployment unit aligned with Workers, where we can add Worker-side routing or runtime bootstrap behavior later without changing platform.

### VPS Static Hosting

Serving frontend assets from the VPS would keep all runtime pieces in one server, but it increases operational coupling. Frontend-only releases would depend on the backend VPS and proxy stack, and global static delivery would be worse than Cloudflare's edge network.

### Object Storage + CDN

Object storage with CDN is portable, but it requires more infrastructure wiring for invalidation, SPA fallback, preview environments, and deployment automation. Cloudflare Workers Static Assets is simpler for this monorepo.

## Consequences

- Frontend deploys are separate from API deploys.
- `user-web` and `admin-web` can be rolled back independently.
- Build-time `VITE_*` values must be managed carefully per environment.
- Cloudflare/Wrangler configuration becomes part of the frontend deployment source of truth.
- If runtime configuration is needed later, it can be added with Worker logic without migrating hosting platforms.
