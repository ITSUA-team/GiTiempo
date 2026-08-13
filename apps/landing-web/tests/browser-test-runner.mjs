import { spawnSync } from 'node:child_process';

function writeFailureOutput(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

export function createBrowserTestRunner(name) {
  const sessionName = `${name}-${process.pid}`;
  let started = false;

  function runBatch(commands) {
    started = true;

    const result = spawnSync('agent-browser', ['--session-name', sessionName, 'batch', '--bail'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      input: JSON.stringify(commands),
    });

    if (result.status !== 0) {
      writeFailureOutput(result);
      throw new Error('agent-browser batch failed.');
    }
  }

  function close() {
    if (!started) return;

    spawnSync('agent-browser', ['--session-name', sessionName, 'close'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
  }

  return { runBatch, close };
}
