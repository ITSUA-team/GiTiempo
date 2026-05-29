import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type {
  TimeReportEffectiveDateRange,
  TimeReportExportQuery,
  TimeReportGroupBy,
  TimeReportQuery,
  TimeReportResponse,
  TimeReportRow,
  TimeReportSortBy,
  TimeReportSortOrder,
  TimeReportTotals,
} from '@gitiempo/shared';
import type { AuthUser } from '../../auth/types/auth-user';
import { nextUtcMonth, startOfUtcMonth } from '../../common/time';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { MembersService } from '../../members/services/members.service';
import { projectAssignments } from '../../projects/schemas/project-assignments.schema';
import { projects } from '../../projects/schemas/projects.schema';
import { tasks } from '../../tasks/schemas/tasks.schema';
import { timeEntries } from '../../time-entries/schemas/time-entries.schema';
import { users } from '../../users/schemas/users.schema';

interface ExportResult {
  content: string;
  filename: string;
}

interface AggregateRow {
  groupId: string;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  taskTitle: string | null;
  userId: string | null;
  userEmail: string | null;
  userDisplayName: string | null;
  userAvatarUrl: string | null;
  totalSeconds: number | string | null;
  billableSeconds: number | string | null;
  nonBillableSeconds: number | string | null;
  entryCount: number | string | null;
  firstStartedAt: Date | string | null;
  lastStartedAt: Date | string | null;
}

interface QueryContext {
  groupBy: TimeReportGroupBy;
  dateRange: TimeReportEffectiveDateRange;
  scopeUserId: string;
  conditions: SQL[];
}

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly members: MembersService,
  ) {}

  async getTimeReport(
    user: AuthUser,
    query: TimeReportQuery,
  ): Promise<TimeReportResponse> {
    const context = await this.buildQueryContext(user, query);
    const [summary, total, rows] = await Promise.all([
      this.getSummary(context),
      this.countRows(context),
      this.getRows(
        context,
        query.sortBy,
        query.sortOrder,
        query.page,
        query.limit,
      ),
    ]);

    return {
      groupBy: context.groupBy,
      dateRange: context.dateRange,
      summary,
      items: rows.map((row) => this.toReportRow(context.groupBy, row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  async exportTimeReport(
    user: AuthUser,
    query: TimeReportExportQuery,
  ): Promise<ExportResult> {
    const context = await this.buildQueryContext(user, query);
    const rows = await this.getRows(
      context,
      query.sortBy,
      query.sortOrder,
      undefined,
      undefined,
    );
    const content = toCsv(
      rows.map((row) => this.toReportRow(context.groupBy, row)),
    );
    const filename = `time-report-${dateForFilename(context.dateRange.dateFrom)}_${dateForFilename(context.dateRange.dateTo)}.csv`;

    return { content, filename };
  }

  private async buildQueryContext(
    user: AuthUser,
    query: TimeReportQuery | TimeReportExportQuery,
  ): Promise<QueryContext> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    if (membership.role !== 'admin' && membership.role !== 'pm') {
      throw new ForbiddenException('Forbidden');
    }

    const dateRange = resolveDateRange(query);
    const conditions: SQL[] = [
      eq(timeEntries.workspaceId, user.workspaceId),
      eq(tasks.workspaceId, user.workspaceId),
      eq(projects.workspaceId, user.workspaceId),
      isNotNull(timeEntries.endedAt),
      isNotNull(timeEntries.durationSeconds),
      gte(timeEntries.startedAt, new Date(dateRange.dateFrom)),
      lt(timeEntries.startedAt, new Date(dateRange.dateTo)),
    ];

    if (membership.role === 'pm') {
      conditions.push(
        eq(projects.isActive, true),
        or(
          eq(projects.visibility, 'public'),
          eq(projectAssignments.userId, user.sub),
        )!,
      );
    }
    if (query.projectId !== undefined) {
      conditions.push(eq(projects.id, query.projectId));
    }
    if (query.userId !== undefined) {
      conditions.push(eq(timeEntries.userId, query.userId));
    }
    if (query.search !== undefined) {
      const searchPattern = `%${escapeLikePattern(query.search)}%`;
      conditions.push(
        or(
          sql`${projects.name} ILIKE ${searchPattern} ESCAPE '\'`,
          sql`${tasks.title} ILIKE ${searchPattern} ESCAPE '\'`,
          sql`${users.displayName} ILIKE ${searchPattern} ESCAPE '\'`,
          sql`${users.email} ILIKE ${searchPattern} ESCAPE '\'`,
        )!,
      );
    }

    return {
      groupBy: query.groupBy,
      dateRange,
      scopeUserId: user.sub,
      conditions,
    };
  }

  private async getSummary(context: QueryContext): Promise<TimeReportTotals> {
    const [row] = await this.db
      .select({
        totalSeconds: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`,
        billableSeconds: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.isBillable} THEN ${timeEntries.durationSeconds} ELSE 0 END), 0)`,
        nonBillableSeconds: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.isBillable} THEN 0 ELSE ${timeEntries.durationSeconds} END), 0)`,
        entryCount: count(),
      })
      .from(timeEntries)
      .innerJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(
        projectAssignments,
        this.scopeAssignmentJoinCondition(context.scopeUserId),
      )
      .where(and(...context.conditions));

    return toTotals(row);
  }

  private async countRows(context: QueryContext): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`COUNT(*)` })
      .from(this.groupedSubquery(context));

    return toNumber(row?.value);
  }

  private async getRows(
    context: QueryContext,
    sortBy: TimeReportSortBy,
    sortOrder: TimeReportSortOrder,
    page: number | undefined,
    limit: number | undefined,
  ): Promise<AggregateRow[]> {
    const orderBy = getOrderBy(sortBy, sortOrder);
    let query = this.groupedRowsQuery(context).orderBy(orderBy);
    if (page !== undefined && limit !== undefined) {
      query = query.limit(limit).offset((page - 1) * limit) as typeof query;
    }

    return query;
  }

  private groupedRowsQuery(context: QueryContext) {
    const selection = this.groupSelection(context.groupBy);

    return this.db
      .select(selection)
      .from(timeEntries)
      .innerJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(
        projectAssignments,
        this.scopeAssignmentJoinCondition(context.scopeUserId),
      )
      .where(and(...context.conditions))
      .groupBy(...this.groupByColumns(context.groupBy));
  }

  private groupedSubquery(context: QueryContext) {
    return this.groupedRowsQuery(context).as('report_rows');
  }

  private scopeAssignmentJoinCondition(userId: string): SQL {
    return and(
      eq(projectAssignments.projectId, projects.id),
      eq(projectAssignments.userId, userId),
    )!;
  }

  private groupSelection(groupBy: TimeReportGroupBy) {
    const aggregateSelection = {
      totalSeconds:
        sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`.as(
          'total_seconds',
        ),
      billableSeconds:
        sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.isBillable} THEN ${timeEntries.durationSeconds} ELSE 0 END), 0)`.as(
          'billable_seconds',
        ),
      nonBillableSeconds:
        sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.isBillable} THEN 0 ELSE ${timeEntries.durationSeconds} END), 0)`.as(
          'non_billable_seconds',
        ),
      entryCount: count().as('entry_count'),
      firstStartedAt: sql<
        Date | string | null
      >`MIN(${timeEntries.startedAt})`.as('first_started_at'),
      lastStartedAt: sql<
        Date | string | null
      >`MAX(${timeEntries.startedAt})`.as('last_started_at'),
    };

    if (groupBy === 'task') {
      return {
        groupId: tasks.id,
        projectId: projects.id,
        projectName: projects.name,
        taskId: tasks.id,
        taskTitle: tasks.title,
        userId: sql<null>`NULL`,
        userEmail: sql<null>`NULL`,
        userDisplayName: sql<null>`NULL`,
        userAvatarUrl: sql<null>`NULL`,
        ...aggregateSelection,
      };
    }
    if (groupBy === 'user') {
      return {
        groupId: users.id,
        projectId: sql<null>`NULL`,
        projectName: sql<null>`NULL`,
        taskId: sql<null>`NULL`,
        taskTitle: sql<null>`NULL`,
        userId: users.id,
        userEmail: users.email,
        userDisplayName: users.displayName,
        userAvatarUrl: users.avatarUrl,
        ...aggregateSelection,
      };
    }

    return {
      groupId: projects.id,
      projectId: projects.id,
      projectName: projects.name,
      taskId: sql<null>`NULL`,
      taskTitle: sql<null>`NULL`,
      userId: sql<null>`NULL`,
      userEmail: sql<null>`NULL`,
      userDisplayName: sql<null>`NULL`,
      userAvatarUrl: sql<null>`NULL`,
      ...aggregateSelection,
    };
  }

  private groupByColumns(groupBy: TimeReportGroupBy) {
    if (groupBy === 'task') return [tasks.id, projects.id];
    if (groupBy === 'user') return [users.id];
    return [projects.id];
  }

  private toReportRow(
    groupBy: TimeReportGroupBy,
    row: AggregateRow,
  ): TimeReportRow {
    const totals = toAggregateTiming(row);
    if (groupBy === 'task') {
      return {
        groupBy,
        project: requireProject(row),
        task: requireTask(row),
        user: null,
        ...totals,
      };
    }
    if (groupBy === 'user') {
      return {
        groupBy,
        project: null,
        task: null,
        user: requireUser(row),
        ...totals,
      };
    }

    return {
      groupBy,
      project: requireProject(row),
      task: null,
      user: null,
      ...totals,
    };
  }
}

function resolveDateRange(
  query: TimeReportQuery | TimeReportExportQuery,
): TimeReportEffectiveDateRange {
  const now = new Date();
  const defaultFrom = startOfUtcMonth(now);
  const defaultTo = nextUtcMonth(now);

  return {
    dateFrom: (query.dateFrom
      ? new Date(query.dateFrom)
      : defaultFrom
    ).toISOString(),
    dateTo: (query.dateTo ? new Date(query.dateTo) : defaultTo).toISOString(),
  };
}

function getOrderBy(
  sortBy: TimeReportSortBy,
  sortOrder: TimeReportSortOrder,
): SQL {
  const direction = sortOrder === 'asc' ? asc : desc;
  const sortable = {
    project: sql`project_name`,
    task: sql`task_title`,
    user: sql`user_email`,
    totalSeconds: sql`total_seconds`,
    billableSeconds: sql`billable_seconds`,
    entryCount: sql`entry_count`,
    firstStartedAt: sql`first_started_at`,
    lastStartedAt: sql`last_started_at`,
  } satisfies Record<TimeReportSortBy, SQL>;

  return direction(sortable[sortBy]);
}

function toTotals(
  row:
    | {
        totalSeconds?: number | string | null;
        billableSeconds?: number | string | null;
        nonBillableSeconds?: number | string | null;
        entryCount?: number | string | null;
      }
    | null
    | undefined,
): TimeReportTotals {
  const totalSeconds = Math.trunc(toNumber(row?.totalSeconds));
  const billableSeconds = Math.trunc(toNumber(row?.billableSeconds));
  const nonBillableSeconds = Math.trunc(toNumber(row?.nonBillableSeconds));
  return {
    totalSeconds,
    billableSeconds,
    nonBillableSeconds,
    entryCount: Math.trunc(toNumber(row?.entryCount)),
    billableShare: totalSeconds > 0 ? billableSeconds / totalSeconds : null,
  };
}

function toAggregateTiming(row: AggregateRow) {
  return {
    ...toTotals(row),
    firstStartedAt: toIsoDateString(row.firstStartedAt),
    lastStartedAt: toIsoDateString(row.lastStartedAt),
  };
}

function requireProject(row: AggregateRow) {
  if (!row.projectId || !row.projectName) {
    throw new Error('Report project row is missing project context');
  }
  return { id: row.projectId, name: row.projectName };
}

function requireTask(row: AggregateRow) {
  if (!row.taskId || !row.taskTitle) {
    throw new Error('Report task row is missing task context');
  }
  return { id: row.taskId, title: row.taskTitle };
}

function requireUser(row: AggregateRow) {
  if (!row.userId || !row.userEmail) {
    throw new Error('Report user row is missing user context');
  }
  return {
    id: row.userId,
    email: row.userEmail,
    displayName: row.userDisplayName,
    avatarUrl: row.userAvatarUrl,
  };
}

function toCsv(rows: TimeReportRow[]): string {
  const header = [
    'Group By',
    'Project ID',
    'Project',
    'Task ID',
    'Task',
    'User ID',
    'User Email',
    'User Name',
    'Total Seconds',
    'Billable Seconds',
    'Non-Billable Seconds',
    'Entry Count',
    'First Started At',
    'Last Started At',
  ];
  const lines = rows.map((row) => [
    row.groupBy,
    row.project?.id ?? '',
    row.project?.name ?? '',
    row.task?.id ?? '',
    row.task?.title ?? '',
    row.user?.id ?? '',
    row.user?.email ?? '',
    row.user?.displayName ?? '',
    row.totalSeconds,
    row.billableSeconds,
    row.nonBillableSeconds,
    row.entryCount,
    row.firstStartedAt ?? '',
    row.lastStartedAt ?? '',
  ]);

  return [header, ...lines]
    .map((line) => line.map(csvCell).join(','))
    .join('\n');
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function dateForFilename(value: string): string {
  return value.slice(0, 10);
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function toNumber(value: number | string | null | undefined): number {
  if (value === undefined || value === null) return 0;
  return typeof value === 'number' ? value : Number(value);
}

function toIsoDateString(
  value: Date | string | null | undefined,
): string | null {
  if (value === undefined || value === null) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
