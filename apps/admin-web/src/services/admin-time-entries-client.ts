import {
  createManagedTimeEntrySchema,
  managementProjectsResponseSchema,
  managementTimeEntryMembersResponseSchema,
  managementTimeEntryTasksResponseSchema,
  timeEntryListResponseSchema,
  timeEntryResponseSchema,
  updateManagedTimeEntrySchema,
  type UpdateManagedTimeEntryInput,
} from '@gitiempo/shared';
import type { AuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { getAuthenticatedAppApiClient } from './api-client';

export type ManagementProject = ReturnType<typeof managementProjectsResponseSchema.parse>['items'][number];
export type ManagementMember = ReturnType<typeof managementTimeEntryMembersResponseSchema.parse>['items'][number];
export type ManagementTask = ReturnType<typeof managementTimeEntryTasksResponseSchema.parse>['items'][number];
export type ManagedEntryUpdate = UpdateManagedTimeEntryInput;
export type ManagedEntryCreate = ReturnType<typeof createManagedTimeEntrySchema.parse>;

interface ManagementEntryFilters {
  userId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

function queryPath(path: string, values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) query.set(key, String(value));
  }
  return `${path}?${query}`;
}

function projectPath(projectId: string) {
  return `/management/projects/${encodeURIComponent(projectId)}`;
}

async function collectOptions<T>(
  read: (page: number) => Promise<{ items: T[]; meta: { totalPages: number } }>,
  current: () => boolean,
) {
  const items: T[] = [];
  let page = 1;
  while (current()) {
    const result = await read(page);
    items.push(...result.items);
    if (page >= result.meta.totalPages) break;
    page += 1;
  }
  return items;
}

export function createAdminTimeEntriesClient(
  client: Pick<AuthenticatedApiClient, 'requestJson' | 'requestNoContent'> = getAuthenticatedAppApiClient(),
) {
  return {
    projects(current: () => boolean) {
      return collectOptions(page => client.requestJson({
        path: queryPath('/management/projects', { page, limit: 100 }),
        responseSchema: managementProjectsResponseSchema,
      }), current);
    },
    members(projectId: string, purpose: 'filter' | 'create', current: () => boolean, taskId?: string) {
      return collectOptions(page => client.requestJson({
        path: queryPath(`${projectPath(projectId)}/time-entry-members`, { page, limit: 100, purpose, taskId }),
        responseSchema: managementTimeEntryMembersResponseSchema,
      }), current);
    },
    async tasks(projectId: string, userId: string | undefined, current: () => boolean) {
      let isOwnerAssigned: boolean | undefined;
      const items = await collectOptions(async page => {
        const result = await client.requestJson({
          path: queryPath(`${projectPath(projectId)}/time-entry-tasks`, { page, limit: 100, userId }),
          responseSchema: managementTimeEntryTasksResponseSchema,
        });
        isOwnerAssigned = result.isOwnerAssigned;
        return result;
      }, current);
      return { items, isOwnerAssigned };
    },
    list(projectId: string, page: number, filters: ManagementEntryFilters) {
      return client.requestJson({
        path: queryPath(`${projectPath(projectId)}/time-entries`, { page, limit: 20, ...filters }),
        responseSchema: timeEntryListResponseSchema,
      });
    },
    create(projectId: string, input: ManagedEntryCreate) {
      return client.requestJson({
        path: `${projectPath(projectId)}/time-entries`,
        method: 'POST',
        body: createManagedTimeEntrySchema.parse(input),
        responseSchema: timeEntryResponseSchema,
      });
    },
    update(sourceProjectId: string, entryId: string, input: ManagedEntryUpdate) {
      return client.requestJson({
        path: `${projectPath(sourceProjectId)}/time-entries/${encodeURIComponent(entryId)}`,
        method: 'PATCH',
        body: updateManagedTimeEntrySchema.parse(input),
        responseSchema: timeEntryResponseSchema,
      });
    },
    remove(projectId: string, entryId: string) {
      return client.requestNoContent({
        path: `${projectPath(projectId)}/time-entries/${encodeURIComponent(entryId)}`,
        method: 'DELETE',
      });
    },
  };
}

export type AdminTimeEntriesClient = ReturnType<typeof createAdminTimeEntriesClient>;
