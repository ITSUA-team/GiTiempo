import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray, sql } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  getPostgresError,
  POSTGRES_UNIQUE_VIOLATION,
} from '../src/db/postgres-errors';
import {
  projects,
  taskExternalRefs,
  tasks,
  timeEntries,
} from '../src/db/schema';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';

/**
 * Upgrade test for the destructive 0015 data migration: it must merge
 * case-duplicate GitHub issue refs without losing time entries, and the
 * outcome must not depend on how the rows' random UUIDs happen to compare.
 * The suite recreates the pre-0015 state (raw-key unique index dropped,
 * historical duplicate/alias rows present), replays the migration file, and
 * verifies every scenario in both UUID orderings.
 */

const MIGRATION_PATH = join(
  process.cwd(),
  'drizzle/0015_dedup_github_issue_casing.sql',
);
const UNIQUE_INDEX_NAME = 'task_external_refs_workspace_provider_key_unique';
const RESTORE_UNIQUE_INDEX_SQL = `CREATE UNIQUE INDEX IF NOT EXISTS "${UNIQUE_INDEX_NAME}" ON "task_external_refs" USING btree ("workspace_id","provider","external_type",lower("external_key"))`;

// UUIDs at the extremes of sort order, so each scenario can pin whether the
// row we expect to survive compares lower or higher than the row we expect
// to lose.
function lowId(): string {
  return `00000000-0000-4000-8000-${randomUUID().slice(-12)}`;
}

function highId(): string {
  return `ffffffff-ffff-4fff-bfff-${randomUUID().slice(-12)}`;
}

describe('GitHub issue casing dedup migration (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let workspaceId: string;
  let adminUserId: string;
  let projectId: string;

  const suffix = randomUUID().slice(0, 8);
  const canonicalOwner = `MigTest-Org-${suffix}`;
  const lowercaseOwner = canonicalOwner.toLowerCase();

  const taskIds: string[] = [];
  const entryIds: string[] = [];

  function issueKeys(repo: string, issueNumber: number) {
    return {
      canonical: `${canonicalOwner}/${repo}#${issueNumber}`,
      lowercase: `${lowercaseOwner}/${repo}#${issueNumber}`,
    };
  }

  async function createTask(title: string, createdAt: Date): Promise<string> {
    const [task] = await db
      .insert(tasks)
      .values({ workspaceId, projectId, title, createdAt })
      .returning({ id: tasks.id });
    if (!task) throw new Error('Expected created task');
    taskIds.push(task.id);
    return task.id;
  }

  async function createRef(input: {
    id: string;
    taskId: string;
    externalKey: string;
    createdAt: Date;
  }): Promise<void> {
    const separatorIndex = input.externalKey.lastIndexOf('#');
    const githubRepo = input.externalKey.slice(0, separatorIndex);
    const issueNumber = Number(input.externalKey.slice(separatorIndex + 1));
    await db.insert(taskExternalRefs).values({
      id: input.id,
      workspaceId,
      projectId,
      taskId: input.taskId,
      provider: 'github',
      externalType: 'issue',
      externalKey: input.externalKey,
      externalUrl: `https://github.com/${githubRepo}/issues/${issueNumber}`,
      metadata: { githubRepo, issueNumber },
      createdAt: input.createdAt,
      syncedAt: input.createdAt,
    });
  }

  async function createEntry(taskId: string): Promise<string> {
    const startedAt = new Date('2026-01-05T10:00:00.000Z');
    const endedAt = new Date('2026-01-05T11:00:00.000Z');
    const [entry] = await db
      .insert(timeEntries)
      .values({
        workspaceId,
        taskId,
        userId: adminUserId,
        startedAt,
        endedAt,
        durationSeconds: 3600,
        source: 'manual',
      })
      .returning({ id: timeEntries.id });
    if (!entry) throw new Error('Expected created time entry');
    entryIds.push(entry.id);
    return entry.id;
  }

  async function refsForKeys(
    keys: string[],
  ): Promise<Array<{ externalKey: string; taskId: string }>> {
    return db
      .select({
        externalKey: taskExternalRefs.externalKey,
        taskId: taskExternalRefs.taskId,
      })
      .from(taskExternalRefs)
      .where(inArray(taskExternalRefs.externalKey, keys));
  }

  // Scenario fixtures, all seeded before the single migration run.
  let crossDupFirstCanonicalTaskId: string;
  let crossDupFirstEntryId: string;
  let crossDupLastCanonicalTaskId: string;
  let crossDupLastEntryId: string;
  let crossDupLastCanonicalEntryId: string;
  let aliasLastTaskId: string;
  let aliasFirstTaskId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);

    const { admin, workspace } = await getSeededAdminWorkspace(db);
    workspaceId = workspace.id;
    adminUserId = admin.id;

    const [project] = await db
      .insert(projects)
      .values({ workspaceId, name: `Migration fixture ${suffix}` })
      .returning({ id: projects.id });
    if (!project) throw new Error('Expected created project');
    projectId = project.id;

    // Pre-0015 state: the raw-key unique index from 0003 permitted the
    // case-duplicates below; drop the current one so they can be seeded.
    await db.execute(sql.raw(`DROP INDEX IF EXISTS "${UNIQUE_INDEX_NAME}"`));

    // Cross-task duplicate, duplicate ref UUID sorting FIRST. The duplicate
    // task is also older, proving canonical selection follows the
    // uppercase-carrying key, not age or UUID order.
    {
      const keys = issueKeys('repo-a', 1);
      const canonicalTask = await createTask(
        'A canonical',
        new Date('2026-01-02T00:00:00.000Z'),
      );
      const duplicateTask = await createTask(
        'A duplicate',
        new Date('2026-01-01T00:00:00.000Z'),
      );
      await createRef({
        id: highId(),
        taskId: canonicalTask,
        externalKey: keys.canonical,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      });
      await createRef({
        id: lowId(),
        taskId: duplicateTask,
        externalKey: keys.lowercase,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      crossDupFirstCanonicalTaskId = canonicalTask;
      crossDupFirstEntryId = await createEntry(duplicateTask);
    }

    // Cross-task duplicate, duplicate ref UUID sorting LAST, with entries on
    // both tasks.
    {
      const keys = issueKeys('repo-b', 2);
      const canonicalTask = await createTask(
        'B canonical',
        new Date('2026-01-02T00:00:00.000Z'),
      );
      const duplicateTask = await createTask(
        'B duplicate',
        new Date('2026-01-01T00:00:00.000Z'),
      );
      await createRef({
        id: lowId(),
        taskId: canonicalTask,
        externalKey: keys.canonical,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      });
      await createRef({
        id: highId(),
        taskId: duplicateTask,
        externalKey: keys.lowercase,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      crossDupLastCanonicalTaskId = canonicalTask;
      crossDupLastCanonicalEntryId = await createEntry(canonicalTask);
      crossDupLastEntryId = await createEntry(duplicateTask);
    }

    // Same-task alias, alias UUID sorting LAST (the ordering the original
    // pairwise delete happened to handle).
    {
      const keys = issueKeys('repo-c', 3);
      aliasLastTaskId = await createTask(
        'C aliased',
        new Date('2026-01-01T00:00:00.000Z'),
      );
      await createRef({
        id: lowId(),
        taskId: aliasLastTaskId,
        externalKey: keys.canonical,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      });
      await createRef({
        id: highId(),
        taskId: aliasLastTaskId,
        externalKey: keys.lowercase,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    }

    // Same-task alias, alias UUID sorting FIRST (the ordering the original
    // pairwise delete silently kept, breaking the unique index build). The
    // alias is also older, so an age-based ranking would wrongly keep it.
    {
      const keys = issueKeys('repo-d', 4);
      aliasFirstTaskId = await createTask(
        'D aliased',
        new Date('2026-01-01T00:00:00.000Z'),
      );
      await createRef({
        id: highId(),
        taskId: aliasFirstTaskId,
        externalKey: keys.canonical,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      });
      await createRef({
        id: lowId(),
        taskId: aliasFirstTaskId,
        externalKey: keys.lowercase,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    }

    // Replay the migration exactly as the migrator would run it.
    const migrationSql = readFileSync(MIGRATION_PATH, 'utf8');
    for (const statement of migrationSql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed) {
        await db.execute(sql.raw(trimmed));
      }
    }
  }, 60_000);

  afterAll(async () => {
    if (db) {
      await db.delete(timeEntries).where(inArray(timeEntries.taskId, taskIds));
      await db
        .delete(taskExternalRefs)
        .where(inArray(taskExternalRefs.taskId, taskIds));
      await db.delete(tasks).where(inArray(tasks.id, taskIds));
      await db.delete(projects).where(eq(projects.id, projectId));
      // The migration recreates the index; this is a safety net so a failed
      // run cannot leave the shared dev DB unprotected for later suites.
      await db.execute(sql.raw(RESTORE_UNIQUE_INDEX_SQL));
    }
    await app?.close();
  });

  it('merges a cross-task duplicate whose ref UUID sorts before the canonical ref', async () => {
    const keys = issueKeys('repo-a', 1);
    const refs = await refsForKeys([keys.canonical, keys.lowercase]);
    expect(refs).toEqual([
      { externalKey: keys.canonical, taskId: crossDupFirstCanonicalTaskId },
    ]);

    const [movedEntry] = await db
      .select({ taskId: timeEntries.taskId })
      .from(timeEntries)
      .where(eq(timeEntries.id, crossDupFirstEntryId))
      .limit(1);
    expect(movedEntry?.taskId).toBe(crossDupFirstCanonicalTaskId);
  });

  it('merges a cross-task duplicate whose ref UUID sorts after the canonical ref', async () => {
    const keys = issueKeys('repo-b', 2);
    const refs = await refsForKeys([keys.canonical, keys.lowercase]);
    expect(refs).toEqual([
      { externalKey: keys.canonical, taskId: crossDupLastCanonicalTaskId },
    ]);

    const entries = await db
      .select({ id: timeEntries.id, taskId: timeEntries.taskId })
      .from(timeEntries)
      .where(
        inArray(timeEntries.id, [
          crossDupLastCanonicalEntryId,
          crossDupLastEntryId,
        ]),
      );
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.taskId).toBe(crossDupLastCanonicalTaskId);
    }
  });

  it('keeps only the canonically-cased ref when the alias UUID sorts after it', async () => {
    const keys = issueKeys('repo-c', 3);
    const refs = await refsForKeys([keys.canonical, keys.lowercase]);
    expect(refs).toEqual([
      { externalKey: keys.canonical, taskId: aliasLastTaskId },
    ]);
  });

  it('keeps only the canonically-cased ref when the alias UUID sorts before it', async () => {
    const keys = issueKeys('repo-d', 4);
    const refs = await refsForKeys([keys.canonical, keys.lowercase]);
    expect(refs).toEqual([
      { externalKey: keys.canonical, taskId: aliasFirstTaskId },
    ]);
  });

  it('loses no seeded time entries', async () => {
    const entries = await db
      .select({ id: timeEntries.id })
      .from(timeEntries)
      .where(inArray(timeEntries.id, entryIds));
    expect(entries).toHaveLength(entryIds.length);
  });

  it('rebuilds the unique index so a case-variant ref can no longer be inserted', async () => {
    const keys = issueKeys('repo-c', 3);
    const otherTask = await createTask(
      'Case-variant intruder',
      new Date('2026-01-03T00:00:00.000Z'),
    );

    const error = await createRef({
      id: lowId(),
      taskId: otherTask,
      externalKey: keys.canonical.toUpperCase(),
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
    }).then(
      () => null,
      (raised: unknown) => raised,
    );
    expect(getPostgresError(error)?.code).toBe(POSTGRES_UNIQUE_VIOLATION);
  });
});
