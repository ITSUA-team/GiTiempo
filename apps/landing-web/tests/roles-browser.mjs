import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const port = Number(process.env.LANDING_BROWSER_TEST_PORT ?? '4322');
const origin = `http://localhost:${port}`;

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
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

function setViewport(width, height) {
  run('agent-browser', ['set', 'viewport', String(width), String(height)]);
  run('agent-browser', ['reload']);
  run('agent-browser', ['wait', '--load', 'networkidle']);
}

run('pnpm', ['build']);

const preview = spawn('pnpm', ['exec', 'astro', 'preview', '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: 'ignore',
});

try {
  await waitForPreview();

  run('agent-browser', ['set', 'viewport', '1440', '1000']);
  run('agent-browser', ['open', origin]);
  run('agent-browser', ['wait', '--load', 'networkidle']);
  assertInBrowser(
    'Member must be the default desktop role.',
    "document.querySelector('#role-member').checked && getComputedStyle(document.querySelector('.role-panel--member')).display === 'flex'",
  );

  run('agent-browser', ['snapshot', '-i', '-s', '.roles-interaction']);
  run('agent-browser', ['check', '#role-admin']);
  assertInBrowser(
    'Selecting Admin must reveal its information panel.',
    "document.querySelector('#role-admin').checked && getComputedStyle(document.querySelector('.role-panel--admin')).display === 'flex' && getComputedStyle(document.querySelector('.role-panel--member')).display === 'none'",
  );

  run('agent-browser', ['focus', '#role-manager']);
  run('agent-browser', ['press', 'ArrowRight']);
  assertInBrowser(
    'The Admin role must be reachable with native radio keyboard navigation.',
    "document.activeElement.id === 'role-admin' && document.querySelector('#role-admin').checked",
  );

  setViewport(1024, 900);
  assertInBrowser(
    'Desktop must show all three selectable roles without horizontal overflow.',
    "getComputedStyle(document.querySelector('.roles-interaction')).display === 'grid' && document.querySelectorAll('input[name=workspace-role]').length === 3 && document.documentElement.scrollWidth <= innerWidth",
  );

  for (const [width, height] of [[768, 900], [390, 844]]) {
    setViewport(width, height);
    assertInBrowser(
      `The ${width}px layout must stack all role cards without horizontal overflow.`,
      "getComputedStyle(document.querySelector('.roles-interaction')).display === 'none' && document.querySelectorAll('.roles-interaction + div article').length === 3 && document.documentElement.scrollWidth <= innerWidth",
    );
  }
} finally {
  preview.kill('SIGTERM');
}
