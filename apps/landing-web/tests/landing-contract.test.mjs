import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { getPublicConfig } from '../src/lib/public-config.mjs';

const appRoot = fileURLToPath(new URL('..', import.meta.url));

function source(path) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

function markup(path) {
  return source(path).replace(/^---[\s\S]*?---\n/, '');
}

test('accepts complete public app entry URLs', () => {
  assert.deepEqual(
    getPublicConfig({
      PUBLIC_SITE_URL: 'https://gitiempo-landing.itsua.dev',
      PUBLIC_USER_APP_URL: 'https://gitiempo.itsua.dev/login',
      PUBLIC_ADMIN_APP_URL: 'https://gitiempo-admin.itsua.dev',
    }),
    {
      siteUrl: 'https://gitiempo-landing.itsua.dev/',
      userAppUrl: 'https://gitiempo.itsua.dev/login',
      adminAppUrl: 'https://gitiempo-admin.itsua.dev/',
    },
  );
});

test('rejects invalid public URLs with the failing variable name', () => {
  assert.throws(
    () =>
      getPublicConfig({
        PUBLIC_SITE_URL: 'not-a-url',
        PUBLIC_USER_APP_URL: 'https://gitiempo.itsua.dev/login',
        PUBLIC_ADMIN_APP_URL: 'https://gitiempo-admin.itsua.dev',
      }),
    /PUBLIC_SITE_URL/,
  );
});

test('page preserves the approved section order and direct-entry CTA labels', () => {
  const page = source('../src/pages/index.astro');
  const hero = markup('../src/components/Hero.astro');
  const finalCta = markup('../src/components/FinalCta.astro');
  const navigation = markup('../src/components/Navigation.astro');

  assert.ok(page.indexOf('<Hero') < page.indexOf('<ProductBenefits'));
  assert.ok(page.indexOf('<ProductBenefits') < page.indexOf('<WorkflowSteps'));
  assert.ok(page.indexOf('<WorkflowSteps') < page.indexOf('<Roles'));
  assert.ok(page.indexOf('<Roles') < page.indexOf('<MvpScope'));
  assert.ok(page.indexOf('<MvpScope') < page.indexOf('<Faq'));
  assert.ok(page.indexOf('<Faq') < page.indexOf('<FinalCta'));
  assert.match(hero, /Start tracking now/);
  assert.match(finalCta, /Start tracking now/);
  assert.match(navigation, /Start tracking/);
  assert.match(hero, /Open admin workspace/);
  assert.match(finalCta, /Open admin workspace/);
  assert.doesNotMatch(`${hero}${finalCta}${navigation}`, /<a[^>]*>(?:(?!<\/a>)[\s\S])*preview/i);
  assert.match(navigation, /size-7 place-items-center rounded-\[6px\] bg-brand/);
  assert.match(navigation, /aria-hidden="true">G<\/span>/);
  assert.match(navigation, /<span>GITiempo<\/span>/);
});

test('page keeps required anchors, semantic foundations, and no hydrated islands', () => {
  const page = source('../src/pages/index.astro');
  const layout = source('../src/layouts/BaseLayout.astro');
  const product = source('../src/components/ProductBenefits.astro');
  const workflow = source('../src/components/WorkflowSteps.astro');
  const roles = source('../src/components/Roles.astro');
  const roleCard = source('../src/components/RoleCard.astro');
  const faq = source('../src/components/Faq.astro');
  const appSources = [page, layout, product, workflow, roles, roleCard, faq];

  assert.match(product, /id="product"/);
  assert.match(product, /id="github-workflow"/);
  assert.match(workflow, /id="how-it-works"/);
  assert.match(faq, /id="faq"/);
  assert.match(page, /<main id="main-content">/);
  assert.match(layout, /Skip to main content/);
  assert.match(layout, /rel="canonical"/);
  assert.equal(appSources.flatMap((value) => value.match(/client:/g) ?? []).length, 0);
  assert.equal((source('../src/components/Hero.astro').match(/<h1/g) ?? []).length, 1);
});

test('active preview timers are the only approved framework-free browser script', () => {
  const layout = source('../src/layouts/BaseLayout.astro');
  const dashboard = markup('../src/components/DashboardPreview.astro');
  const product = markup('../src/components/ProductBenefits.astro');

  assert.equal((dashboard.match(/data-live-timer/g) ?? []).length, 2);
  assert.equal((product.match(/data-live-timer/g) ?? []).length, 1);
  assert.match(layout, /prefers-reduced-motion: reduce/);
  assert.match(layout, /window\.setInterval/);
  assert.equal((layout.match(/<script>/g) ?? []).length, 1);
});

test('switches desktop role details with native radio controls', () => {
  const roles = markup('../src/components/Roles.astro');
  const roleCard = source('../src/components/RoleCard.astro');

  assert.match(roles, /type="radio"/);
  assert.match(roles, /name="workspace-role"/);
  assert.match(roleCard, /role-panel--\$\{role\.id\}/);
  assert.match(roleCard, /variantClasses/);
  assert.match(roles, /:has\(#role-member:checked\)/);
  assert.match(roles, /:has\(#role-manager:checked\)/);
  assert.match(roles, /:has\(#role-admin:checked\)/);
});

test('the Admin role is available and disabled scope cards remain absent from source data', () => {
  const content = source('../src/data/content.ts');
  assert.match(content, /label: 'Admin'/);
  assert.match(content, /RUN THE WORKSPACE/);
  assert.doesNotMatch(content, /Reports\s*\+\s*Invoices/i);
  assert.match(content, /WEB \+ EXTENSION/);
  assert.match(content, /Start where work happens/);
  assert.ok(appRoot.endsWith('/apps/landing-web/'));
});

test('scope cards reveal their panel treatment only on hover', () => {
  const scope = markup('../src/components/MvpScope.astro');

  assert.match(scope, /border-transparent bg-transparent/);
  assert.match(scope, /hover:border-landing-purple-border/);
  assert.match(scope, /hover:bg-landing-purple-panel/);
  assert.doesNotMatch(scope, /card\.variant/);
  assert.doesNotMatch(scope, /cursor-pointer/);
});

test('self-hosts the approved landing typefaces', () => {
  const styles = source('../src/styles/global.css');
  const fontBuild = source('../scripts/build-css.mjs');

  assert.equal((styles.match(/@font-face/g) ?? []).length, 3);
  assert.match(styles, /\/fonts\/inter-latin-wght-normal\.woff2/);
  assert.match(styles, /\/fonts\/ibm-plex-mono-latin-400-normal\.woff2/);
  assert.match(styles, /\/fonts\/ibm-plex-mono-latin-700-normal\.woff2/);
  assert.match(fontBuild, /@fontsource-variable\/inter\/files/);
  assert.match(fontBuild, /@fontsource\/ibm-plex-mono\/files/);
});

test('provides crawl guidance and a static sitemap', () => {
  const robots = source('../src/pages/robots.txt.ts');
  const sitemap = source('../src/pages/sitemap-index.xml.ts');
  const favicon = source('../public/favicon.svg');

  assert.match(robots, /sitemap-index\.xml/);
  assert.match(sitemap, /PUBLIC_SITE_URL/);
  assert.match(sitemap, /<urlset/);
  assert.match(favicon, />G<\/text>/);
  assert.doesNotMatch(favicon, /M18 16h28/);
});
