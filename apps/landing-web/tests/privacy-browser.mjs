import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { createBrowserTestRunner } from './browser-test-runner.mjs';
import { startStaticPreview } from './static-preview.mjs';

const browser = createBrowserTestRunner('landing-privacy-browser');
const siteUrl = 'https://privacy-test.example.invalid';
const screenshotDirectory = process.env.PRIVACY_SCREENSHOT_DIR;
if (screenshotDirectory) await mkdir(screenshotDirectory, { recursive: true });

try {
  for (const measurementId of ['', 'G-TEST1234']) {
    const build = spawnSync('pnpm', ['build'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PUBLIC_SITE_URL: siteUrl,
        PUBLIC_PRIVACY_CONTROLLER_NAME: 'Privacy route test',
        PUBLIC_PRIVACY_CONTACT_EMAIL: 'privacy@example.invalid',
        PUBLIC_GA_MEASUREMENT_ID: measurementId,
      },
    });
    assert.equal(build.status, 0, 'The policy must build with analytics enabled or disabled.');
    const policy = await readFile('dist/privacy/index.html', 'utf8');
    assert.match(await readFile('dist/index.html', 'utf8'), /href="\/privacy"/);
    assert.doesNotMatch(policy, /<script\b|<astro-island\b|data-analytics-consent-root|data-live-timer/);
    assert.match(policy, /Privacy route test/);
    assert.match(policy, /mailto:privacy@example.invalid/);
    assert.match(policy, /rel="canonical" href="https:\/\/privacy-test.example.invalid\/privacy\/?"/);
    assert.doesNotMatch(policy, /noindex/);
    assert.match(await readFile('dist/sitemap-index.xml', 'utf8'), /<loc>https:\/\/privacy-test.example.invalid\/privacy\/?<\/loc>/);

    const preview = await startStaticPreview();
    try {
      assert.equal((await fetch(`${preview.origin}/privacy`)).status, 200);
      assert.equal((await fetch(`${preview.origin}/privacy/`)).status, 200);
      const commands = [
        ['open', `${preview.origin}/privacy`],
        ['wait', '--load', 'networkidle'],
        ['eval', `(() => {
          if (document.querySelectorAll('h1').length !== 1 || document.querySelectorAll('h2').length !== 8) throw new Error('Policy heading order changed at ' + location.href + ': ' + document.querySelectorAll('h1').length + '/' + document.querySelectorAll('h2').length);
          if (document.querySelector('h3,h4,h5,h6,script,astro-island')) throw new Error('Unexpected heading or runtime');
          if (!document.querySelector('a[href="mailto:privacy@example.invalid"]')) throw new Error('Privacy contact missing');
          if (document.querySelector('footer a').getAttribute('aria-current') !== 'page') throw new Error('Current page missing');
        })()`],
      ];
      for (const width of [390, 768, 1024, 1440]) {
        commands.push(
          ['set', 'viewport', String(width), '1000'],
          ['navigate', `${preview.origin}/privacy`],
          ['wait', '--load', 'networkidle'],
          ['eval', `(() => {
            if (innerWidth !== ${width}) throw new Error('Viewport was not set to ${width}px');
            if (document.documentElement.scrollWidth > innerWidth) throw new Error('Horizontal overflow at ${width}px');
            for (const p of document.querySelectorAll('article p:not(.eyebrow), article li')) {
              if (parseFloat(getComputedStyle(p).fontSize) < 14) throw new Error('Unreadable body size');
            }
          })()`],
          ['press', 'Tab'],
          ['eval', `(() => {
            if (document.activeElement.getAttribute('href') !== '#main-content') throw new Error('Tab must reach the visible skip link first');
          })()`],
          ['press', 'Enter'],
          ['eval', `(() => {
            if (location.hash !== '#main-content') throw new Error('Enter must activate the skip link');
          })()`],
          ['eval', "document.querySelector('a[href=\"#main-content\"]').focus()"],
          ['eval', `(() => {
            if (document.activeElement.getAttribute('href') !== '#main-content') throw new Error('Skip link must be first');
            const r = document.activeElement.getBoundingClientRect();
            if (r.top < 0 || r.bottom > innerHeight) throw new Error('Focused skip link is hidden');
          })()`],
          ['eval', "document.querySelector('a[href=\"mailto:privacy@example.invalid\"]').focus()"],
          ['eval', `(() => {
            if (!document.activeElement.matches(':focus-visible')) throw new Error('Contact keyboard focus missing');
          })()`],
        );
        if (screenshotDirectory && measurementId) commands.push(['screenshot', '--full', resolve(screenshotDirectory, `privacy-${width}.png`)]);
      }
      commands.push(
        ['eval', "(() => { if (document.querySelector('header a[href=\"/\"]').href !== location.origin + '/') throw new Error('Homepage navigation missing'); })()"],
        ['navigate', preview.origin],
        ['wait', '--load', 'networkidle'],
        ['eval', `(() => { if (!!document.querySelector('[data-analytics-settings]') !== ${Boolean(measurementId)}) throw new Error('Homepage analytics configuration mismatch'); })()`],
      );
      await browser.runBatch(commands);
    } finally {
      await preview.close();
    }
  }
} finally {
  await browser.close();
}
