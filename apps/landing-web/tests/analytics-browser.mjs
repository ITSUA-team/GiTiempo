import { spawnSync } from 'node:child_process';

import { createBrowserTestRunner } from './browser-test-runner.mjs';
import { startStaticPreview } from './static-preview.mjs';

const consentKey = 'gitiempo.landing.analytics-consent.v1';
const browser = createBrowserTestRunner('landing-analytics-browser');

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

function assertInBrowser(commands, message, condition) {
  commands.push([
    'eval',
    `(() => { if (!(${condition})) throw new Error(${JSON.stringify(message)}); })()`,
  ]);
}

function resetConsent(commands) {
  commands.push(
    ['eval', `localStorage.removeItem(${JSON.stringify(consentKey)})`],
    ['reload'],
    ['wait', '--load', 'networkidle'],
  );
}

function setViewport(commands, width, height) {
  commands.push(
    ['set', 'viewport', String(width), String(height)],
    ['reload'],
    ['wait', '--load', 'networkidle'],
  );
}

run('pnpm', ['build'], {
  env: { ...process.env, PUBLIC_GA_MEASUREMENT_ID: 'G-TEST1234' },
});

const preview = await startStaticPreview();
const { origin } = preview;

try {
  const commands = [
    ['open'],
    ['network', 'route', 'https://www.googletagmanager.com/**', '--abort'],
    ['set', 'viewport', '1440', '1000'],
    ['navigate', `${origin}/?email=person%40example.com&utm_source=browser-test#ignored`],
    ['wait', '--load', 'networkidle'],
  ];
  resetConsent(commands);

  assertInBrowser(
    commands,
    'A first visit must show the consent prompt before loading Google.',
    "!document.querySelector('[data-analytics-consent-root]').hidden && !document.querySelector('script[data-gitiempo-ga4]')",
  );
  for (const [width, height] of [[1440, 1000], [1024, 900], [768, 900], [390, 844]]) {
    setViewport(commands, width, height);
    assertInBrowser(
      commands,
      `The ${width}px consent UI must remain visible, keyboard reachable, and free of horizontal overflow.`,
      "!document.querySelector('[data-analytics-consent-root]').hidden && document.documentElement.scrollWidth <= innerWidth && document.querySelector('[data-analytics-consent=\"deny\"]').getBoundingClientRect().width > 0 && document.querySelector('[data-analytics-consent=\"grant\"]').getBoundingClientRect().width > 0",
    );
  }
  commands.push(
    ['focus', '[data-analytics-consent="deny"]'],
    ['press', 'Enter'],
  );
  assertInBrowser(
    commands,
    'Declining with the keyboard must persist the decision and hide the prompt.',
    `localStorage.getItem(${JSON.stringify(consentKey)}) === 'denied' && document.querySelector('[data-analytics-consent-root]').hidden`,
  );

  commands.push(
    ['reload'],
    ['wait', '--load', 'networkidle'],
  );
  assertInBrowser(
    commands,
    'A returning visitor with declined consent must not see a loader or prompt.',
    "localStorage.getItem('gitiempo.landing.analytics-consent.v1') === 'denied' && document.querySelector('[data-analytics-consent-root]').hidden && !document.querySelector('script[data-gitiempo-ga4]')",
  );

  resetConsent(commands);
  commands.push(['find', 'role', 'button', 'click', '--name', 'Allow analytics']);
  assertInBrowser(
    commands,
    'Granting consent must configure one manual, sanitised page view and one GA loader.',
    `(() => {
      const events = Array.from(window.dataLayer).filter((entry) => entry[0] === 'event');
      const pageViews = events.filter((entry) => entry[1] === 'page_view');
      return document.querySelectorAll('script[data-gitiempo-ga4]').length === 1
        && events.length === 1
        && pageViews.length === 1
        && Object.keys(pageViews[0][2]).sort().join(',') === 'page_location,page_title'
        && pageViews[0][2].page_location === ${JSON.stringify(`${origin}/?utm_source=browser-test`)};
    })()`,
  );

  commands.push([
    'eval',
    "(() => { const link = document.querySelector('[data-analytics-cta=\"hero\"][data-analytics-destination=\"user_app\"]'); link.addEventListener('click', (event) => event.preventDefault(), { capture: true, once: true }); link.click(); })()",
  ]);
  assertInBrowser(
    commands,
    'A CTA click must emit the fixed landing metadata without delaying navigation.',
    `(() => {
      const events = Array.from(window.dataLayer).filter((entry) => entry[0] === 'event');
      const ctaEvents = events.filter((entry) => entry[1] === 'landing_cta_click');
      return events.length === 2
        && ctaEvents.length === 1
        && Object.keys(ctaEvents[0][2]).sort().join(',') === 'cta_location,destination_app'
        && ctaEvents[0][2].cta_location === 'hero'
        && ctaEvents[0][2].destination_app === 'user_app';
    })()`,
  );

  commands.push(['eval', "document.querySelector('[data-analytics-settings]').click()"]);
  assertInBrowser(commands, 'Analytics settings must reopen the prompt.', "!document.querySelector('[data-analytics-consent-root]').hidden");
  commands.push(
    ['find', 'role', 'button', 'click', '--name', 'Decline'],
    [
    'eval',
    "(() => { const link = document.querySelector('[data-analytics-cta=\"hero\"][data-analytics-destination=\"admin_app\"]'); link.addEventListener('click', (event) => event.preventDefault(), { capture: true, once: true }); link.click(); })()",
    ],
  );
  assertInBrowser(
    commands,
    'Withdrawing consent must deny storage, persist the decision, and stop later CTA events.',
    "localStorage.getItem('gitiempo.landing.analytics-consent.v1') === 'denied' && Array.from(window.dataLayer).some((entry) => entry[0] === 'consent' && entry[1] === 'update' && entry[2].analytics_storage === 'denied') && !Array.from(window.dataLayer).some((entry) => entry[0] === 'event' && entry[1] === 'landing_cta_click' && entry[2].destination_app === 'admin_app')",
  );

  commands.push(['network', 'unroute', 'https://www.googletagmanager.com/**']);
  browser.runBatch(commands);
} finally {
  try {
    await preview.close();
  } finally {
    browser.close();
  }
}
