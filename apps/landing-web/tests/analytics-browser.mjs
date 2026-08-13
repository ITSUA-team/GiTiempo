import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const port = Number(process.env.LANDING_ANALYTICS_BROWSER_TEST_PORT ?? '4323');
const origin = `http://127.0.0.1:${port}`;
const consentKey = 'gitiempo.landing.analytics-consent.v1';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed.`);
  }
}

async function waitForPreview() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The static preview has not started yet.
    }

    await delay(250);
  }

  throw new Error(`Landing preview did not start at ${origin}.`);
}

function assertInBrowser(message, condition) {
  run('agent-browser', [
    'eval',
    `(() => { if (!(${condition})) throw new Error(${JSON.stringify(message)}); })()`,
  ]);
}

function resetConsent() {
  run('agent-browser', ['eval', `localStorage.removeItem(${JSON.stringify(consentKey)})`]);
  run('agent-browser', ['reload']);
  run('agent-browser', ['wait', '--load', 'networkidle']);
}

function setViewport(width, height) {
  run('agent-browser', ['set', 'viewport', String(width), String(height)]);
  run('agent-browser', ['reload']);
  run('agent-browser', ['wait', '--load', 'networkidle']);
}

run('pnpm', ['build'], {
  env: { ...process.env, PUBLIC_GA_MEASUREMENT_ID: 'G-TEST1234' },
});

const preview = spawn(
  'pnpm',
  ['exec', 'astro', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: process.cwd(), stdio: 'inherit' },
);

try {
  await waitForPreview();
  run('agent-browser', ['set', 'viewport', '1440', '1000']);
  run('agent-browser', ['open', `${origin}/?email=person%40example.com&utm_source=browser-test#ignored`]);
  run('agent-browser', ['network', 'route', 'https://www.googletagmanager.com/**', '--abort']);
  run('agent-browser', ['wait', '--load', 'networkidle']);
  resetConsent();

  assertInBrowser(
    'A first visit must show the consent prompt before loading Google.',
    "!document.querySelector('[data-analytics-consent-root]').hidden && !document.querySelector('script[data-gitiempo-ga4]')",
  );
  for (const [width, height] of [[1440, 1000], [1024, 900], [768, 900], [390, 844]]) {
    setViewport(width, height);
    assertInBrowser(
      `The ${width}px consent UI must remain visible, keyboard reachable, and free of horizontal overflow.`,
      "!document.querySelector('[data-analytics-consent-root]').hidden && document.documentElement.scrollWidth <= innerWidth && document.querySelector('[data-analytics-consent=\"deny\"]').getBoundingClientRect().width > 0 && document.querySelector('[data-analytics-consent=\"grant\"]').getBoundingClientRect().width > 0",
    );
  }
  run('agent-browser', ['focus', '[data-analytics-consent="deny"]']);
  run('agent-browser', ['press', 'Enter']);
  assertInBrowser(
    'Declining with the keyboard must persist the decision and hide the prompt.',
    `localStorage.getItem(${JSON.stringify(consentKey)}) === 'denied' && document.querySelector('[data-analytics-consent-root]').hidden`,
  );

  run('agent-browser', ['reload']);
  run('agent-browser', ['wait', '--load', 'networkidle']);
  assertInBrowser(
    'A returning visitor with declined consent must not see a loader or prompt.',
    "localStorage.getItem('gitiempo.landing.analytics-consent.v1') === 'denied' && document.querySelector('[data-analytics-consent-root]').hidden && !document.querySelector('script[data-gitiempo-ga4]')",
  );

  resetConsent();
  run('agent-browser', ['find', 'role', 'button', 'click', '--name', 'Allow analytics']);
  assertInBrowser(
    'Granting consent must configure one manual, sanitised page view and one GA loader.',
    "document.querySelectorAll('script[data-gitiempo-ga4]').length === 1 && Array.from(window.dataLayer).some((entry) => entry[0] === 'event' && entry[1] === 'page_view' && entry[2].page_location === 'http://127.0.0.1:4323/?utm_source=browser-test')",
  );

  run('agent-browser', [
    'eval',
    "(() => { const link = document.querySelector('[data-analytics-cta=\"hero\"][data-analytics-destination=\"user_app\"]'); link.addEventListener('click', (event) => event.preventDefault(), { capture: true, once: true }); link.click(); })()",
  ]);
  assertInBrowser(
    'A CTA click must emit the fixed landing metadata without delaying navigation.',
    "Array.from(window.dataLayer).some((entry) => entry[0] === 'event' && entry[1] === 'landing_cta_click' && entry[2].cta_location === 'hero' && entry[2].destination_app === 'user_app')",
  );

  run('agent-browser', ['eval', "document.querySelector('[data-analytics-settings]').click()"]);
  assertInBrowser('Analytics settings must reopen the prompt.', "!document.querySelector('[data-analytics-consent-root]').hidden");
  run('agent-browser', ['find', 'role', 'button', 'click', '--name', 'Decline']);
  run('agent-browser', [
    'eval',
    "(() => { const link = document.querySelector('[data-analytics-cta=\"hero\"][data-analytics-destination=\"admin_app\"]'); link.addEventListener('click', (event) => event.preventDefault(), { capture: true, once: true }); link.click(); })()",
  ]);
  assertInBrowser(
    'Withdrawing consent must deny storage, persist the decision, and stop later CTA events.',
    "localStorage.getItem('gitiempo.landing.analytics-consent.v1') === 'denied' && Array.from(window.dataLayer).some((entry) => entry[0] === 'consent' && entry[1] === 'update' && entry[2].analytics_storage === 'denied') && !Array.from(window.dataLayer).some((entry) => entry[0] === 'event' && entry[1] === 'landing_cta_click' && entry[2].destination_app === 'admin_app')",
  );
} finally {
  preview.kill('SIGTERM');
  run('agent-browser', ['network', 'unroute', 'https://www.googletagmanager.com/**']);
}
