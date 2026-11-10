import { assertE2eDatabase } from './e2e-database';

export async function setup(): Promise<void> {
  try {
    await assertE2eDatabase();
  } catch {
    throw new Error('E2E database verification failed.');
  }
}
