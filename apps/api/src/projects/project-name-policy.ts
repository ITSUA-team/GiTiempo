import { and, eq, sql } from 'drizzle-orm';
import { DomainError } from '../commons/errors/domain-error';
import type { DrizzleDB } from '../db/db.types';
import { projects } from './schemas/projects.schema';

export const PROJECT_NAME_MAX_LENGTH = 255;

const MAX_DERIVED_NAME_ATTEMPTS = 200;

export type ProjectNameExecutor = Pick<DrizzleDB, 'select'>;

export type ProjectNamespaceLockExecutor = Pick<DrizzleDB, 'execute'>;

export interface ProjectNameConflict {
  id: string;
  name: string;
}

export async function lockProjectNamespace(
  executor: ProjectNamespaceLockExecutor,
  workspaceId: string,
): Promise<void> {
  await executor.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`project-name:${workspaceId}`}))`,
  );
}

export function describeProjectNameConflict(takenName: string): string {
  return `A project named "${takenName}" already exists in this workspace.`;
}

export async function findActiveProjectNameConflict(
  executor: ProjectNameExecutor,
  workspaceId: string,
  name: string,
  excludeProjectId: string | null,
): Promise<ProjectNameConflict | null> {
  const conditions = [
    eq(projects.workspaceId, workspaceId),
    eq(projects.isActive, true),
    sql`lower(${projects.name}) = lower(${name})`,
  ];

  if (excludeProjectId !== null) {
    conditions.push(sql`${projects.id} <> ${excludeProjectId}`);
  }

  const [taken] = await executor
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(...conditions))
    .limit(1);

  return taken ?? null;
}

export async function resolveAvailableProjectName(
  executor: ProjectNameExecutor,
  workspaceId: string,
  preferredName: string,
): Promise<string> {
  const rows = await executor
    .select({ name: projects.name })
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        eq(projects.isActive, true),
        sql`lower(${projects.name}) = lower(${preferredName}) or lower(${projects.name}) like lower(${preferredName}) || ' (%)'`,
      ),
    );

  const taken = new Set(rows.map((row) => row.name.toLowerCase()));

  if (!taken.has(preferredName.toLowerCase())) {
    return preferredName;
  }

  for (let attempt = 2; attempt <= MAX_DERIVED_NAME_ATTEMPTS; attempt += 1) {
    const suffix = ` (${attempt})`;
    const base = preferredName.slice(
      0,
      PROJECT_NAME_MAX_LENGTH - suffix.length,
    );
    const candidate = `${base}${suffix}`;

    if (!taken.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  throw DomainError.internal(
    'project_name_unavailable',
    'Failed to derive an available project name',
  );
}
