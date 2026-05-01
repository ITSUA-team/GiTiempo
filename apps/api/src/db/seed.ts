/**
 * Seed CLI for the API database.
 *
 * Run with:
 *   pnpm --filter @gitiempo/api db:seed
 *
 * Idempotent: re-running updates the same deterministic workspace,
 * settings, users, memberships, and dev invite in place. Safe to run
 * repeatedly during dev.
 *
 * NOTE: this is a thin standalone script; it does NOT bootstrap Nest.
 * It reads `DATABASE_URL` from process env (the npm script loads .env
 * via Node's native `--env-file` flag) and writes via Drizzle directly.
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { users } from '../users/schemas/users.schema';
import { workspaces } from '../workspaces/schemas/workspaces.schema';
import { workspaceSettings } from '../workspaces/schemas/workspace-settings.schema';
import type { WorkspaceRole } from '@gitiempo/shared';
import { workspaceMembers } from '../members/schemas/workspace-members.schema';
import { invites } from '../invites/schemas/invites.schema';
import { projects } from '../projects/schemas/projects.schema';
import { projectAssignments } from '../projects/schemas/project-assignments.schema';
import { tasks } from '../tasks/schemas/tasks.schema';

interface SeedUser {
  firebaseUid: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: WorkspaceRole;
}

const DEFAULT_WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';
const DEFAULT_SETTINGS_ID = '00000000-0000-4000-8000-000000000002';
const DEV_INVITE_ID = '00000000-0000-4000-8000-000000000003';
const PLATFORM_PROJECT_ID = '00000000-0000-4000-8000-000000000004';
const CLIENT_PROJECT_ID = '00000000-0000-4000-8000-000000000005';
const ARCHIVED_PROJECT_ID = '00000000-0000-4000-8000-000000000006';
const PLATFORM_API_TASK_ID = '00000000-0000-4000-8000-000000000101';
const PLATFORM_AUTH_TASK_ID = '00000000-0000-4000-8000-000000000102';
const CLIENT_ONBOARDING_TASK_ID = '00000000-0000-4000-8000-000000000103';
const ARCHIVED_TASK_ID = '00000000-0000-4000-8000-000000000104';
const DEV_INVITE_EMAIL = 'new.member@example.com';
const DEV_INVITE_TOKEN = 'dev-invite-token';

const SEED_USERS: SeedUser[] = [
  {
    // Matches the test fake's default token `test:admin-uid:admin@example.com`
    // used by e2e suites and bruno's local environment.
    firebaseUid: 'admin-uid',
    email: 'admin@example.com',
    displayName: 'Admin (seed)',
    avatarUrl: null,
    role: 'admin',
  },
  {
    firebaseUid: 'seed-user-1',
    email: 'alice@gitiempo.dev',
    displayName: 'Alice (seed)',
    avatarUrl: 'https://i.pravatar.cc/150?u=alice',
    role: 'pm',
  },
  {
    firebaseUid: 'seed-user-2',
    email: 'bob@gitiempo.dev',
    displayName: 'Bob (seed)',
    avatarUrl: 'https://i.pravatar.cc/150?u=bob',
    role: 'member',
  },
  {
    firebaseUid: 'seed-user-3',
    email: 'carol@gitiempo.dev',
    displayName: 'Carol (seed)',
    avatarUrl: null,
    role: 'member',
  },
];

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Create apps/api/.env (see .env.example).',
    );
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, {
    schema: {
      users,
      workspaces,
      workspaceSettings,
      workspaceMembers,
      invites,
      projects,
      projectAssignments,
      tasks,
    },
  });

  try {
    // Sanity check — fail fast with a clear message if migrations
    // haven't been applied yet.
    await db.execute(sql`SELECT 1 FROM "users" LIMIT 1`).catch(() => {
      throw new Error(
        'Could not query "users" table. Did you run `pnpm --filter @gitiempo/api db:migrate`?',
      );
    });
    await db.execute(sql`SELECT 1 FROM "workspaces" LIMIT 1`).catch(() => {
      throw new Error(
        'Could not query "workspaces" table. Did you run `pnpm --filter @gitiempo/api db:migrate`?',
      );
    });

    await db
      .insert(workspaces)
      .values({
        id: DEFAULT_WORKSPACE_ID,
        name: 'GI Tiempo',
      })
      .onConflictDoUpdate({
        target: workspaces.id,
        set: {
          name: 'GI Tiempo',
          updatedAt: new Date(),
        },
      });

    await db
      .insert(workspaceSettings)
      .values({
        id: DEFAULT_SETTINGS_ID,
        workspaceId: DEFAULT_WORKSPACE_ID,
        currency: 'USD',
        defaultHourlyRate: 100,
      })
      .onConflictDoUpdate({
        target: workspaceSettings.workspaceId,
        set: {
          currency: 'USD',
          defaultHourlyRate: 100,
          updatedAt: new Date(),
        },
      });

    let adminUserId: string | null = null;
    const userIdsByFirebaseUid = new Map<string, string>();
    for (const user of SEED_USERS) {
      const [row] = await db
        .insert(users)
        .values({
          firebaseUid: user.firebaseUid,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        })
        .onConflictDoUpdate({
          target: users.firebaseUid,
          set: {
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            updatedAt: new Date(),
          },
        })
        .returning();
      if (!row) throw new Error(`Failed to seed user ${user.email}`);
      userIdsByFirebaseUid.set(user.firebaseUid, row.id);

      if (user.role === 'admin') {
        adminUserId = row.id;
      }

      await db
        .insert(workspaceMembers)
        .values({
          workspaceId: DEFAULT_WORKSPACE_ID,
          userId: row.id,
          role: user.role,
        })
        .onConflictDoUpdate({
          target: [workspaceMembers.workspaceId, workspaceMembers.userId],
          set: {
            role: user.role,
          },
        });
    }

    if (!adminUserId) throw new Error('Seed admin user was not created');

    await db
      .insert(projects)
      .values([
        {
          id: PLATFORM_PROJECT_ID,
          workspaceId: DEFAULT_WORKSPACE_ID,
          name: 'Internal Platform',
          color: '#2563EB',
          visibility: 'private',
          isActive: true,
        },
        {
          id: CLIENT_PROJECT_ID,
          workspaceId: DEFAULT_WORKSPACE_ID,
          name: 'Demo Client',
          color: '#16A34A',
          visibility: 'private',
          isActive: true,
        },
        {
          id: ARCHIVED_PROJECT_ID,
          workspaceId: DEFAULT_WORKSPACE_ID,
          name: 'Archived Initiative',
          color: '#64748B',
          visibility: 'private',
          isActive: false,
        },
      ])
      .onConflictDoUpdate({
        target: projects.id,
        set: {
          name: sql`excluded.name`,
          color: sql`excluded.color`,
          visibility: sql`excluded.visibility`,
          isActive: sql`excluded.is_active`,
          updatedAt: new Date(),
        },
      });

    const aliceUserId = userIdsByFirebaseUid.get('seed-user-1');
    const bobUserId = userIdsByFirebaseUid.get('seed-user-2');
    const carolUserId = userIdsByFirebaseUid.get('seed-user-3');
    if (!aliceUserId || !bobUserId || !carolUserId) {
      throw new Error('Seed non-admin users were not created');
    }

    await db
      .insert(projectAssignments)
      .values([
        {
          workspaceId: DEFAULT_WORKSPACE_ID,
          projectId: PLATFORM_PROJECT_ID,
          userId: aliceUserId,
          assignedBy: adminUserId,
        },
        {
          workspaceId: DEFAULT_WORKSPACE_ID,
          projectId: CLIENT_PROJECT_ID,
          userId: aliceUserId,
          assignedBy: adminUserId,
        },
        {
          workspaceId: DEFAULT_WORKSPACE_ID,
          projectId: PLATFORM_PROJECT_ID,
          userId: bobUserId,
          assignedBy: adminUserId,
        },
        {
          workspaceId: DEFAULT_WORKSPACE_ID,
          projectId: CLIENT_PROJECT_ID,
          userId: carolUserId,
          assignedBy: adminUserId,
        },
      ])
      .onConflictDoUpdate({
        target: [projectAssignments.projectId, projectAssignments.userId],
        set: {
          assignedBy: adminUserId,
        },
      });

    await db
      .insert(tasks)
      .values([
        {
          id: PLATFORM_API_TASK_ID,
          workspaceId: DEFAULT_WORKSPACE_ID,
          projectId: PLATFORM_PROJECT_ID,
          title: 'Set up API project foundation',
          status: 'open',
          isActive: true,
        },
        {
          id: PLATFORM_AUTH_TASK_ID,
          workspaceId: DEFAULT_WORKSPACE_ID,
          projectId: PLATFORM_PROJECT_ID,
          title: 'Review workspace authorization flows',
          status: 'open',
          isActive: true,
        },
        {
          id: CLIENT_ONBOARDING_TASK_ID,
          workspaceId: DEFAULT_WORKSPACE_ID,
          projectId: CLIENT_PROJECT_ID,
          title: 'Draft onboarding checklist',
          status: 'open',
          isActive: true,
        },
        {
          id: ARCHIVED_TASK_ID,
          workspaceId: DEFAULT_WORKSPACE_ID,
          projectId: ARCHIVED_PROJECT_ID,
          title: 'Archived discovery task',
          status: 'closed',
          isActive: false,
        },
      ])
      .onConflictDoUpdate({
        target: tasks.id,
        set: {
          title: sql`excluded.title`,
          status: sql`excluded.status`,
          isActive: sql`excluded.is_active`,
          updatedAt: new Date(),
        },
      });

    await db
      .insert(invites)
      .values({
        id: DEV_INVITE_ID,
        workspaceId: DEFAULT_WORKSPACE_ID,
        email: DEV_INVITE_EMAIL,
        token: DEV_INVITE_TOKEN,
        invitedBy: adminUserId,
        role: 'member',
        status: 'pending',
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      })
      .onConflictDoUpdate({
        target: invites.token,
        set: {
          email: DEV_INVITE_EMAIL,
          invitedBy: adminUserId,
          role: 'member',
          status: 'pending',
          expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        },
      });

    console.log(
      `Seeded default workspace, settings, ${SEED_USERS.length} users, memberships, projects, tasks, and 1 dev invite.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
