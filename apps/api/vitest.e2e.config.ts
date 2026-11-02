import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

process.env.INVITES_EMAIL_CONSOLE_FALLBACK = 'true';
process.env.INVITES_EMAIL_CONSOLE_FALLBACK_SHOW_SECRETS = 'false';

/**
 * E2E tests run against an isolated Postgres database named `gitiempo_e2e`.
 * `e2e:prepare` verifies database identity before migrations and seed data;
 * this global setup verifies it before test files are collected.
 */
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    environment: 'node',
    globalSetup: ['./src/db/e2e-database.global-setup.ts'],
    // E2E suites talk to a real DB and must run sequentially across files
    // to avoid stepping on each other's data.
    fileParallelism: false,
    pool: 'forks',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    alias: {
      src: resolve(__dirname, './src'),
    },
  },
});
