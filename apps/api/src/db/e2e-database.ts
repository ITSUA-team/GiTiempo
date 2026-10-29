import { Client } from 'pg';

const SAFE_E2E_DATABASE_NAME =
  /^gitiempo_(?:e2e(?:_[a-z0-9]+)*|qa_live_import_[a-z0-9]+(?:_[a-z0-9]+)*)$/;
const DATABASE_CONNECTION_TIMEOUT_MS = 5_000;

type DatabaseClient = {
  connect(): Promise<unknown>;
  end(): Promise<void>;
  query<T extends Record<string, unknown>>(sql: string): Promise<{ rows: T[] }>;
};

type DatabaseClientFactory = (connectionString: string) => DatabaseClient;

export type E2eDatabaseEnvironment = Partial<
  Pick<NodeJS.ProcessEnv, 'DATABASE_URL' | 'E2E_DATABASE_NAME' | 'NODE_ENV'>
>;

function configuredDatabaseName(databaseUrl: string): string {
  try {
    const parsedUrl = new URL(databaseUrl);
    if (
      parsedUrl.protocol !== 'postgres:' &&
      parsedUrl.protocol !== 'postgresql:'
    ) {
      throw new Error('invalid protocol');
    }
    return decodeURIComponent(parsedUrl.pathname.slice(1));
  } catch {
    throw new Error(
      'DATABASE_URL must be a valid PostgreSQL URL for E2E tests.',
    );
  }
}

function assertSafeDatabaseName(name: string): void {
  if (!SAFE_E2E_DATABASE_NAME.test(name)) {
    throw new Error(
      'Unsafe E2E database. Use an isolated gitiempo_e2e or gitiempo_qa_live_import_<suffix> database.',
    );
  }
}

export async function assertE2eDatabase(
  environment: E2eDatabaseEnvironment = process.env,
  createClient: DatabaseClientFactory = (connectionString) =>
    new Client({
      connectionString,
      connectionTimeoutMillis: DATABASE_CONNECTION_TIMEOUT_MS,
    }),
): Promise<string> {
  if (environment.NODE_ENV !== 'test') {
    throw new Error('E2E database checks require NODE_ENV=test.');
  }

  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for E2E tests.');
  }

  const configuredName = configuredDatabaseName(databaseUrl);
  assertSafeDatabaseName(configuredName);

  const expectedName = environment.E2E_DATABASE_NAME;
  if (expectedName) {
    assertSafeDatabaseName(expectedName);
    if (expectedName !== configuredName) {
      throw new Error('DATABASE_URL does not match E2E_DATABASE_NAME.');
    }
  }

  const client = createClient(databaseUrl);
  try {
    await client.connect();
    const result = await client.query<{ name: string }>(
      'SELECT current_database() AS name',
    );
    const actualName = result.rows[0]?.name;
    if (!actualName) {
      throw new Error('Could not determine the connected E2E database.');
    }
    assertSafeDatabaseName(actualName);
    if (
      actualName !== configuredName ||
      (expectedName && actualName !== expectedName)
    ) {
      throw new Error(
        'Connected database does not match the configured E2E database.',
      );
    }
    return actualName;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const name = await assertE2eDatabase();
  console.log(`E2E database verified: ${name}`);
}

if (process.argv[1]?.endsWith('e2e-database.ts')) {
  main().catch(() => {
    console.error('[e2e-database] database verification failed.');
    process.exit(1);
  });
}
