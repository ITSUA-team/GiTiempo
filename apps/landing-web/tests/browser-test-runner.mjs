import { spawn } from 'node:child_process';

function runAgentBrowser(args, input) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn('agent-browser', args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (output) => process.stdout.write(output));
    child.stderr.on('data', (output) => process.stderr.write(output));
    child.once('error', rejectRun);
    child.once('close', (code) => {
      if (code === 0) {
        resolveRun();
      } else {
        rejectRun(new Error(`agent-browser exited with status ${code}.`));
      }
    });
    child.stdin.end(input);
  });
}

export function createBrowserTestRunner(name) {
  const sessionName = `${name}-${process.pid}`;
  let started = false;

  async function runBatch(commands) {
    started = true;

    await runAgentBrowser(
      ['--session-name', sessionName, 'batch', '--bail'],
      JSON.stringify(commands),
    );
  }

  async function close() {
    if (!started) return;

    try {
      await runAgentBrowser(['--session-name', sessionName, 'close']);
    } catch {
      // Preserve the browser-test result when cleanup cannot reach its daemon.
    }
  }

  return { runBatch, close };
}
