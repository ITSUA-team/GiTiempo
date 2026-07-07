import { describe, expect, it } from 'vitest';

import {
  adminDashboardKeys,
  adminMutationInvalidationKeys,
  adminProjectsKeys,
  adminSettingsKeys,
  normalizeTimeReportExportQuery,
  normalizeTimeReportQuery,
  reportsKeys,
  type AdminServerStateScope,
} from './query-keys';

const scope: AdminServerStateScope = {
  role: 'admin',
  userId: 'user-1',
  workspaceId: 'workspace-1',
};

describe('admin-web query keys', () => {
  it('normalizes report data query scope', () => {
    expect(
      normalizeTimeReportQuery({
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-08T00:00:00.000Z',
        groupBy: 'project',
        limit: 100,
        page: 2,
        projectId: 'project-1',
        search: 'reports',
        sortBy: 'lastStartedAt',
        sortOrder: 'desc',
        userId: 'member-1',
      }),
    ).toEqual({
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-08T00:00:00.000Z',
      groupBy: 'project',
      limit: 100,
      page: 2,
      projectId: 'project-1',
      search: 'reports',
      sortBy: 'lastStartedAt',
      sortOrder: 'desc',
      userId: 'member-1',
    });
  });

  it('normalizes report export query scope separately from paginated data', () => {
    expect(
      normalizeTimeReportExportQuery({
        groupBy: 'user',
        projectId: 'project-1',
        sortBy: 'totalSeconds',
        sortOrder: 'asc',
      }),
    ).toEqual({
      dateFrom: null,
      dateTo: null,
      groupBy: 'user',
      projectId: 'project-1',
      search: null,
      sortBy: 'totalSeconds',
      sortOrder: 'asc',
      userId: null,
    });
  });

  it('includes role/user/workspace scope and report filters in keys', () => {
    expect(reportsKeys.time(scope, { groupBy: 'project', page: 1 })).toEqual([
      'admin-web',
      { role: 'admin', userId: 'user-1', workspaceId: 'workspace-1' },
      'reports',
      'time',
      {
        dateFrom: null,
        dateTo: null,
        groupBy: 'project',
        limit: null,
        page: 1,
        projectId: null,
        search: null,
        sortBy: null,
        sortOrder: null,
        userId: null,
      },
    ]);
  });

  it('provides dashboard and settings keys', () => {
    expect(
      adminDashboardKeys.overview(scope, {
        dateFrom: '2026-05-04T00:00:00.000Z',
        dateTo: '2026-05-07T12:00:00.000Z',
      }),
    ).toContainEqual({
      dateFrom: '2026-05-04T00:00:00.000Z',
      dateTo: '2026-05-07T12:00:00.000Z',
    });
    expect(adminSettingsKeys.workspaceSettings(scope)).toEqual([
      'admin-web',
      { role: 'admin', userId: 'user-1', workspaceId: 'workspace-1' },
      'settings',
      'workspace-settings',
    ]);
    expect(adminSettingsKeys.githubConnection(scope)).toEqual([
      'admin-web',
      { role: 'admin', userId: 'user-1', workspaceId: 'workspace-1' },
      'settings',
      'github-connection',
    ]);
  });

  it('provides targeted invalidation keys after mutations', () => {
    expect(adminMutationInvalidationKeys.afterProjectMutation(scope)).toEqual([
      adminProjectsKeys.all(scope),
      adminDashboardKeys.all(scope),
      reportsKeys.all(scope),
    ]);
    expect(adminMutationInvalidationKeys.afterSettingsSave(scope)).toEqual([
      adminSettingsKeys.all(scope),
    ]);
  });
});
