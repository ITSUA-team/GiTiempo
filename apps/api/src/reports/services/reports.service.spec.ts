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
      groupBy: ['project'] as ['project'],
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
      groupBy: ['project'],
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
      groupBy: ['project'],
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
        groupBy: ['project'],
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
      groupBy: ['project'],
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
      groupBy: ['project'],
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });

    expect(context.dateRange).toEqual({
      dateFrom: '2026-04-01T00:00:00.000Z',
      dateTo: '2026-04-15T00:00:00.000Z',
    });
  });

  it('maps aggregate rows to the identities on the grouping path', () => {
    const { service } = createService('admin');
    const baseRow = {
      totalSeconds: '7200',
      billableSeconds: '3600',
      nonBillableSeconds: '3600',
      entryCount: '2',
      firstStartedAt: '2026-05-01T10:00:00.000Z',
      lastStartedAt: '2026-05-02T10:00:00.000Z',
    };
    const fullRow = {
      ...baseRow,
      projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9005',
      projectName: 'Project Orion',
      taskId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9006',
      taskTitle: 'Improve reports filters',
      userId: pmUser.sub,
      userEmail: pmUser.email,
      userDisplayName: 'PM User',
      userAvatarUrl: null,
    };
    const mapper = service as never as {
      toReportRow: (
        groupBy: ('project' | 'task' | 'user')[],
        row: unknown,
      ) => Record<string, unknown>;
    };

    expect(
      mapper.toReportRow(['project'], {
        ...baseRow,
        projectId: fullRow.projectId,
        projectName: fullRow.projectName,
      }),
    ).toMatchObject({
      project: { name: 'Project Orion' },
      task: null,
      user: null,
      totalSeconds: 7200,
    });
    expect(mapper.toReportRow(['task'], fullRow)).toMatchObject({
      project: { name: 'Project Orion' },
      task: { title: 'Improve reports filters' },
      user: null,
    });
    expect(
      mapper.toReportRow(['user'], {
        ...baseRow,
        userId: pmUser.sub,
        userEmail: pmUser.email,
        userDisplayName: 'PM User',
        userAvatarUrl: null,
      }),
    ).toMatchObject({
      project: null,
      task: null,
      user: { email: pmUser.email },
    });
    expect(
      mapper.toReportRow(['project', 'user', 'task'], fullRow),
    ).toMatchObject({
      project: { name: 'Project Orion' },
      task: { title: 'Improve reports filters' },
      user: { email: pmUser.email },
    });
    expect(mapper.toReportRow(['project'], fullRow)).not.toHaveProperty(
      'groupBy',
    );
  });

  it('returns multi-level rows with the grouping path echoed', async () => {
    const { service } = createService('admin');
    const context = {
      groupBy: ['project', 'user'] as ['project', 'user'],
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
        totalSeconds: 3600,
        billableSeconds: 3600,
        nonBillableSeconds: 0,
        entryCount: 1,
        billableShare: 1,
      }),
    });
    Object.defineProperty(service, 'countRows', {
      value: vi.fn().mockResolvedValue(5),
    });
    Object.defineProperty(service, 'getRows', {
      value: vi.fn().mockResolvedValue([
        {
          projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9005',
          projectName: 'Project Orion',
          taskId: null,
          taskTitle: null,
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
      ]),
    });

    const report = await service.getTimeReport(adminUser, {
      page: 1,
      limit: 2,
      groupBy: ['project', 'user'],
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });

    expect(report.groupBy).toEqual(['project', 'user']);
    expect(report.items[0]).toMatchObject({
      project: { name: 'Project Orion' },
      user: { email: pmUser.email },
      task: null,
    });
    // meta counts top-level groups, not leaf rows
    expect(report.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
  });

  it('exports CSV using the same scoped context and filters', async () => {
    const { service } = createService('pm');
    const context = {
      groupBy: ['user'] as ['user'],
      scopeUserId: pmUser.sub,
      dateRange: {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-06-01T00:00:00.000Z',
      },
      conditions: [],
    };
    const buildQueryContext = vi.fn().mockResolvedValue(context);
    const getDetailedRows = vi.fn().mockResolvedValue([
      {
        projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9005',
        projectName: 'Project Orion',
        taskId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9006',
        taskTitle: 'Improve reports filters',
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
    Object.defineProperty(service, 'getDetailedRows', {
      value: getDetailedRows,
    });

    const result = await service.exportTimeReport(pmUser, {
      format: 'csv',
      groupBy: ['user'],
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });

    expect(buildQueryContext).toHaveBeenCalledWith(pmUser, {
      format: 'csv',
      groupBy: ['user'],
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });
    expect(getDetailedRows).toHaveBeenCalledWith(
      context,
      'totalSeconds',
      'desc',
    );
    expect(result.filename).toBe('time-report-2026-05-01_2026-06-01.csv');
    expect(result.contentType).toBe('text/csv; charset=utf-8');
    const csvRows = String(result.content).split('\n');
    const dataCells = csvRows[1]!.split(',');

    expect(dataCells[0]).toBe('user');
    expect(dataCells[1]).toBe('018f08cc-7f7f-7f7f-8f8f-9f9f9f9005');
    expect(dataCells[2]).toBe('Project Orion');
    expect(dataCells[3]).toBe('018f08cc-7f7f-7f7f-8f8f-9f9f9f9006');
    expect(dataCells[4]).toBe('Improve reports filters');
    expect(result.content).toContain(pmUser.email);
  });

  it('exports project-group CSV rows with task and user context', async () => {
    const { service } = createService('admin');
    const context = {
      groupBy: ['project'] as ['project'],
      scopeUserId: adminUser.sub,
      dateRange: {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-06-01T00:00:00.000Z',
      },
      conditions: [],
    };
    const getDetailedRows = vi.fn().mockResolvedValue([
      {
        projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9005',
        projectName: 'Project Orion',
        taskId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9006',
        taskTitle: 'Improve reports filters',
        userId: adminUser.sub,
        userEmail: adminUser.email,
        userDisplayName: 'Admin User',
        userAvatarUrl: null,
        totalSeconds: 3600,
        billableSeconds: 1800,
        nonBillableSeconds: 1800,
        entryCount: 1,
        firstStartedAt: new Date('2026-05-01T10:00:00.000Z'),
        lastStartedAt: new Date('2026-05-01T10:00:00.000Z'),
      },
    ]);

    Object.defineProperty(service, 'buildQueryContext', {
      value: vi.fn().mockResolvedValue(context),
    });
    Object.defineProperty(service, 'getDetailedRows', {
      value: getDetailedRows,
    });

    const result = await service.exportTimeReport(adminUser, {
      format: 'csv',
      groupBy: ['project'],
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });

    const csvRows = String(result.content).split('\n');
    const dataCells = csvRows[1]!.split(',');

    expect(dataCells[0]).toBe('project');
    expect(dataCells[3]).toBe('018f08cc-7f7f-7f7f-8f8f-9f9f9f9006');
    expect(dataCells[5]).toBe(adminUser.sub);
    expect(dataCells[6]).toBe(adminUser.email);
  });

  it('exports PDF with a pdf content type and filename', async () => {
    const { service } = createService('admin');
    const context = {
      groupBy: ['project', 'user'] as ['project', 'user'],
      scopeUserId: adminUser.sub,
      dateRange: {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-06-01T00:00:00.000Z',
      },
      conditions: [],
    };
    const buildPdfExport = vi
      .fn()
      .mockResolvedValue(Buffer.from('%PDF-1.7 test'));
    Object.defineProperty(service, 'buildQueryContext', {
      value: vi.fn().mockResolvedValue(context),
    });
    Object.defineProperty(service, 'buildPdfExport', {
      value: buildPdfExport,
    });

    const result = await service.exportTimeReport(adminUser, {
      format: 'pdf',
      groupBy: ['project', 'user'],
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });

    expect(buildPdfExport).toHaveBeenCalledWith(
      adminUser,
      context,
      expect.objectContaining({ format: 'pdf' }),
    );
    expect(result.contentType).toBe('application/pdf');
    expect(result.filename).toBe('time-report-2026-05-01_2026-06-01.pdf');
    expect(Buffer.isBuffer(result.content)).toBe(true);
  });

  it('records the joined grouping path as CSV metadata without collapsing rows', async () => {
    const { service } = createService('admin');
    const context = {
      groupBy: ['project', 'user'] as ['project', 'user'],
      scopeUserId: adminUser.sub,
      dateRange: {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-06-01T00:00:00.000Z',
      },
      conditions: [],
    };
    const detailedRow = {
      projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9005',
      projectName: 'Project Orion',
      taskId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9006',
      taskTitle: 'Improve reports filters',
      userId: adminUser.sub,
      userEmail: adminUser.email,
      userDisplayName: 'Admin User',
      userAvatarUrl: null,
      totalSeconds: 3600,
      billableSeconds: 1800,
      nonBillableSeconds: 1800,
      entryCount: 1,
      firstStartedAt: new Date('2026-05-01T10:00:00.000Z'),
      lastStartedAt: new Date('2026-05-01T10:00:00.000Z'),
    };
    Object.defineProperty(service, 'buildQueryContext', {
      value: vi.fn().mockResolvedValue(context),
    });
    Object.defineProperty(service, 'getDetailedRows', {
      value: vi
        .fn()
        .mockResolvedValue([
          detailedRow,
          { ...detailedRow, taskId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9007' },
        ]),
    });

    const result = await service.exportTimeReport(adminUser, {
      format: 'csv',
      groupBy: ['project', 'user'],
      sortBy: 'totalSeconds',
      sortOrder: 'desc',
    });

    const csvRows = String(result.content).split('\n');

    // header + one row per detailed project-task-user combination
    expect(csvRows).toHaveLength(3);
    expect(csvRows[1]!.split(',')[0]).toBe('project>user');
    expect(csvRows[2]!.split(',')[0]).toBe('project>user');
  });
});
