import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

const script = new URL('./detect-ci-targets.mjs', import.meta.url);

function detectTargets(files, mode = 'ci') {
  const result = spawnSync(process.execPath, [script.pathname, mode], {
    encoding: 'utf8',
    input: files.join('\n'),
  });

  assert.equal(result.status, 0, result.stderr);

  const matrixLine = result.stdout
    .split('\n')
    .find((line) => line.startsWith('matrix='));

  assert.ok(matrixLine, 'expected the detector to emit a matrix');

  return JSON.parse(matrixLine.slice('matrix='.length)).include.map(
    ({ package_name }) => package_name,
  );
}

describe('CI target detection', () => {
  it('selects landing checks for landing source changes', () => {
    assert.deepEqual(
      detectTargets(['apps/landing-web/src/pages/index.astro']),
      ['landing-web'],
    );
  });

  it('selects landing checks when shared visual tokens change', () => {
    assert.deepEqual(
      detectTargets(['packages/web-config/src/styles/tokens.css']).sort(),
      ['@gitiempo/web-config', 'admin-web', 'landing-web', 'user-web'],
    );
  });

  it('selects landing checks for workspace manifest changes', () => {
    assert.ok(detectTargets(['pnpm-lock.yaml']).includes('landing-web'));
  });

  it('selects only landing checks for landing workflow changes', () => {
    assert.deepEqual(
      detectTargets(['.github/workflows/deploy-landing-staging.yml']),
      ['landing-web'],
    );
  });

  it('keeps landing out of the SPA deployment matrix', () => {
    assert.deepEqual(
      detectTargets(
        ['apps/landing-web/src/pages/index.astro'],
        'frontend-deploy',
      ),
      [],
    );
  });
});
