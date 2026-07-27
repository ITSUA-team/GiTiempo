---
name: astro
description: Skill for building with the Astro web framework. Helps create Astro components and pages, configure SSR adapters, set up content collections, deploy static sites, and manage project structure and CLI commands. Use when the user needs to work with Astro, mentions .astro files, asks about static site generation (SSG), islands architecture, content collections, or deploying an Astro project.
license: MIT
metadata:
  authors: "Astro Team"
  version: "0.0.1"
---

# Astro Usage Guide

**Always consult [docs.astro.build](https://docs.astro.build) for code examples and latest API.**

Astro is the web framework for content-driven websites.

## Quick Reference

### File Location

The CLI looks for `astro.config.js`, `astro.config.mjs`, `astro.config.cjs`, and `astro.config.ts` in `./`. Use `--config` for a custom path.

### CLI Commands

- `npx astro dev` — start the development server.
- `npx astro build` — build the project and write it to disk.
- `npx astro check` — check the project for errors.
- `npx astro add` — add an integration.
- `npx astro sync` — generate TypeScript types for Astro modules.

Re-run `astro sync` after adding or changing plugins.

## Project Structure

Reference the [project structure docs](https://docs.astro.build/en/basics/project-structure).

- `src/*` — project source code (components, pages, styles, images, etc.).
- `src/pages` — required route definitions.
- `src/components` — reusable components (convention, not required).
- `src/layouts` — layout components (convention, not required).
- `src/styles` — global CSS and preprocessor files (convention, not required).
- `public/*` — unprocessed assets copied as-is to the build output.
- `package.json` — project manifest.
- `astro.config.{js,mjs,cjs,ts}` — Astro configuration (recommended).
- `tsconfig.json` — TypeScript configuration (recommended).

## Core Configuration

`site` is the final deployed URL; Astro uses it for canonical URLs, sitemaps, and integrations.

```ts
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://example.com',
});
```

## Common Workflows

### Create a Basic Page

Add a file to `src/pages/`; the filename becomes the route:

```astro
---
// src/pages/index.astro
const title = 'Hello, Astro!';
---
<html>
  <head><title>{title}</title></head>
  <body><h1>{title}</h1></body>
</html>
```

### Create a Component

```astro
---
// src/components/Card.astro
const { title, body } = Astro.props;
---
<div class="card">
  <h2>{title}</h2>
  <p>{body}</p>
</div>
```

### Deploy with an Adapter

1. Add the adapter: `npx astro add vercel --yes` (or `node`, `cloudflare`, `netlify`).
2. Run `npx astro check` before building.
3. Run `npx astro build` to produce the deployment artifact.
4. Verify that `dist/` exists and is non-empty.
5. Deploy according to the adapter's documentation.

## Adapters

Use an adapter for on-demand rendering on a serverless, edge, or Node host.

- Node: `npx astro add node --yes`
- Cloudflare: `npx astro add cloudflare --yes`
- Netlify: `npx astro add netlify --yes`
- Vercel: `npx astro add vercel --yes`

See the [community adapter directory](https://astro.build/integrations/2/?search=&categories%5B%5D=adapters) for other options.

## Resources

- [Astro documentation](https://docs.astro.build)
- [Configuration reference](https://docs.astro.build/en/reference/configuration-reference/)
- [Astro llms.txt](https://docs.astro.build/llms.txt)
- [Astro GitHub](https://github.com/withastro/astro)
