import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

if (process.env.E2E_DATABASE_GUARD_SENTINEL_FILE) {
  writeFileSync(process.env.E2E_DATABASE_GUARD_SENTINEL_FILE, 'collected');
}

describe('e2e database guard sentinel', () => {
  it('runs only after the global database guard', () => {
    expect(true).toBe(true);
  });
});
