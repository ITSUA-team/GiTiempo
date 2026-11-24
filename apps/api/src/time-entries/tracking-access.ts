import { and, eq, ne } from 'drizzle-orm';
import { workspaceMembers } from '../members/schemas/workspace-members.schema';
import { projectAssignments } from '../projects/schemas/project-assignments.schema';
import type { projects } from '../projects/schemas/projects.schema';
import { tasks } from '../tasks/schemas/tasks.schema';
import { timeEntries } from './schemas/time-entries.schema';

type Project = typeof projects.$inferSelect;
type Task = typeof tasks.$inferSelect;
type Role = typeof workspaceMembers.$inferSelect.role;
const implicitTrackingRole = 'admin';
const closedTaskStatus = 'closed';

export function hasImplicitTrackingAccess(
  role: Role,
  visibility: Project['visibility'],
): boolean {
  return role === implicitTrackingRole || visibility === 'public';
}

export function implicitTrackingMemberCondition() {
  return eq(workspaceMembers.role, implicitTrackingRole);
}

export function allowsTrackingFromOwnTime(
  mode: Project['trackingMode'],
): boolean {
  return mode === 'external-reference';
}

export function taskTrackingBlockReason(
  task: Pick<Task, 'isActive' | 'status'>,
) {
  if (!task.isActive) return 'Task is inactive';
  if (task.status === closedTaskStatus) return 'Task is closed';
  return undefined;
}

export function trackableTaskCondition() {
  return and(eq(tasks.isActive, true), ne(tasks.status, closedTaskStatus));
}

export function ownTaskTimeCondition(
  workspaceId: string,
  userId: string | typeof workspaceMembers.userId,
  taskId: string | typeof tasks.id,
) {
  return and(
    eq(timeEntries.workspaceId, workspaceId),
    eq(timeEntries.userId, userId),
    eq(timeEntries.taskId, taskId),
  );
}

export function trackingAssignmentCondition(
  workspaceId: string,
  projectId: string,
  userId: string | typeof workspaceMembers.userId,
) {
  return and(
    eq(projectAssignments.workspaceId, workspaceId),
    eq(projectAssignments.projectId, projectId),
    eq(projectAssignments.userId, userId),
  );
}
