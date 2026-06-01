import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi, afterEach } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
import { ReportsService } from './reports.service';

const adminUser: AuthUser = {
  sub: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001',
  email: 'admin@example.com',
  firebaseUid: 'admin-uid',
  workspaceId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002',
  role: 'admin',
};

const pmUser: AuthUser = {
  ...adminUser,
  sub: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003',
  email: 'pm@example.com',
  firebaseUid: 'pm-uid',
  role: 'pm',
};

const memberUser: AuthUser = {
  ...adminUser,
  sub: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004',
  email: 'member@example.com',
  firebaseUid: 'member-uid',
  role: 'member',
};

function createService(role: 'admin' | 'pm' | 'member') {
  const members = {
    requireRole: vi.fn().mockImplementation(() => {
      if (role === 'member') throw new ForbiddenException('Forbidden');
      return Promise.resolve({ role });
    }),
  };
  return {
    service: new ReportsService({} as never, members as never),
    members,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ReportsService', () => {
  it('returns admin report rows with full filtered summary', async () => {
    const { service } = createService('admin');
    const context = {
      groupBy: 'project' as const,
      scopeUserId: adminUser.sub,
      dateRange: {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-06-01T00:00:00.000Z',
      },
      conditions: [],
    };
    Object.defineProperty(service, 'buildQueryContext', {
      value: vi.fn().mockResolvedValue(context),
    });
    Object.defineProperty(service, 'getSummary', {
      value: vi.fn().mockResolvedValue({
        totalSeconds: 7200,
        billableSeconds: 3600,
        nonBillableSeconds: 3600,
        entryCount: 2,
        billableShare: 0.5,
      }),
    });
    Object.defineProperty(service, 'countRows', {
      value: vi.fn().mockResolvedValue(2),
    });
    Object.defineProperty(service, 'getRows', {
      value: vi.fn().mockResolvedValue([
        {
          projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9005',
          projectName: 'Project Orion',
          taskId: null,
          taskTitle: null,
          userId: null,
          userEmail: null,
          userDisplayName: null,
          userAvatarUrl: null,
          totalSeconds: 3600,
          billableSeconds: 3600,
          nonBillableSeconds: 0,
          entryCount: 1,
          firstStartedAt: new Date('2026-05-01T10:00:00.000Z'),
          lastStartedAt: new Date('2026-05-01T10:00:00.000Z'),
        },
      ]),
    });

    const report = await service.getTimeReport(adminUser, {
      page: 1,
      limit: 1,
      groupBy: 'project',
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });

    expect(report.summary.totalSeconds).toBe(7200);
    expect(report.items[0]?.project?.name).toBe('Project Orion');
    expect(report.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
  });

  it('builds PM report context with public-or-assigned project scope', async () => {
    const { service, members } = createService('pm');

    const context = await (
      service as never as {
        buildQueryContext: (
          user: AuthUser,
          query: unknown,
        ) => Promise<{
          scopeUserId: string;
          conditions: unknown[];
        }>;
      }
    ).buildQueryContext(pmUser, {
      page: 1,
      limit: 20,
      groupBy: 'project',
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });

    expect(members.requireRole).toHaveBeenCalledWith(
      pmUser.sub,
      pmUser.workspaceId,
      ['admin', 'pm'],
    );
    expect(context.scopeUserId).toBe(pmUser.sub);
    expect(context.conditions.length).toBeGreaterThan(7);
  });

  it('rejects member JSON reports', async () => {
    const { service } = createService('member');

    await expect(
      service.getTimeReport(memberUser, {
        page: 1,
        limit: 20,
        groupBy: 'project',
        sortBy: 'totalSeconds',
        sortOrder: 'desc',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('defaults omitted dates to the current UTC calendar month', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-13T12:00:00.000Z'));
    const { service } = createService('admin');

    const context = await (
      service as never as {
        buildQueryContext: (
          user: AuthUser,
          query: unknown,
        ) => Promise<{
          dateRange: { dateFrom: string; dateTo: string };
        }>;
      }
    ).buildQueryContext(adminUser, {
      page: 1,
      limit: 20,
      groupBy: 'project',
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });

    expect(context.dateRange).toEqual({
      dateFrom: '2026-12-01T00:00:00.000Z',
      dateTo: '2027-01-01T00:00:00.000Z',
    });
  });

  it('uses supplied date boundaries as the effective closed-open window', async () => {
    const { service } = createService('admin');

    const context = await (
      service as never as {
        buildQueryContext: (
          user: AuthUser,
          query: unknown,
        ) => Promise<{
          dateRange: { dateFrom: string; dateTo: string };
        }>;
      }
    ).buildQueryContext(adminUser, {
      page: 1,
      limit: 20,
      dateFrom: '2026-04-01T00:00:00.000Z',
      dateTo: '2026-04-15T00:00:00.000Z',
      groupBy: 'project',
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });

    expect(context.dateRange).toEqual({
      dateFrom: '2026-04-01T00:00:00.000Z',
      dateTo: '2026-04-15T00:00:00.000Z',
    });
  });

  it('maps project, task, and user aggregate rows', () => {
    const { service } = createService('admin');
    const baseRow = {
      totalSeconds: '7200',
      billableSeconds: '3600',
      nonBillableSeconds: '3600',
      entryCount: '2',
      firstStartedAt: '2026-05-01T10:00:00.000Z',
      lastStartedAt: '2026-05-02T10:00:00.000Z',
    };
    const mapper = service as never as {
      toReportRow: (
        groupBy: 'project' | 'task' | 'user',
        row: unknown,
      ) => unknown;
    };

    expect(
      mapper.toReportRow('project', {
        ...baseRow,
        projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9005',
        projectName: 'Project Orion',
      }),
    ).toMatchObject({ groupBy: 'project', totalSeconds: 7200 });
    expect(
      mapper.toReportRow('task', {
        ...baseRow,
        projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9005',
        projectName: 'Project Orion',
        taskId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9006',
        taskTitle: 'Improve reports filters',
      }),
    ).toMatchObject({
      groupBy: 'task',
      task: { title: 'Improve reports filters' },
    });
    expect(
      mapper.toReportRow('user', {
        ...baseRow,
        userId: pmUser.sub,
        userEmail: pmUser.email,
        userDisplayName: 'PM User',
        userAvatarUrl: null,
      }),
    ).toMatchObject({ groupBy: 'user', user: { email: pmUser.email } });
  });

  it('exports CSV using the same scoped context and filters', async () => {
    const { service } = createService('pm');
    const context = {
      groupBy: 'user' as const,
      scopeUserId: pmUser.sub,
      dateRange: {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-06-01T00:00:00.000Z',
      },
      conditions: [],
    };
    const buildQueryContext = vi.fn().mockResolvedValue(context);
    const getRows = vi.fn().mockResolvedValue([
      {
        userId: pmUser.sub,
        userEmail: pmUser.email,
        userDisplayName: 'PM User',
        userAvatarUrl: null,
        totalSeconds: 3600,
        billableSeconds: 3600,
        nonBillableSeconds: 0,
        entryCount: 1,
        firstStartedAt: new Date('2026-05-01T10:00:00.000Z'),
        lastStartedAt: new Date('2026-05-01T10:00:00.000Z'),
      },
    ]);
    Object.defineProperty(service, 'buildQueryContext', {
      value: buildQueryContext,
    });
    Object.defineProperty(service, 'getRows', { value: getRows });

    const result = await service.exportTimeReport(pmUser, {
      groupBy: 'user',
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });

    expect(buildQueryContext).toHaveBeenCalledWith(pmUser, {
      groupBy: 'user',
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });
    expect(getRows).toHaveBeenCalledWith(
      context,
      'totalSeconds',
      'desc',
      undefined,
      undefined,
    );
    expect(result.filename).toBe('time-report-2026-05-01_2026-06-01.csv');
    expect(result.content).toContain(pmUser.email);
  });
});
