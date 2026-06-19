/**
 * Idempotent API dev seed script.
 * Run with `pnpm --filter @gitiempo/api db:seed`.
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
import { workspaceGitHubOrganizations } from '../github/schemas/workspace-github-organizations.schema';

interface SeedUser {
  firebaseUid: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: WorkspaceRole;
  assignToClientProject?: boolean;
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

const DEV_SEED_USERS: SeedUser[] = [
  {
    // Matches the fake Firebase admin token used by e2e and Bruno.
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
  {
    firebaseUid: '5EU7Psf9HfeBoyq9qb91fHhj5jg2',
    email: 'gitiempo@itsua.com',
    displayName: 'Admin gitempo',
    avatarUrl: null,
    role: 'admin',
  },
];

function getOptionalSeedUser({
  uidEnv,
  emailEnv,
  displayName,
  role,
  assignToClientProject = false,
}: {
  uidEnv: string;
  emailEnv: string;
  displayName: string;
  role: WorkspaceRole;
  assignToClientProject?: boolean;
}): SeedUser | null {
  const firebaseUid = process.env[uidEnv]?.trim();
  const email = process.env[emailEnv]?.trim();

  if (!firebaseUid && !email) return null;
  if (!firebaseUid || !email) {
    throw new Error(`${uidEnv} and ${emailEnv} must be set together.`);
  }

  return {
    firebaseUid,
    email,
    displayName,
    avatarUrl: null,
    role,
    assignToClientProject,
  };
}

function getSeedUsers(): SeedUser[] {
  return [
    ...DEV_SEED_USERS,
    getOptionalSeedUser({
      uidEnv: 'SEED_ADMIN_FIREBASE_UID',
      emailEnv: 'SEED_ADMIN_EMAIL',
      displayName: 'Seed admin',
      role: 'admin',
    }),
    getOptionalSeedUser({
      uidEnv: 'SEED_MEMBER_FIREBASE_UID',
      emailEnv: 'SEED_MEMBER_EMAIL',
      displayName: 'Seed member',
      role: 'member',
      assignToClientProject: true,
    }),
  ].filter((user): user is SeedUser => user !== null);
}

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
      workspaceGitHubOrganizations,
    },
  });

  try {
    // Fail fast if migrations have not been applied yet.
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
        timeZone: 'UTC',
      })
      .onConflictDoUpdate({
        target: workspaceSettings.workspaceId,
        set: {
          currency: 'USD',
          defaultHourlyRate: 100,
          timeZone: 'UTC',
          updatedAt: new Date(),
        },
      });

    const seedUsers = getSeedUsers();
    let adminUserId: string | null = null;
    const userIdsByFirebaseUid = new Map<string, string>();
    const clientProjectSeedUserIds: string[] = [];
    for (const user of seedUsers) {
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
      userIdsByFirebaseUid.set(user.firebaseUid, row.id);

      if (user.role === 'admin') {
        adminUserId = row.id;
      }
      if (user.assignToClientProject) {
        clientProjectSeedUserIds.push(row.id);
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
          description:
            'Internal product and platform work for API, authorization, and shared delivery foundations.',
          color: '#2563EB',
          visibility: 'private',
          isActive: true,
        },
        {
          id: CLIENT_PROJECT_ID,
          workspaceId: DEFAULT_WORKSPACE_ID,
          name: 'Demo Client',
          description:
            'Client-facing delivery workspace used for onboarding, reporting, and billing demos.',
          color: '#16A34A',
          visibility: 'private',
          isActive: true,
        },
        {
          id: ARCHIVED_PROJECT_ID,
          workspaceId: DEFAULT_WORKSPACE_ID,
          name: 'Archived Initiative',
          description:
            'Historical project kept for archived task and time-entry reference coverage.',
          color: '#64748B',
          visibility: 'private',
          isActive: false,
        },
      ])
      .onConflictDoUpdate({
        target: projects.id,
        set: {
          name: sql`excluded.name`,
          description: sql`excluded.description`,
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

    const clientProjectUserIds = Array.from(
      new Set([aliceUserId, carolUserId, ...clientProjectSeedUserIds]),
    );

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
          projectId: PLATFORM_PROJECT_ID,
          userId: bobUserId,
          assignedBy: adminUserId,
        },
        ...clientProjectUserIds.map((userId) => ({
          workspaceId: DEFAULT_WORKSPACE_ID,
          projectId: CLIENT_PROJECT_ID,
          userId,
          assignedBy: adminUserId,
        })),
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
      `Seeded default workspace, settings, ${seedUsers.length} users, memberships, projects, tasks, and 1 dev invite.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
