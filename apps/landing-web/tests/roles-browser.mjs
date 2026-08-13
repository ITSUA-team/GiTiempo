import { spawnSync } from 'node:child_process';

import { createBrowserTestRunner } from './browser-test-runner.mjs';
import { startStaticPreview } from './static-preview.mjs';

const browser = createBrowserTestRunner('landing-roles-browser');

function assertInBrowser(commands, message, condition) {
  commands.push([
    'eval',
    `(() => { if (!(${condition})) throw new Error(${JSON.stringify(message)}); })()`,
  ]);
}

function setViewport(commands, width, height) {
  commands.push(
    ['set', 'viewport', String(width), String(height)],
    ['reload'],
    ['wait', '--load', 'networkidle'],
  );
}

const buildResult = spawnSync('pnpm', ['build'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

if (buildResult.status !== 0) {
  throw new Error('pnpm build failed.');
}

const preview = await startStaticPreview();
const { origin } = preview;

try {
  const commands = [
    ['set', 'viewport', '1440', '1000'],
    ['open', origin],
    ['wait', '--load', 'networkidle'],
  ];
  assertInBrowser(
    commands,
    'Member must be the default desktop role.',
    "document.querySelector('#role-member').checked && getComputedStyle(document.querySelector('.role-panel--member')).display === 'flex'",
  );
  assertInBrowser(
    commands,
    'The 1440px desktop layout must not overflow horizontally.',
    'document.documentElement.scrollWidth <= innerWidth',
  );

  commands.push(
    ['snapshot', '-i', '-s', '.roles-interaction'],
    ['check', '#role-admin'],
  );
  assertInBrowser(
    commands,
    'Selecting Admin must reveal its information panel.',
    "document.querySelector('#role-admin').checked && getComputedStyle(document.querySelector('.role-panel--admin')).display === 'flex' && getComputedStyle(document.querySelector('.role-panel--member')).display === 'none'",
  );

  commands.push(
    ['focus', '#role-manager'],
    ['press', 'ArrowRight'],
  );
  assertInBrowser(
    commands,
    'The Admin role must be reachable with native radio keyboard navigation.',
    "document.activeElement.id === 'role-admin' && document.querySelector('#role-admin').checked",
  );

  setViewport(commands, 1024, 900);
  assertInBrowser(
    commands,
    'Desktop must show all three selectable roles without horizontal overflow.',
    "getComputedStyle(document.querySelector('.roles-interaction')).display === 'grid' && document.querySelectorAll('input[name=workspace-role]').length === 3 && document.documentElement.scrollWidth <= innerWidth",
  );

  for (const [width, height] of [[768, 900], [390, 844]]) {
    setViewport(commands, width, height);
    assertInBrowser(
      commands,
      `The ${width}px layout must stack all role cards without horizontal overflow.`,
      "getComputedStyle(document.querySelector('.roles-interaction')).display === 'none' && document.querySelectorAll('.roles-interaction + div article').length === 3 && document.documentElement.scrollWidth <= innerWidth",
    );
  }

  browser.runBatch(commands);
} finally {
  try {
    await preview.close();
  } finally {
    browser.close();
  }
}
