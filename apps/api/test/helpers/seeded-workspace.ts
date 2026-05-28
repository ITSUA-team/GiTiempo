import { and, eq } from 'drizzle-orm';
import type { DrizzleDB } from '../../src/db/db.types';
import { users, workspaceMembers, workspaces } from '../../src/db/schema';
import { ADMIN_UID } from './auth';

const DEFAULT_WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';

export async function getSeededAdminWorkspace(db: DrizzleDB) {
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.firebaseUid, ADMIN_UID))
    .limit(1);
  if (!admin) throw new Error('Expected seeded admin user');

  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, admin.id),
        eq(workspaceMembers.workspaceId, DEFAULT_WORKSPACE_ID),
      ),
    )
    .limit(1);
  if (!membership) throw new Error('Expected seeded admin membership');

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, DEFAULT_WORKSPACE_ID))
    .limit(1);
  if (!workspace) throw new Error('Expected seeded workspace');

  return { admin, workspace };
}
