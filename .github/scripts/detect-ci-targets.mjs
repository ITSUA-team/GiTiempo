#!/usr/bin/env node

import { appendFileSync, readFileSync } from 'node:fs';

const ALL_PACKAGES = [
  {
    appName: 'api',
    appPath: 'apps/api',
    packageName: '@gitiempo/api',
    runBuild: false,
    runApiE2e: true,
  },
  {
    appName: 'user-web',
    appPath: 'apps/user-web',
    packageName: 'user-web',
    runBuild: true,
    runApiE2e: false,
  },
  {
    appName: 'admin-web',
    appPath: 'apps/admin-web',
    packageName: 'admin-web',
    runBuild: true,
    runApiE2e: false,
  },
  {
    appName: 'landing-web',
    appPath: 'apps/landing-web',
    packageName: 'landing-web',
    runBuild: true,
    runApiE2e: false,
  },
  {
    appName: 'shared',
    appPath: 'packages/shared',
    packageName: '@gitiempo/shared',
    runBuild: true,
    runApiE2e: false,
  },
  {
    appName: 'web-shared',
    appPath: 'packages/web-shared',
    packageName: '@gitiempo/web-shared',
    runBuild: true,
    runApiE2e: false,
  },
  {
    appName: 'web-config',
    appPath: 'packages/web-config',
    packageName: '@gitiempo/web-config',
    runBuild: true,
    runApiE2e: false,
  },
];

const FRONTEND_APPS = ALL_PACKAGES.filter(({ appName }) =>
  ['user-web', 'admin-web'].includes(appName),
);

const LANDING_DEPLOY_PATHS = ['.github/workflows/deploy-landing-staging.yml'];

const mode = process.argv[2] ?? 'ci';
const files = readFileSync(0, 'utf8')
  .split('\n')
  .map((file) => file.trim())
  .filter(Boolean);

const targets = new Map();

function addPackage(packageName, overrides = {}) {
  const target = ALL_PACKAGES.find(
    (candidate) => candidate.packageName === packageName,
  );

  if (!target) {
    throw new Error(`Unknown package: ${packageName}`);
  }

  const existing = targets.get(packageName);
  targets.set(packageName, {
    ...target,
    ...existing,
    ...overrides,
    runBuild: Boolean(
      existing?.runBuild || overrides.runBuild || target.runBuild,
    ),
    runApiE2e: Boolean(
      existing?.runApiE2e || overrides.runApiE2e || target.runApiE2e,
    ),
  });
}

function addAllPackages() {
  for (const target of ALL_PACKAGES) {
    addPackage(target.packageName);
  }
}

function hasPath(prefix) {
  return files.some((file) => file === prefix || file.startsWith(`${prefix}/`));
}

function hasAnyPath(prefixes) {
  return prefixes.some((prefix) => hasPath(prefix));
}

function hasWorkspaceWideChange() {
  const exactMatches = new Set([
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'turbo.json',
  ]);

  return files.some(
    (file) =>
      exactMatches.has(file) ||
      file.startsWith('.github/actions/') ||
      file.startsWith('.github/scripts/') ||
      file === '.github/workflows/ci.yml',
  );
}

function detectCiTargets() {
  if (hasWorkspaceWideChange()) {
    addAllPackages();
    return;
  }

  if (
    hasAnyPath([
      'apps/api',
      'deploy/api',
      'scripts/api-e2e-docker.sh',
      'scripts/api-smoke-docker.sh',
      '.dockerignore',
      '.github/workflows/deploy-api.yml',
    ])
  ) {
    addPackage('@gitiempo/api');
  }

  if (hasPath('apps/user-web')) {
    addPackage('user-web');
  }

  if (hasPath('apps/admin-web')) {
    addPackage('admin-web');
  }

  if (hasPath('apps/landing-web') || hasAnyPath(LANDING_DEPLOY_PATHS)) {
    addPackage('landing-web');
  }

  if (hasPath('packages/shared')) {
    addPackage('@gitiempo/shared');
    addPackage('@gitiempo/api');
    addPackage('user-web');
    addPackage('admin-web');
  }

  if (hasPath('packages/web-shared')) {
    addPackage('@gitiempo/web-shared');
    addPackage('user-web');
    addPackage('admin-web');
  }

  if (hasPath('packages/web-config')) {
    addPackage('@gitiempo/web-config');
    addPackage('user-web');
    addPackage('admin-web');
    addPackage('landing-web');
  }
}

function detectFrontendDeployTargets() {
  const requestedTarget = process.env.FRONTEND_TARGET ?? '';

  if (requestedTarget === 'both') {
    for (const target of FRONTEND_APPS) {
      addPackage(target.packageName);
    }
    return;
  }

  if (requestedTarget === 'user-web' || requestedTarget === 'admin-web') {
    addPackage(requestedTarget);
    return;
  }

  if (
    hasWorkspaceWideChange() ||
    hasAnyPath([
      'packages/shared',
      'packages/web-config',
      'packages/web-shared',
    ])
  ) {
    for (const target of FRONTEND_APPS) {
      addPackage(target.packageName);
    }
    return;
  }

  if (hasPath('apps/user-web')) {
    addPackage('user-web');
  }

  if (hasPath('apps/admin-web')) {
    addPackage('admin-web');
  }
}

function formatMatrixTarget(target) {
  return {
    app_name: target.appName,
    app_path: target.appPath,
    package_name: target.packageName,
    run_build: String(target.runBuild),
    run_api_e2e: String(target.runApiE2e),
  };
}

function writeOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }

  console.log(`${name}=${value}`);
}

if (mode === 'ci') {
  detectCiTargets();
} else if (mode === 'frontend-deploy') {
  detectFrontendDeployTargets();
} else {
  throw new Error(`Unknown mode: ${mode}`);
}

const include = Array.from(targets.values()).map(formatMatrixTarget);
const matrix = JSON.stringify({ include });

writeOutput('has_targets', String(include.length > 0));
writeOutput('matrix', matrix);
