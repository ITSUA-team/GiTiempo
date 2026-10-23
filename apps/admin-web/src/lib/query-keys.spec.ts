import { describe, expect, it } from 'vitest';

import {
  adminDashboardKeys,
  adminInvoicesKeys,
  adminMutationInvalidationKeys,
  adminProjectsKeys,
  adminSettingsKeys,
  normalizeEligibleEntriesQuery,
  normalizeInvoiceListQuery,
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
        groupBy: ['project'],
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
      groupBy: ['project'],
      limit: 100,
      page: 2,
      projectId: 'project-1',
      search: 'reports',
      sortBy: 'lastStartedAt',
      sortOrder: 'desc',
      userId: 'member-1',
    });
  });

  it('includes role/user/workspace scope and report filters in keys', () => {
    expect(reportsKeys.time(scope, { groupBy: ['project'], page: 1 })).toEqual([
      'admin-web',
      { role: 'admin', userId: 'user-1', workspaceId: 'workspace-1' },
      'reports',
      'time',
      {
        dateFrom: null,
        dateTo: null,
        groupBy: ['project'],
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
    expect(adminSettingsKeys.availableGitHubOrganizations(scope)).toEqual([
      'admin-web',
      { role: 'admin', userId: 'user-1', workspaceId: 'workspace-1' },
      'settings',
      'available-github-organizations',
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

  it('normalizes invoice list and eligible-entries queries', () => {
    expect(
      normalizeInvoiceListQuery({
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        limit: 50,
        page: 2,
        projectId: 'project-1',
        search: 'april',
        status: 'draft',
      }),
    ).toEqual({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      limit: 50,
      page: 2,
      projectId: 'project-1',
      search: 'april',
      status: 'draft',
    });
    expect(
      normalizeEligibleEntriesQuery({
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        projectId: 'project-1',
        roundingStepMinutes: 15,
      }),
    ).toEqual({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId: 'project-1',
      roundingStepMinutes: 15,
    });
    expect(normalizeEligibleEntriesQuery()).toEqual({
      dateFrom: null,
      dateTo: null,
      projectId: null,
      roundingStepMinutes: null,
    });
  });

  it('provides invoice keys with normalized queries and ids', () => {
    const scopedKeys = [
      'admin-web',
      { role: 'admin', userId: 'user-1', workspaceId: 'workspace-1' },
      'invoices',
    ];

    expect(adminInvoicesKeys.all(scope)).toEqual(scopedKeys);
    expect(
      adminInvoicesKeys.list(scope, { page: 2, status: 'sent' }),
    ).toEqual([
      ...scopedKeys,
      'list',
      {
        dateFrom: null,
        dateTo: null,
        limit: null,
        page: 2,
        projectId: null,
        search: null,
        status: 'sent',
      },
    ]);
    expect(adminInvoicesKeys.detail(scope, 'invoice-1')).toEqual([
      ...scopedKeys,
      'detail',
      'invoice-1',
    ]);
    expect(adminInvoicesKeys.stats(scope)).toEqual([
      ...scopedKeys,
      'stats',
    ]);
    expect(
      adminInvoicesKeys.eligibleEntries(scope, {
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        roundingStepMinutes: 5,
      }),
    ).toEqual([
      ...scopedKeys,
      'eligible-entries',
      {
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        projectId: null,
        roundingStepMinutes: 5,
      },
    ]);
  });

  it('invalidates invoice queries after invoice mutations', () => {
    expect(adminMutationInvalidationKeys.afterInvoiceMutation(scope)).toEqual([
      adminInvoicesKeys.all(scope),
    ]);
  });
});
