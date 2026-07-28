import { spawn, spawnSync } from 'node:child_process';

const tailwind = spawn(
  'pnpm',
  ['exec', 'tailwindcss', '-i', 'src/styles/global.css', '-o', 'public/landing.css', '--watch=always'],
  { stdio: 'inherit' },
);
const astro = spawn('pnpm', ['exec', 'astro', 'dev', '--port', '4321', '--strictPort'], {
  stdio: 'inherit',
  // Astro starts detached when it detects an agent. Keep it foregrounded so this
  // script can supervise Astro and the Tailwind watcher together.
  env: { ...process.env, ASTRO_DEV_BACKGROUND: '1' },
});

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  tailwind.kill('SIGTERM');
  spawnSync('pnpm', ['exec', 'astro', 'dev', 'stop'], { stdio: 'inherit' });
  process.exit(exitCode);
}

for (const processSignal of ['SIGINT', 'SIGTERM']) {
  process.on(processSignal, () => stop());
}

tailwind.on('exit', (code) => stop(code ?? 1));
astro.on('exit', (code) => {
  if (code !== 0) stop(code ?? 1);
});
