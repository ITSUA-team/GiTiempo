import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type {
  TimeReportEffectiveDateRange,
  TimeReportExportRequest,
  TimeReportGroupBy,
  TimeReportGroupByPath,
  TimeReportRequest,
  TimeReportResponse,
  TimeReportRow,
  TimeReportSortBy,
  TimeReportSortOrder,
  TimeReportTotals,
} from '@gitiempo/shared';
import type { AuthUser } from '../../auth/types/auth-user';
import { startOfNextUtcMonth, startOfUtcMonth } from '../../common/time';
import { DomainError } from '../../commons/errors/domain-error';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { MembersService } from '../../members/services/members.service';
import { projectAssignments } from '../../projects/schemas/project-assignments.schema';
import { projects } from '../../projects/schemas/projects.schema';
import { tasks } from '../../tasks/schemas/tasks.schema';
import { timeEntries } from '../../time-entries/schemas/time-entries.schema';
import { users } from '../../users/schemas/users.schema';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';
import { renderTimeReportPdf, type ReportPdfLeaf } from './report-pdf';

interface ExportResult {
  content: string | Buffer;
  contentType: string;
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
  groupBy: TimeReportGroupByPath;
  dateRange: TimeReportEffectiveDateRange;
  scopeUserId: string;
  workspaceId: string;
  /** PMs see only active public projects plus those assigned to them. */
  isProjectManager: boolean;
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
    query: TimeReportRequest,
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
    query: TimeReportExportRequest,
  ): Promise<ExportResult> {
    const context = await this.buildQueryContext(user, query);
    const filenameBase = `time-report-${dateForFilename(context.dateRange.dateFrom)}_${dateForFilename(context.dateRange.dateTo)}`;

    if (query.format === 'pdf') {
      const content = await this.buildPdfExport(user, context, query);

      return {
        content,
        contentType: 'application/pdf',
        filename: `${filenameBase}.pdf`,
      };
    }

    const rows = await this.getDetailedRows(
      context,
      query.sortBy,
      query.sortOrder,
    );

    return {
      content: toCsv(context.groupBy, rows),
      contentType: 'text/csv; charset=utf-8',
      filename: `${filenameBase}.csv`,
    };
  }

  /**
   * The PDF renders the grouped report at the requested path, so it reads
   * rows at grouped granularity (no pagination) rather than the CSV's
   * detailed project-task-user rows.
   */
  private async buildPdfExport(
    user: AuthUser,
    context: QueryContext,
    query: TimeReportExportRequest,
  ): Promise<Buffer> {
    const [summary, rows, workspaceRow, filterLabels] = await Promise.all([
      this.getSummary(context),
      this.getRows(
        context,
        query.sortBy,
        query.sortOrder,
        undefined,
        undefined,
      ),
      this.db
        .select({ name: workspaces.name })
        .from(workspaces)
        .where(eq(workspaces.id, user.workspaceId))
        .limit(1)
        .then(([row]) => row ?? null),
      this.getExportFilterLabels(context, query),
    ]);

    const leaves: ReportPdfLeaf[] = rows.map((row) => ({
      billableSeconds: Math.trunc(toNumber(row.billableSeconds)),
      identity: {
        ...(row.projectId
          ? {
              project: {
                key: row.projectId,
                label: row.projectName ?? '—',
              },
            }
          : {}),
        ...(row.taskId
          ? { task: { key: row.taskId, label: row.taskTitle ?? '—' } }
          : {}),
        ...(row.userId
          ? {
              user: {
                key: row.userId,
                label: row.userDisplayName?.trim() || row.userEmail || '—',
              },
            }
          : {}),
      },
      lastStartedAt: toIsoDateString(row.lastStartedAt),
      totalSeconds: Math.trunc(toNumber(row.totalSeconds)),
    }));

    return renderTimeReportPdf({
      dateRange: context.dateRange,
      filters: filterLabels,
      generatedAt: new Date(),
      groupBy: context.groupBy,
      leaves,
      summary,
      workspaceName: workspaceRow?.name ?? 'Workspace',
    });
  }

  /**
   * Resolves the filter names printed on the PDF.
   *
   * These lookups must carry the same scope as the report itself. Matching on
   * id alone let a caller pass any project or user id in the database and read
   * its name back off the PDF, even though the rows stayed empty — a
   * cross-workspace disclosure, and for a PM a way to read the name of a
   * private project they are not assigned to. An out-of-scope id now resolves
   * to no row, so the filter prints as "All".
   */
  private async getExportFilterLabels(
    context: QueryContext,
    query: TimeReportExportRequest,
  ): Promise<{ memberLabel: string | null; projectLabel: string | null }> {
    const projectConditions =
      query.projectId === undefined
        ? []
        : [
            eq(projects.id, query.projectId),
            eq(projects.workspaceId, context.workspaceId),
            ...(context.isProjectManager
              ? [
                  eq(projects.isActive, true),
                  or(
                    eq(projects.visibility, 'public'),
                    eq(projectAssignments.userId, context.scopeUserId),
                  )!,
                ]
              : []),
          ];

    const [projectRow, userRow] = await Promise.all([
      query.projectId !== undefined
        ? this.db
            .select({ name: projects.name })
            .from(projects)
            .leftJoin(
              projectAssignments,
              this.scopeAssignmentJoinCondition(context.scopeUserId),
            )
            .where(and(...projectConditions))
            .limit(1)
            .then(([row]) => row ?? null)
        : Promise.resolve(null),
      query.userId !== undefined
        ? this.db
            .select({ displayName: users.displayName, email: users.email })
            .from(users)
            .innerJoin(
              workspaceMembers,
              and(
                eq(workspaceMembers.userId, users.id),
                eq(workspaceMembers.workspaceId, context.workspaceId),
              )!,
            )
            .where(eq(users.id, query.userId))
            .limit(1)
            .then(([row]) => row ?? null)
        : Promise.resolve(null),
    ]);

    return {
      memberLabel: userRow
        ? userRow.displayName?.trim() || userRow.email
        : null,
      projectLabel: projectRow?.name ?? null,
    };
  }

  private async buildQueryContext(
    user: AuthUser,
    query: TimeReportRequest | TimeReportExportRequest,
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
      workspaceId: user.workspaceId,
      isProjectManager: membership.role === 'pm',
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

  // Pagination counts and pages top-level groups of the requested path, so a
  // page always carries complete subtrees and client-derived subtotals are
  // exact. Distinct first-dimension keys over the filtered join equal the
  // grouped row count for single-level paths, so both cases share this count.
  private async countRows(context: QueryContext): Promise<number> {
    const keyColumn = dimensionKeyColumn(context.groupBy[0]!);
    const [row] = await this.db
      .select({ value: sql<number>`COUNT(DISTINCT ${keyColumn})` })
      .from(timeEntries)
      .innerJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(
        projectAssignments,
        this.scopeAssignmentJoinCondition(context.scopeUserId),
      )
      .where(and(...context.conditions));

    return toNumber(row?.value);
  }

  private async getRows(
    context: QueryContext,
    sortBy: TimeReportSortBy,
    sortOrder: TimeReportSortOrder,
    page: number | undefined,
    limit: number | undefined,
  ): Promise<AggregateRow[]> {
    if (context.groupBy.length === 1) {
      const orderBy = getOrderBy(sortBy, sortOrder);
      let query = this.groupedRowsQuery(context).orderBy(orderBy);
      if (page !== undefined && limit !== undefined) {
        query = query.limit(limit).offset((page - 1) * limit) as typeof query;
      }

      return query;
    }

    const leafOrder = leafOrderBy(context.groupBy, sortBy, sortOrder);

    /**
     * Unpaginated callers (the PDF) take every top-level group, so restricting
     * rows to "all keys that exist" filters nothing. Reading the key list to
     * build that IN clause cost an extra grouped scan, held every key in
     * memory, and bound one query parameter per key — enough to hit Postgres'
     * parameter ceiling on a large workspace. Skip straight to the rows.
     */
    if (page === undefined || limit === undefined) {
      return this.groupedRowsQuery(context).orderBy(...leafOrder);
    }

    const keys = await this.getTopLevelKeys(
      context,
      sortBy,
      sortOrder,
      page,
      limit,
    );
    if (keys.length === 0) {
      return [];
    }

    const keyColumn = dimensionKeyColumn(context.groupBy[0]!);

    return this.groupedRowsQuery(context, inArray(keyColumn, keys)).orderBy(
      ...leafOrder,
    );
  }

  private async getTopLevelKeys(
    context: QueryContext,
    sortBy: TimeReportSortBy,
    sortOrder: TimeReportSortOrder,
    page: number | undefined,
    limit: number | undefined,
  ): Promise<string[]> {
    const dimension = context.groupBy[0]!;
    const keyColumn = dimensionKeyColumn(dimension);
    const direction = sortOrder === 'asc' ? asc : desc;
    let query = this.db
      .select({ key: keyColumn })
      .from(timeEntries)
      .innerJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(
        projectAssignments,
        this.scopeAssignmentJoinCondition(context.scopeUserId),
      )
      .where(and(...context.conditions))
      .groupBy(keyColumn)
      .orderBy(
        direction(topLevelOrderExpression(dimension, sortBy)),
        asc(keyColumn),
      );
    if (page !== undefined && limit !== undefined) {
      query = query.limit(limit).offset((page - 1) * limit) as typeof query;
    }

    const rows = await query;

    return rows.map((row) => row.key);
  }

  private async getDetailedRows(
    context: QueryContext,
    sortBy: TimeReportSortBy,
    sortOrder: TimeReportSortOrder,
  ): Promise<AggregateRow[]> {
    return this.detailedRowsQuery(context).orderBy(
      getOrderBy(sortBy, sortOrder),
    );
  }

  private groupedRowsQuery(context: QueryContext, extraCondition?: SQL) {
    const selection = this.groupSelection(context.groupBy);
    const conditions = extraCondition
      ? [...context.conditions, extraCondition]
      : context.conditions;

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
      .where(and(...conditions))
      .groupBy(...this.groupByColumns(context.groupBy));
  }

  private detailedRowsQuery(context: QueryContext) {
    return this.db
      .select(this.detailedSelection())
      .from(timeEntries)
      .innerJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(
        projectAssignments,
        this.scopeAssignmentJoinCondition(context.scopeUserId),
      )
      .where(and(...context.conditions))
      .groupBy(...this.detailedGroupByColumns());
  }

  private scopeAssignmentJoinCondition(userId: string): SQL {
    return and(
      eq(projectAssignments.projectId, projects.id),
      eq(projectAssignments.userId, userId),
    )!;
  }

  private aggregateSelection() {
    return {
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
  }

  private detailedSelection() {
    return {
      groupId:
        sql<string>`CONCAT(${projects.id}, ':', ${tasks.id}, ':', ${users.id})`.as(
          'group_id',
        ),
      projectId: projects.id,
      projectName: projects.name,
      taskId: tasks.id,
      taskTitle: tasks.title,
      userId: users.id,
      userEmail: users.email,
      userDisplayName: users.displayName,
      userAvatarUrl: users.avatarUrl,
      ...this.aggregateSelection(),
    };
  }

  // Identity columns follow the requested path: dimensions on the path select
  // their context (task always brings its project), everything else stays
  // NULL so the unified row shape reports exactly what was grouped.
  private groupSelection(groupBy: TimeReportGroupByPath) {
    const withProject = groupBy.includes('project') || groupBy.includes('task');
    const withTask = groupBy.includes('task');
    const withUser = groupBy.includes('user');
    const keyColumns = groupBy.map((dimension) =>
      dimensionKeyColumn(dimension),
    );

    return {
      groupId: sql<string>`CONCAT_WS(':', ${sql.join(keyColumns, sql`, `)})`.as(
        'group_id',
      ),
      projectId: withProject ? projects.id : sql<null>`NULL`,
      projectName: withProject ? projects.name : sql<null>`NULL`,
      taskId: withTask ? tasks.id : sql<null>`NULL`,
      taskTitle: withTask ? tasks.title : sql<null>`NULL`,
      userId: withUser ? users.id : sql<null>`NULL`,
      userEmail: withUser ? users.email : sql<null>`NULL`,
      userDisplayName: withUser ? users.displayName : sql<null>`NULL`,
      userAvatarUrl: withUser ? users.avatarUrl : sql<null>`NULL`,
      ...this.aggregateSelection(),
    };
  }

  private groupByColumns(groupBy: TimeReportGroupByPath) {
    const withProject = groupBy.includes('project') || groupBy.includes('task');

    return [
      ...(withProject ? [projects.id, projects.name] : []),
      ...(groupBy.includes('task') ? [tasks.id, tasks.title] : []),
      ...(groupBy.includes('user')
        ? [users.id, users.email, users.displayName, users.avatarUrl]
        : []),
    ];
  }

  private detailedGroupByColumns() {
    return [
      projects.id,
      projects.name,
      tasks.id,
      tasks.title,
      users.id,
      users.email,
      users.displayName,
      users.avatarUrl,
    ];
  }

  private toReportRow(
    groupBy: TimeReportGroupByPath,
    row: AggregateRow,
  ): TimeReportRow {
    const withProject = groupBy.includes('project') || groupBy.includes('task');

    return {
      project: withProject ? requireProject(row) : null,
      task: groupBy.includes('task') ? requireTask(row) : null,
      user: groupBy.includes('user') ? requireUser(row) : null,
      ...toAggregateTiming(row),
    };
  }
}

function dimensionKeyColumn(dimension: TimeReportGroupBy) {
  if (dimension === 'task') return tasks.id;
  if (dimension === 'user') return users.id;
  return projects.id;
}

// Orders the page of top-level groups. Metric sorts aggregate over the whole
// group; identity sorts only make sense for the top dimension itself and fall
// back to total time otherwise.
function topLevelOrderExpression(
  dimension: TimeReportGroupBy,
  sortBy: TimeReportSortBy,
): SQL {
  const totalSeconds = sql`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`;
  if (sortBy === 'project' || sortBy === 'task' || sortBy === 'user') {
    if (sortBy !== dimension) {
      return totalSeconds;
    }
    if (dimension === 'task') return sql`${tasks.title}`;
    if (dimension === 'user') return sql`${users.email}`;
    return sql`${projects.name}`;
  }

  const metrics: Record<Exclude<TimeReportSortBy, TimeReportGroupBy>, SQL> = {
    totalSeconds,
    billableSeconds: sql`COALESCE(SUM(CASE WHEN ${timeEntries.isBillable} THEN ${timeEntries.durationSeconds} ELSE 0 END), 0)`,
    entryCount: sql`COUNT(*)`,
    firstStartedAt: sql`MIN(${timeEntries.startedAt})`,
    lastStartedAt: sql`MAX(${timeEntries.startedAt})`,
  };

  return metrics[sortBy];
}

// Leaf rows come back in path order so subtrees read contiguously; the client
// re-sorts siblings per level from subtotals (design D2/D3).
function leafOrderBy(
  groupBy: TimeReportGroupByPath,
  sortBy: TimeReportSortBy,
  sortOrder: TimeReportSortOrder,
): SQL[] {
  const identityColumns = {
    project: projects.name,
    task: tasks.title,
    user: users.email,
  };

  return [
    ...groupBy.map((dimension) => asc(identityColumns[dimension])),
    getOrderBy(sortBy, sortOrder),
  ];
}

function resolveDateRange(
  query: TimeReportRequest | TimeReportExportRequest,
): TimeReportEffectiveDateRange {
  const now = new Date();
  const defaultFrom = startOfUtcMonth(now);
  const defaultTo = startOfNextUtcMonth(now);

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
    throw DomainError.internal(
      'report_project_context_missing',
      'Report project row is missing project context',
    );
  }
  return { id: row.projectId, name: row.projectName };
}

function requireTask(row: AggregateRow) {
  if (!row.taskId || !row.taskTitle) {
    throw DomainError.internal(
      'report_task_context_missing',
      'Report task row is missing task context',
    );
  }
  return { id: row.taskId, title: row.taskTitle };
}

function requireUser(row: AggregateRow) {
  if (!row.userId || !row.userEmail) {
    throw DomainError.internal(
      'report_user_context_missing',
      'Report user row is missing user context',
    );
  }
  return {
    id: row.userId,
    email: row.userEmail,
    displayName: row.userDisplayName,
    avatarUrl: row.userAvatarUrl,
  };
}

/**
 * Fixed labels for the group-by column. The dimension is already a validated
 * enum, but mapping through a constant keeps request input out of the exported
 * file entirely rather than relying on validation upstream.
 */
const csvGroupByLabels: Record<TimeReportGroupBy, string> = {
  project: 'project',
  task: 'task',
  user: 'user',
};

function toCsv(groupBy: TimeReportGroupByPath, rows: AggregateRow[]): string {
  const groupByPath = groupBy
    .map((dimension) => csvGroupByLabels[dimension])
    .join('>');
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
  const lines = rows.map((row) => {
    const timing = toAggregateTiming(row);

    return [
      groupByPath,
      row.projectId ?? '',
      row.projectName ?? '',
      row.taskId ?? '',
      row.taskTitle ?? '',
      row.userId ?? '',
      row.userEmail ?? '',
      row.userDisplayName ?? '',
      timing.totalSeconds,
      timing.billableSeconds,
      timing.nonBillableSeconds,
      timing.entryCount,
      timing.firstStartedAt ?? '',
      timing.lastStartedAt ?? '',
    ];
  });

  return [header, ...lines]
    .map((line) => line.map(csvCell).join(','))
    .join('\n');
}

/**
 * Characters that make a spreadsheet treat a cell as a formula. Covers the
 * ASCII set plus the full-width variants that some locales (notably Japanese
 * input) also evaluate, and the whitespace controls that can shift content
 * into a new cell.
 */
const csvFormulaTrigger = /^[=+\-@\t\r\n＝＋－＠]/;

/**
 * Renders one CSV field, defused against formula injection (CWE-1236).
 *
 * Project names, task titles and display names are workspace-controlled and
 * land in this file, so a project named `=cmd|'/c calc'!A1` would otherwise
 * execute when a colleague opens the export.
 *
 * Every field is quoted unconditionally, not only when it contains our comma.
 * Excel uses `;` as the separator in several locales, so an unquoted value
 * carrying `;` would split there and open a *new* cell whose content starts
 * with a trigger character — defusing only the first character of the original
 * value does not stop that.
 *
 * Known limitation: Excel may drop the quoting and apostrophe when the file is
 * saved and re-opened, at which point a formula can reactivate. The
 * Excel-proof alternative is a leading TAB instead of an apostrophe, which
 * survives the round-trip but leaves a tab in the data for programmatic
 * consumers. This export is read by both, so it takes the non-destructive
 * option.
 */
function csvCell(value: string | number): string {
  const raw = String(value);
  // Neutralise before quoting so the apostrophe sits inside the quotes.
  const guarded = csvFormulaTrigger.test(raw) ? `'${raw}` : raw;

  return `"${guarded.replace(/"/g, '""')}"`;
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
