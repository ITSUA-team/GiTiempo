import { renderInvoicePdf } from './invoice-pdf';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type {
  CreateInvoiceInput,
  EligibleEntriesQuery,
  EligibleEntriesResponse,
  InvoiceDefaultsResponse,
  InvoiceListItem,
  InvoiceListQuery,
  InvoiceListResponse,
  InvoiceResponse,
  InvoiceStatus,
  InvoiceStatsResponse,
  InvoiceTimeEntrySummary,
  UpdateInvoiceInput,
} from '@gitiempo/shared';
import type { AuthUser } from '../../auth/types/auth-user';
import { DomainError } from '../../commons/errors/domain-error';
import { escapeLikePattern } from '../../commons/utils/escape-like-pattern';
import { DRIZZLE } from '../../db/db.constants';
import type { DbTransaction, DrizzleDB } from '../../db/db.types';
import {
  MembersService,
  type ActiveMembership,
} from '../../members/services/members.service';
import { projectAssignments } from '../../projects/schemas/project-assignments.schema';
import { projects } from '../../projects/schemas/projects.schema';
import { tasks } from '../../tasks/schemas/tasks.schema';
import { timeEntries } from '../../time-entries/schemas/time-entries.schema';
import { users } from '../../users/schemas/users.schema';
import { workspaceSettings } from '../../workspaces/schemas/workspace-settings.schema';
import { invoiceRowSelection, invoices } from '../schemas/invoices.schema';

interface InvoiceDetailRow {
  reference: string;
  revision: number;
  document: Record<string, unknown> | null;
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  status: InvoiceStatus;
  dateFrom: string;
  dateTo: string;
  hourlyRate: number;
  currency: string;
  discountPercent: number;
  totalHours: number;
  totalAmount: number;
  roundingStepMinutes: number;
  notes: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  projectName: string | null;
}

interface LinkedTimeEntryRow {
  id: string;
  taskId: string;
  userId: string;
  userName: string | null;
  taskName: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  isBillable: boolean;
  description: string | null;
}

// Shared column selections so list, detail, and transaction reads stay in
// sync with the response mapping in one place.
const invoiceDetailSelection = {
  reference: invoices.reference,
  revision: invoices.revision,
  document: invoices.document,
  id: invoices.id,
  workspaceId: invoices.workspaceId,
  projectId: invoices.projectId,
  title: invoices.title,
  status: invoices.status,
  dateFrom: invoices.dateFrom,
  dateTo: invoices.dateTo,
  hourlyRate: invoices.hourlyRate,
  currency: invoices.currency,
  discountPercent: invoices.discountPercent,
  totalHours: invoices.totalHours,
  totalAmount: invoices.totalAmount,
  roundingStepMinutes: invoices.roundingStepMinutes,
  notes: invoices.notes,
  createdBy: invoices.createdBy,
  createdByName: users.displayName,
  createdAt: invoices.createdAt,
  updatedAt: invoices.updatedAt,
  projectName: projects.name,
} as const;

const linkedTimeEntrySelection = {
  id: timeEntries.id,
  taskId: timeEntries.taskId,
  userId: timeEntries.userId,
  userName: users.displayName,
  taskName: tasks.title,
  startedAt: timeEntries.startedAt,
  endedAt: timeEntries.endedAt,
  durationSeconds: timeEntries.durationSeconds,
  isBillable: timeEntries.isBillable,
  description: timeEntries.description,
} as const;

// Selection without user/task name joins — used in the createInvoice
// eligibility query where FOR UPDATE requires locking only time_entries
// rows. LEFT JOINs are incompatible with FOR UPDATE in PostgreSQL.
const eligibleEntrySelection = {
  id: timeEntries.id,
  taskId: timeEntries.taskId,
  userId: timeEntries.userId,
  userName: sql<string | null>`null`,
  taskName: sql<string | null>`null`,
  startedAt: timeEntries.startedAt,
  endedAt: timeEntries.endedAt,
  durationSeconds: timeEntries.durationSeconds,
  isBillable: timeEntries.isBillable,
  description: timeEntries.description,
} as const;

// NUMERIC(12,2) ceiling: 9_999_999_999.99. Snapshot totals above this cannot
// be stored; createInvoice rejects them with 422 before touching the DB.
const MAX_TOTAL_AMOUNT = 9_999_999_999.99;

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly members: MembersService,
  ) {}

  // ── Defaults ──────────────────────────────────────────────────────

  /** PM-accessible snapshot of the workspace invoice defaults. */
  async getInvoiceDefaults(user: AuthUser): Promise<InvoiceDefaultsResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    this.assertInvoiceViewAccess(membership);

    const [settings] = await this.db
      .select({
        currency: workspaceSettings.currency,
        billingProfile: workspaceSettings.billingProfile,
        defaultHourlyRate: workspaceSettings.defaultHourlyRate,
        timeRoundingStepMinutes: workspaceSettings.timeRoundingStepMinutes,
      })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, user.workspaceId))
      .limit(1);

    return {
      billingProfile: settings?.billingProfile ?? null,
      currency: settings?.currency ?? null,
      defaultHourlyRate: settings?.defaultHourlyRate ?? null,
      timeRoundingStepMinutes: settings?.timeRoundingStepMinutes ?? 1,
    };
  }

  async downloadPdf(user: AuthUser, id: string) {
    const invoice = await this.getInvoice(user, id);
    return {
      reference: invoice.reference ?? invoice.id,
      bytes: await renderInvoicePdf(invoice),
    };
  }

  private async authorizeGroups(user: AuthUser) {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    this.assertInvoiceViewAccess(membership);
  }

  private async requireGroup(
    user: AuthUser,
    groupId: string,
    db: DrizzleDB | DbTransaction = this.db,
  ) {
    const result = await db.execute(
      sql`select id from invoice_groups where id=${groupId}::uuid and owner_id=${user.sub}::uuid and workspace_id=${user.workspaceId}::uuid`,
    );
    if (!result.rows.length) throw new NotFoundException('Group not found');
  }

  async listGroups(user: AuthUser) {
    await this.authorizeGroups(user);
    const result = await this.db.execute(
      sql`select id,name from invoice_groups where owner_id=${user.sub}::uuid and workspace_id=${user.workspaceId}::uuid order by name`,
    );
    const allCount = (await this.listInvoices(user, { page: 1, limit: 1 })).meta
      .total;
    const ungroupedCount = (
      await this.listInvoices(user, { page: 1, limit: 1, groupId: 'ungrouped' })
    ).meta.total;
    const groups = await Promise.all(
      result.rows.map(async (row) => ({
        id: String(row.id),
        name: String(row.name),
        count: (
          await this.listInvoices(user, {
            page: 1,
            limit: 1,
            groupId: String(row.id),
          })
        ).meta.total,
      })),
    );
    return { groups, allCount, ungroupedCount };
  }

  async saveGroup(user: AuthUser, name: string, id?: string) {
    await this.authorizeGroups(user);
    if (id) await this.requireGroup(user, id);
    try {
      const result = id
        ? await this.db.execute(
            sql`update invoice_groups set name=${name.trim()} where id=${id}::uuid and owner_id=${user.sub}::uuid and workspace_id=${user.workspaceId}::uuid returning id,name`,
          )
        : await this.db.execute(
            sql`insert into invoice_groups(workspace_id,owner_id,name) values(${user.workspaceId}::uuid,${user.sub}::uuid,${name.trim()}) returning id,name`,
          );
      return { ...result.rows[0], count: 0 };
    } catch (error) {
      if (
        (error as { code?: string; cause?: { code?: string } }).code ===
          '23505' ||
        (error as { cause?: { code?: string } }).cause?.code === '23505'
      )
        throw new DomainError(
          'invoice_group_name_exists',
          'A group with this name already exists',
          409,
        );
      throw error;
    }
  }

  async deleteGroup(user: AuthUser, id: string) {
    await this.authorizeGroups(user);
    await this.requireGroup(user, id);
    await this.db.execute(
      sql`delete from invoice_groups where id=${id}::uuid and owner_id=${user.sub}::uuid and workspace_id=${user.workspaceId}::uuid`,
    );
  }

  async moveInvoices(
    user: AuthUser,
    invoiceIds: string[],
    groupId: string | null,
  ) {
    await this.authorizeGroups(user);
    await this.db.transaction(async (tx) => {
      if (groupId) await this.requireGroup(user, groupId, tx);
      await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          and(
            inArray(invoices.id, invoiceIds),
            eq(invoices.workspaceId, user.workspaceId),
          ),
        )
        .orderBy(invoices.id)
        .for('update');
      for (const id of invoiceIds) await this.getInvoice(user, id);
      for (const id of invoiceIds) {
        await tx.execute(
          sql`delete from invoice_group_memberships where invoice_id=${id}::uuid and owner_id=${user.sub}::uuid and workspace_id=${user.workspaceId}::uuid`,
        );
        if (groupId)
          await tx.execute(
            sql`insert into invoice_group_memberships(workspace_id,owner_id,invoice_id,group_id) values(${user.workspaceId}::uuid,${user.sub}::uuid,${id}::uuid,${groupId}::uuid)`,
          );
      }
    });
  }

  async previewInvoice(
    user: AuthUser,
    input: import('@gitiempo/shared').PreviewInvoiceInput,
  ) {
    const preview = await this.previewEligibleEntries(user, input);
    const entries =
      input.timeEntryIds === undefined
        ? preview.entries
        : preview.entries.filter((e) => input.timeEntryIds!.includes(e.id));
    if (input.timeEntryIds && entries.length !== input.timeEntryIds.length)
      throw new DomainError(
        'invoice_entry_conflict',
        'Review unavailable entries',
        409,
      );
    const seconds = entries.reduce(
      (sum, e) => sum + e.roundedDurationSeconds,
      0,
    );
    const rate = input.hourlyRate ?? preview.defaultHourlyRate;
    if (rate === null)
      throw new DomainError(
        'invoice_rate_required',
        'Hourly rate required',
        422,
      );
    const currency = input.currency ?? preview.defaultCurrency;
    if (!currency)
      throw new DomainError(
        'invoice_currency_required',
        'Currency required',
        422,
      );
    const discount = input.discountPercent ?? 0;
    const totals = this.computeInvoiceTotals(seconds, rate, discount);
    if (totals.totalAmount > MAX_TOTAL_AMOUNT)
      throw new DomainError(
        'invoice_total_overflow',
        'Invoice total overflow',
        422,
      );
    const subtotal = this.computeInvoiceTotals(seconds, rate, 0).totalAmount;
    return {
      entries,
      count: entries.length,
      ...totals,
      subtotal,
      discountAmount: subtotal - totals.totalAmount,
      currency,
    };
  }

  // ── List ─────────────────────────────────────────────────────────

  async listInvoices(
    user: AuthUser,
    query: InvoiceListQuery,
  ): Promise<InvoiceListResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    this.assertInvoiceViewAccess(membership);

    if (query.groupId && query.groupId !== 'ungrouped')
      await this.requireGroup(user, query.groupId);
    const isPm = membership.role === 'pm';
    const conditions: SQL[] = [eq(invoices.workspaceId, user.workspaceId)];

    if (query.groupId) {
      const match = sql`exists(select 1 from invoice_group_memberships m where m.invoice_id=${invoices.id} and m.owner_id=${user.sub}::uuid and m.workspace_id=${user.workspaceId}::uuid ${query.groupId === 'ungrouped' ? sql`` : sql`and m.group_id=${query.groupId}::uuid`})`;
      conditions.push(
        query.groupId === 'ungrouped' ? sql`not ${match}` : match,
      );
    }
    if (query.projectId !== undefined) {
      conditions.push(eq(invoices.projectId, query.projectId));
    }
    if (query.status !== undefined) {
      conditions.push(eq(invoices.status, query.status));
    }
    if (query.dateFrom !== undefined) {
      conditions.push(gte(invoices.dateFrom, query.dateFrom));
    }
    if (query.dateTo !== undefined) {
      conditions.push(lte(invoices.dateTo, query.dateTo));
    }
    if (query.search !== undefined) {
      const pattern = `%${escapeLikePattern(query.search)}%`;
      conditions.push(sql`${invoices.title} ILIKE ${pattern}`);
    }

    let listQuery = this.db
      .select(invoiceDetailSelection)
      .from(invoices)
      .leftJoin(projects, eq(projects.id, invoices.projectId))
      .leftJoin(users, eq(users.id, invoices.createdBy));

    if (isPm) {
      // PMs see only invoices scoped to a visible project (active public or
      // assigned private). Workspace-wide invoices (null projectId) are
      // admin-only. The assignment join is a LEFT JOIN so public projects
      // without an assignment row still satisfy the visibility condition.
      listQuery = listQuery.leftJoin(
        projectAssignments,
        and(
          eq(projectAssignments.projectId, invoices.projectId),
          eq(projectAssignments.userId, user.sub),
        ),
      );
      conditions.push(eq(projects.isActive, true));
      conditions.push(
        or(
          eq(projects.visibility, 'public'),
          eq(projectAssignments.userId, user.sub),
        )!,
      );
    }

    const total = await this.countInvoices(conditions, isPm, user.sub);

    const offset = (query.page - 1) * query.limit;
    const rows = await listQuery
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt), desc(invoices.id))
      .limit(query.limit)
      .offset(offset);

    // Fetch time-entry counts per invoice in one query.
    const invoiceIds = rows.map((r) => r.id);
    const countRows = invoiceIds.length
      ? await this.db
          .select({
            invoiceId: timeEntries.invoiceId,
            entryCount: count(),
          })
          .from(timeEntries)
          .where(inArray(timeEntries.invoiceId, invoiceIds))
          .groupBy(timeEntries.invoiceId)
      : [];

    const countByInvoice = new Map<string, number>();
    for (const r of countRows) {
      countByInvoice.set(r.invoiceId!, r.entryCount);
    }

    const items = rows.map((row) =>
      this.toInvoiceListItem(row, countByInvoice.get(row.id) ?? 0),
    );

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  private async countInvoices(
    conditions: SQL[],
    isPm: boolean,
    userId: string,
  ): Promise<number> {
    let countQuery = this.db
      .select({ value: count() })
      .from(invoices)
      .leftJoin(projects, eq(projects.id, invoices.projectId));

    if (isPm) {
      countQuery = countQuery.leftJoin(
        projectAssignments,
        and(
          eq(projectAssignments.projectId, invoices.projectId),
          eq(projectAssignments.userId, userId),
        ),
      );
    }

    const [row] = await countQuery.where(and(...conditions));
    return row?.value ?? 0;
  }

  // ── Stats ─────────────────────────────────────────────────────────

  /**
   * Returns aggregate invoice counts by status and a summary of invoices
   * created in the current calendar month. For PMs, only invoices scoped to
   * visible projects are counted; workspace-wide invoices are excluded.
   *
   * The thisMonth.totalAmount sums all currencies together. Workspaces
   * using a single currency get accurate totals; multi-currency workspaces
   * get an approximate sum. The workspace default currency is returned for
   * display purposes.
   */
  async getInvoiceStats(user: AuthUser): Promise<InvoiceStatsResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    this.assertInvoiceViewAccess(membership);

    const isPm = membership.role === 'pm';

    // Resolve workspace default currency for display.
    const [settings] = await this.db
      .select({
        currency: workspaceSettings.currency,
        timeZone: workspaceSettings.timeZone,
      })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, user.workspaceId))
      .limit(1);
    const currency = settings?.currency ?? 'USD';
    const timeZone = settings?.timeZone ?? 'UTC';

    // Base condition: invoices in this workspace.
    const baseConditions: SQL[] = [eq(invoices.workspaceId, user.workspaceId)];

    // PM visibility: only invoices for visible projects (same as list).
    let statusQuery = this.db
      .select({
        status: invoices.status,
        value: count(),
      })
      .from(invoices)
      .leftJoin(projects, eq(projects.id, invoices.projectId));

    if (isPm) {
      statusQuery = statusQuery.leftJoin(
        projectAssignments,
        and(
          eq(projectAssignments.projectId, invoices.projectId),
          eq(projectAssignments.userId, user.sub),
        ),
      );
      baseConditions.push(eq(projects.isActive, true));
      baseConditions.push(
        or(
          eq(projects.visibility, 'public'),
          eq(projectAssignments.userId, user.sub),
        )!,
      );
    }

    const statusRows = await statusQuery
      .where(and(...baseConditions))
      .groupBy(invoices.status);

    const byStatus = { draft: 0, sent: 0, paid: 0 };
    for (const row of statusRows) {
      if (
        row.status === 'draft' ||
        row.status === 'sent' ||
        row.status === 'paid'
      ) {
        byStatus[row.status] = Number(row.value);
      }
    }

    // This month: invoices created in the current calendar month,
    // interpreted in the workspace timezone (not the server's local tz).
    const monthStartExpr = sql`date_trunc('month', now() AT TIME ZONE ${timeZone}) AT TIME ZONE ${timeZone}`;
    const monthConditions = [
      ...baseConditions,
      gte(invoices.createdAt, monthStartExpr),
    ];

    let monthQuery = this.db
      .select({
        invoiceCount: count(),
        totalAmount:
          sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`.mapWith(
            Number,
          ),
      })
      .from(invoices)
      .leftJoin(projects, eq(projects.id, invoices.projectId));

    if (isPm) {
      monthQuery = monthQuery.leftJoin(
        projectAssignments,
        and(
          eq(projectAssignments.projectId, invoices.projectId),
          eq(projectAssignments.userId, user.sub),
        ),
      );
    }

    const [monthRow] = await monthQuery.where(and(...monthConditions));

    // Distinct project count for this month.
    let projectCountQuery = this.db
      .select({
        projectCount:
          sql<number>`COUNT(DISTINCT ${invoices.projectId})`.mapWith(Number),
      })
      .from(invoices)
      .where(and(...monthConditions, isNotNull(invoices.projectId)));

    if (isPm) {
      projectCountQuery = this.db
        .select({
          projectCount:
            sql<number>`COUNT(DISTINCT ${invoices.projectId})`.mapWith(Number),
        })
        .from(invoices)
        .leftJoin(projects, eq(projects.id, invoices.projectId))
        .leftJoin(
          projectAssignments,
          and(
            eq(projectAssignments.projectId, invoices.projectId),
            eq(projectAssignments.userId, user.sub),
          ),
        )
        .where(and(...monthConditions, isNotNull(invoices.projectId)));
    }

    const [projRow] = await projectCountQuery;

    return {
      byStatus,
      thisMonth: {
        invoiceCount: Number(monthRow?.invoiceCount ?? 0),
        projectCount: Number(projRow?.projectCount ?? 0),
        totalAmount: Number(monthRow?.totalAmount ?? 0),
        currency,
      },
    };
  }

  // ── Preview eligible entries ────────────────────────────────────────

  /**
   * Returns the time entries that would be billed if an invoice is created
   * with the given project scope and date range. Mirrors the eligibility
   * logic in createInvoice but performs no writes.
   */
  async previewEligibleEntries(
    user: AuthUser,
    query: EligibleEntriesQuery,
  ): Promise<EligibleEntriesResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    this.assertInvoiceViewAccess(membership);

    // Both probes validate access and return the project's rounding step;
    // null means the project inherits the workspace setting.
    let projectRoundingStepMinutes: number | null = null;
    if (membership.role === 'pm') {
      if (query.projectId === undefined) {
        throw new ForbiddenException(
          'Project managers must scope invoices to an assigned project',
        );
      }
      projectRoundingStepMinutes = await this.requirePmProjectAccess(
        user.sub,
        user.workspaceId,
        query.projectId,
      );
    } else if (query.projectId !== undefined) {
      projectRoundingStepMinutes = await this.requireWorkspaceProject(
        user.workspaceId,
        query.projectId,
      );
    }

    const [settings] = await this.db
      .select({
        billingProfile: workspaceSettings.billingProfile,
        defaultHourlyRate: workspaceSettings.defaultHourlyRate,
        currency: workspaceSettings.currency,
        timeZone: workspaceSettings.timeZone,
        timeRoundingStepMinutes: workspaceSettings.timeRoundingStepMinutes,
      })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, user.workspaceId))
      .limit(1);
    const timeZone = settings?.timeZone ?? 'UTC';

    // Effective step: explicit override wins, else the project step (null =
    // inherits), else the workspace setting.
    const defaultRoundingStepMinutes =
      projectRoundingStepMinutes ?? settings?.timeRoundingStepMinutes ?? 1;
    const effectiveRoundingStepMinutes =
      query.roundingStepMinutes ?? defaultRoundingStepMinutes;

    if (query.invoiceId) await this.getInvoice(user, query.invoiceId);
    const conditions = [
      eq(timeEntries.workspaceId, user.workspaceId),
      isNotNull(timeEntries.endedAt),
      isNotNull(timeEntries.durationSeconds),
      eq(timeEntries.isBillable, true),
      query.invoiceId
        ? or(
            isNull(timeEntries.invoiceId),
            eq(timeEntries.invoiceId, query.invoiceId),
          )!
        : isNull(timeEntries.invoiceId),
      gte(
        timeEntries.startedAt,
        sql`${query.dateFrom}::date::timestamp AT TIME ZONE ${timeZone}`,
      ),
      lt(
        timeEntries.startedAt,
        sql`(${query.dateTo}::date + 1)::timestamp AT TIME ZONE ${timeZone}`,
      ),
    ];

    if (query.projectId !== undefined) {
      conditions.push(
        inArray(
          timeEntries.taskId,
          this.db
            .select({ id: tasks.id })
            .from(tasks)
            .innerJoin(projects, eq(projects.id, tasks.projectId))
            .where(
              and(
                eq(projects.id, query.projectId),
                eq(projects.workspaceId, user.workspaceId),
              ),
            ),
        ),
      );
    }

    const rows = await this.db
      .select(linkedTimeEntrySelection)
      .from(timeEntries)
      .leftJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .where(and(...conditions))
      .orderBy(timeEntries.startedAt);

    const totalSeconds = rows.reduce(
      (sum, e) =>
        sum +
        InvoicesService.roundEntrySeconds(
          e.durationSeconds ?? 0,
          effectiveRoundingStepMinutes,
        ),
      0,
    );
    const totalHours = InvoicesService.secondsToCentihours(totalSeconds) / 100;
    const entries: InvoiceTimeEntrySummary[] = rows.map((e) => ({
      id: e.id,
      taskId: e.taskId,
      userId: e.userId,
      userName: e.userName,
      taskName: e.taskName,
      startedAt: e.startedAt.toISOString(),
      endedAt: e.endedAt!.toISOString(),
      durationSeconds: e.durationSeconds!,
      roundedDurationSeconds: InvoicesService.roundEntrySeconds(
        e.durationSeconds ?? 0,
        effectiveRoundingStepMinutes,
      ),
      isBillable: e.isBillable,
      description: e.description,
    }));

    return {
      count: rows.length,
      totalHours,
      entries,
      defaultHourlyRate: settings?.defaultHourlyRate ?? null,
      defaultCurrency: settings?.currency ?? null,
      defaultRoundingStepMinutes,
    };
  }

  // ── Create ────────────────────────────────────────────────────────────

  async createInvoice(
    user: AuthUser,
    input: CreateInvoiceInput,
  ): Promise<InvoiceResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    this.assertInvoiceViewAccess(membership);

    // PMs must scope invoice creation to a visible project. Both project
    // probes validate access and return the project's rounding step.
    let projectRoundingStepMinutes: number | null = null;
    if (membership.role === 'pm') {
      if (input.projectId === undefined) {
        throw new ForbiddenException(
          'Project managers must scope invoices to an assigned project',
        );
      }
      projectRoundingStepMinutes = await this.requirePmProjectAccess(
        user.sub,
        user.workspaceId,
        input.projectId,
      );
    } else if (input.projectId !== undefined) {
      // Admins: verify the project belongs to the workspace.
      projectRoundingStepMinutes = await this.requireWorkspaceProject(
        user.workspaceId,
        input.projectId,
      );
    }

    // Resolve snapshot rate and currency from workspace settings when omitted.
    const [settings] = await this.db
      .select({
        billingProfile: workspaceSettings.billingProfile,
        defaultHourlyRate: workspaceSettings.defaultHourlyRate,
        currency: workspaceSettings.currency,
        timeZone: workspaceSettings.timeZone,
        timeRoundingStepMinutes: workspaceSettings.timeRoundingStepMinutes,
      })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, user.workspaceId))
      .limit(1);

    const hourlyRate = input.hourlyRate ?? settings?.defaultHourlyRate ?? null;
    if (hourlyRate === null) {
      throw new DomainError(
        'invoice_rate_required',
        'An hourly rate is required: provide one or configure a workspace default rate',
        422,
      );
    }
    const currency = input.currency ?? settings?.currency ?? null;
    if (currency === null) {
      throw new DomainError(
        'invoice_currency_required',
        'A currency is required: provide one or configure a workspace default currency',
        422,
      );
    }
    const discountPercent = input.discountPercent;
    const timeZone = settings?.timeZone ?? 'UTC';

    // Snapshot step: explicit body value → project step (null = inherits
    // workspace) → workspace setting.
    const roundingStepMinutes =
      input.roundingStepMinutes ??
      projectRoundingStepMinutes ??
      settings?.timeRoundingStepMinutes ??
      1;

    return this.db.transaction(async (tx) => {
      // Lock eligible time entries: completed, billable, not already invoiced,
      // within the requested workspace/project/date range.
      const eligibilityConditions = [
        eq(timeEntries.workspaceId, user.workspaceId),
        isNotNull(timeEntries.endedAt),
        isNotNull(timeEntries.durationSeconds),
        eq(timeEntries.isBillable, true),
        isNull(timeEntries.invoiceId),
        gte(
          timeEntries.startedAt,
          sql`${input.dateFrom}::date::timestamp AT TIME ZONE ${timeZone}`,
        ),
        lt(
          timeEntries.startedAt,
          sql`(${input.dateTo}::date + 1)::timestamp AT TIME ZONE ${timeZone}`,
        ),
      ];

      if (input.projectId !== undefined) {
        eligibilityConditions.push(
          inArray(
            timeEntries.taskId,
            this.db
              .select({ id: tasks.id })
              .from(tasks)
              .innerJoin(projects, eq(projects.id, tasks.projectId))
              .where(
                and(
                  eq(projects.id, input.projectId),
                  eq(projects.workspaceId, user.workspaceId),
                ),
              ),
          ),
        );
      }

      if (input.timeEntryIds !== undefined) {
        eligibilityConditions.push(
          input.timeEntryIds.length
            ? inArray(timeEntries.id, input.timeEntryIds)
            : sql`false`,
        );
      }
      const eligibleEntries = await tx
        .select(eligibleEntrySelection)
        .from(timeEntries)
        .where(and(...eligibilityConditions))
        .orderBy(timeEntries.id)
        .for('update');

      if (
        input.timeEntryIds &&
        eligibleEntries.length !== input.timeEntryIds.length
      ) {
        throw new DomainError(
          'invoice_entry_conflict',
          'Review unavailable entries',
          409,
        );
      }
      // Compute snapshot totals with per-entry rounding.
      const totalSeconds = eligibleEntries.reduce(
        (sum, e) =>
          sum +
          InvoicesService.roundEntrySeconds(
            e.durationSeconds ?? 0,
            roundingStepMinutes,
          ),
        0,
      );
      const { totalHours, totalAmount } = this.computeInvoiceTotals(
        totalSeconds,
        hourlyRate,
        discountPercent,
      );

      // Capacity guard: an extreme rate × hours combination can exceed the
      // NUMERIC(12,2) column; fail with 422 instead of a database error.
      if (totalAmount > MAX_TOTAL_AMOUNT) {
        throw new DomainError(
          'invoice_total_overflow',
          'The computed invoice total exceeds the maximum supported amount',
          422,
        );
      }

      const [invoice] = await tx
        .insert(invoices)
        .values({
          workspaceId: user.workspaceId,
          projectId: input.projectId ?? null,
          title: input.title,
          reference: sql`${settings?.billingProfile?.invoicePrefix ?? 'INV'} || '-' || nextval('invoice_reference_sequence')::text`,
          status: 'draft',
          document: {
            sender: input.sender ?? settings?.billingProfile?.sender,
            recipient: input.recipient,
            payment: input.payment ?? settings?.billingProfile?.payment,
            services: input.services,
            logo:
              input.logo === undefined
                ? settings?.billingProfile?.logo
                : input.logo,
          },
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          hourlyRate,
          currency,
          discountPercent,
          totalHours,
          totalAmount,
          roundingStepMinutes,
          notes: input.notes ?? null,
          createdBy: user.sub,
        })
        .returning({ id: invoices.id });

      if (!invoice) {
        throw DomainError.internal(
          'invoice_create_failed',
          'Failed to create invoice',
        );
      }

      // Link selected entries to the new invoice.
      if (eligibleEntries.length > 0) {
        await tx
          .update(timeEntries)
          .set({ invoiceId: invoice.id })
          .where(
            and(
              inArray(
                timeEntries.id,
                eligibleEntries.map((e) => e.id),
              ),
              isNull(timeEntries.invoiceId),
            ),
          );
      }

      if (input.groupId) {
        await this.requireGroup(user, input.groupId, tx);
        await tx.execute(
          sql`insert into invoice_group_memberships(workspace_id,owner_id,invoice_id,group_id) values(${user.workspaceId}::uuid,${user.sub}::uuid,${invoice.id}::uuid,${input.groupId}::uuid)`,
        );
      }
      const saved = await this.readInvoiceDetail(
        tx,
        invoice.id,
        user.workspaceId,
      );
      const document = {
        sender: saved.sender,
        recipient: saved.recipient,
        payment: saved.payment
          ? {
              ...saved.payment,
              instructions: saved.payment.instructions?.replaceAll(
                '{{invoiceReference}}',
                saved.reference ?? saved.id,
              ),
            }
          : saved.payment,
        services: saved.services,
        logo: saved.logo,
        timeEntries: saved.timeEntries,
      };
      await tx
        .update(invoices)
        .set({ document })
        .where(eq(invoices.id, invoice.id));
      return { ...saved, payment: document.payment };
    });
  }

  // ── Detail ────────────────────────────────────────────────────────────

  async getInvoice(user: AuthUser, id: string): Promise<InvoiceResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    this.assertInvoiceViewAccess(membership);

    const invoice = await this.findInvoiceOrThrow(user.workspaceId, id);

    if (membership.role === 'pm') {
      await this.requirePmInvoiceAccess(user.sub, invoice);
    }

    const entryRows = await this.loadLinkedEntries(this.db, id);

    const group = await this.db.execute(
      sql`select group_id from invoice_group_memberships where invoice_id=${id}::uuid and owner_id=${user.sub}::uuid and workspace_id=${user.workspaceId}::uuid`,
    );
    return {
      ...this.toInvoiceResponse(invoice, entryRows),
      groupId: group.rows[0]?.group_id ? String(group.rows[0].group_id) : null,
    };
  }

  // ── Update ────────────────────────────────────────────────────────────

  async updateInvoice(
    user: AuthUser,
    id: string,
    input: UpdateInvoiceInput,
  ): Promise<InvoiceResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    this.assertInvoiceViewAccess(membership);

    const existing = await this.getInvoice(user, id);
    const projectId =
      input.projectId === undefined ? existing.projectId : input.projectId;
    if (projectId) {
      if (membership.role === 'pm')
        await this.requirePmProjectAccess(
          user.sub,
          user.workspaceId,
          projectId,
        );
      else await this.requireWorkspaceProject(user.workspaceId, projectId);
    } else if (membership.role === 'pm')
      throw new ForbiddenException('Project required');
    return this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .select(invoiceRowSelection)
        .from(invoices)
        .where(
          and(eq(invoices.id, id), eq(invoices.workspaceId, user.workspaceId)),
        )
        .for('update');
      if (!invoice) throw new NotFoundException('Invoice not found');
      const projectId =
        input.projectId === undefined ? invoice.projectId : input.projectId;
      if (membership.role === 'pm') {
        if (!invoice.projectId) throw new ForbiddenException('Forbidden');
        await this.requirePmProjectAccess(
          user.sub,
          user.workspaceId,
          invoice.projectId,
        );
      }
      if (
        input.expectedRevision !== undefined &&
        input.expectedRevision !== invoice.revision
      ) {
        throw new DomainError(
          'invoice_update_conflict',
          'Invoice changed; review and retry',
          409,
        );
      }
      if (
        Object.keys(input).every((key) =>
          ['status', 'expectedRevision'].includes(key),
        ) &&
        input.status === invoice.status
      )
        return this.readInvoiceDetail(tx, id, user.workspaceId);
      const billingChanged = [
        'projectId',
        'dateFrom',
        'dateTo',
        'hourlyRate',
        'currency',
        'discountPercent',
        'roundingStepMinutes',
        'timeEntryIds',
      ].some((k) => k in input);
      const updates: Partial<typeof invoices.$inferInsert> = {};
      for (const key of [
        'title',
        'status',
        'notes',
        'dateFrom',
        'dateTo',
        'hourlyRate',
        'currency',
        'discountPercent',
        'roundingStepMinutes',
        'projectId',
      ] as const) {
        if (input[key] !== undefined)
          Object.assign(updates, { [key]: input[key] });
      }
      const document = { ...invoice.document };
      for (const key of [
        'sender',
        'recipient',
        'payment',
        'services',
        'logo',
      ] as const) {
        if (input[key] !== undefined) document[key] = input[key];
      }
      updates.document = document;
      if (billingChanged) delete document.timeEntries;
      if (billingChanged) {
        const linked = await tx
          .select({ id: timeEntries.id })
          .from(timeEntries)
          .where(eq(timeEntries.invoiceId, id));
        const ids = input.timeEntryIds ?? linked.map((e) => e.id);
        const dateFrom = input.dateFrom ?? invoice.dateFrom;
        const dateTo = input.dateTo ?? invoice.dateTo;
        if (dateTo < dateFrom)
          throw new DomainError(
            'invoice_invalid_period',
            'Invalid billing period',
            400,
          );
        const [settings] = await tx
          .select({ timeZone: workspaceSettings.timeZone })
          .from(workspaceSettings)
          .where(eq(workspaceSettings.workspaceId, user.workspaceId));
        const zone = settings?.timeZone ?? 'UTC';
        const conditions = [
          eq(timeEntries.workspaceId, user.workspaceId),
          ids.length ? inArray(timeEntries.id, ids) : sql`false`,
          or(isNull(timeEntries.invoiceId), eq(timeEntries.invoiceId, id)),
          eq(timeEntries.isBillable, true),
          isNotNull(timeEntries.endedAt),
          gte(
            timeEntries.startedAt,
            sql`${dateFrom}::date::timestamp AT TIME ZONE ${zone}`,
          ),
          lt(
            timeEntries.startedAt,
            sql`(${dateTo}::date + 1)::timestamp AT TIME ZONE ${zone}`,
          ),
        ];
        if (projectId)
          conditions.push(
            inArray(
              timeEntries.taskId,
              tx
                .select({ id: tasks.id })
                .from(tasks)
                .where(eq(tasks.projectId, projectId)),
            ),
          );
        const selected = await tx
          .select(eligibleEntrySelection)
          .from(timeEntries)
          .where(and(...conditions))
          .orderBy(timeEntries.id)
          .for('update');
        if (selected.length !== ids.length)
          throw new DomainError(
            'invoice_entry_conflict',
            'Review unavailable entries',
            409,
          );
        const seconds = selected.reduce(
          (sum, e) =>
            sum +
            InvoicesService.roundEntrySeconds(
              e.durationSeconds ?? 0,
              input.roundingStepMinutes ?? invoice.roundingStepMinutes,
            ),
          0,
        );
        Object.assign(
          updates,
          this.computeInvoiceTotals(
            seconds,
            input.hourlyRate ?? invoice.hourlyRate,
            input.discountPercent ?? invoice.discountPercent,
          ),
        );
        if (updates.totalAmount! > MAX_TOTAL_AMOUNT)
          throw new DomainError(
            'invoice_total_overflow',
            'Invoice total overflow',
            422,
          );
        await tx
          .update(timeEntries)
          .set({ invoiceId: null })
          .where(eq(timeEntries.invoiceId, id));
        if (ids.length)
          await tx
            .update(timeEntries)
            .set({ invoiceId: id })
            .where(inArray(timeEntries.id, ids));
      }
      if (input.groupId !== undefined) {
        if (input.groupId) await this.requireGroup(user, input.groupId, tx);
        await tx.execute(
          sql`delete from invoice_group_memberships where invoice_id=${id}::uuid and owner_id=${user.sub}::uuid and workspace_id=${user.workspaceId}::uuid`,
        );
        if (input.groupId)
          await tx.execute(
            sql`insert into invoice_group_memberships(workspace_id,owner_id,invoice_id,group_id) values(${user.workspaceId}::uuid,${user.sub}::uuid,${id}::uuid,${input.groupId}::uuid)`,
          );
      }
      updates.revision = invoice.revision + 1;
      updates.updatedAt = new Date();
      await tx.update(invoices).set(updates).where(eq(invoices.id, id));
      const saved = await this.readInvoiceDetail(tx, id, user.workspaceId);
      if (billingChanged)
        await tx
          .update(invoices)
          .set({ document: { ...document, timeEntries: saved.timeEntries } })
          .where(eq(invoices.id, id));
      return saved;
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────

  async deleteInvoice(user: AuthUser, id: string): Promise<void> {
    // Admin-only: enforce at membership level.
    await this.members.requireRole(user.sub, user.workspaceId, ['admin']);

    // Verify the invoice exists in this workspace first (correct 404 vs 409).
    const invoice = await this.findInvoiceOrThrow(user.workspaceId, id);

    // Atomic delete: the draft-only lock lives inside the DELETE predicate,
    // so a concurrent PATCH cannot flip the status between our read and the
    // delete to bypass it. Zero affected rows means the invoice was not
    // draft at delete time (or changed concurrently).
    // FK ON DELETE SET NULL unlinks time entries automatically.
    const result = await this.db
      .delete(invoices)
      .where(and(eq(invoices.id, invoice.id), eq(invoices.status, 'draft')))
      .returning({ id: invoices.id });

    if (result.length === 0) {
      const currentStatus =
        invoice.status === 'draft' ? 'changed concurrently' : invoice.status;
      throw new DomainError(
        'invoice_not_deletable',
        `Only draft invoices can be deleted (current status: ${currentStatus})`,
        409,
      );
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private assertInvoiceViewAccess(membership: ActiveMembership): void {
    if (membership.role === 'pm' && !membership.canViewInvoices) {
      throw new ForbiddenException('Forbidden');
    }
  }

  private async loadInvoiceDetail(
    cx: DrizzleDB | DbTransaction,
    workspaceId: string,
    id: string,
  ): Promise<InvoiceDetailRow | null> {
    const [row] = await cx
      .select(invoiceDetailSelection)
      .from(invoices)
      .leftJoin(projects, eq(projects.id, invoices.projectId))
      .leftJoin(users, eq(users.id, invoices.createdBy))
      .where(and(eq(invoices.id, id), eq(invoices.workspaceId, workspaceId)))
      .limit(1);

    return row ?? null;
  }

  private async findInvoiceOrThrow(
    workspaceId: string,
    id: string,
  ): Promise<InvoiceDetailRow> {
    const row = await this.loadInvoiceDetail(this.db, workspaceId, id);

    if (!row) throw new NotFoundException('Invoice not found');

    return row;
  }

  private async readInvoiceDetail(
    tx: DbTransaction,
    id: string,
    workspaceId: string,
  ): Promise<InvoiceResponse> {
    const row = await this.loadInvoiceDetail(tx, workspaceId, id);

    if (!row)
      throw DomainError.internal(
        'invoice_not_found_after_create',
        'Invoice not found after creation',
      );

    const entries = await this.loadLinkedEntries(tx, id);

    return this.toInvoiceResponse(row, entries);
  }

  private async loadLinkedEntries(
    cx: DrizzleDB | DbTransaction,
    invoiceId: string,
  ): Promise<LinkedTimeEntryRow[]> {
    return cx
      .select(linkedTimeEntrySelection)
      .from(timeEntries)
      .leftJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .where(eq(timeEntries.invoiceId, invoiceId))
      .orderBy(timeEntries.startedAt);
  }

  /**
   * Converts seconds to centihours (1 hour = 100 centihours) using integer
   * arithmetic to avoid floating-point drift. Dividing first (seconds/3600)
   * then multiplying by 100 can produce values like 14.499999999999998 for
   * 522 seconds; multiplying first (seconds*100) keeps the intermediate as
   * an exact integer so the division result is precise enough for Math.round.
   */
  private static secondsToCentihours(totalSeconds: number): number {
    return Math.round((totalSeconds * 100) / 3600);
  }

  /**
   * Rounds a single entry's duration up to the nearest step multiple.
   * With steps of 1–60 minutes even the minimum step rounds entries up to
   * whole minutes; entries already at a step multiple stay unchanged.
   */
  private static roundEntrySeconds(
    durationSeconds: number,
    stepMinutes: number,
  ): number {
    const stepSeconds = stepMinutes * 60;
    return Math.ceil(durationSeconds / stepSeconds) * stepSeconds;
  }

  /**
   * Pure snapshot-totals computation: hours from seconds, then amount with
   * optional percentage discount. Both values are rounded to 2 decimal
   * places to match the stored DECIMAL precision.
   *
   * The amount is computed in integer fixed-point (centihours × cents ×
   * discount basis points) and always rounded UP to the next whole cent
   * (ceiling): any fractional cent is billed, never discarded. Binary
   * floating point can represent e.g. 37.605 as 3760.4999…, so the
   * fixed-point path avoids that drift and guarantees the cent rounds up
   * (3.3333 → 3.34, 37.605 → 37.61).
   *
   * The triple product (centihours × cents × discount-factor) can exceed
   * Number.MAX_SAFE_INTEGER for large but allowed invoice totals; BigInt
   * keeps the intermediate exact so the final cent value is never off by one.
   */
  private computeInvoiceTotals(
    totalSeconds: number,
    hourlyRate: number,
    discountPercent: number,
  ): { totalHours: number; totalAmount: number } {
    const totalHoursCents = InvoicesService.secondsToCentihours(totalSeconds);
    const rateCents = Math.round(hourlyRate * 100);
    const discountBps = Math.round(discountPercent * 100); // 0–10000
    const discountFactor = 10_000 - discountBps; // 0–10000

    // totalAmount = (totalHoursCents/100) × (rateCents/100) ×
    //                (discountFactor/10_000)
    //             = totalHoursCents × rateCents × discountFactor / 1_000_000
    // BigInt ceiling: add (divisor - 1) before floor division so any
    // fractional cent rounds UP to the next whole cent (3.3333 → 3.34).
    const amountCents = Number(
      (BigInt(totalHoursCents) * BigInt(rateCents) * BigInt(discountFactor) +
        999_999n) /
        1_000_000n,
    );

    return {
      totalHours: totalHoursCents / 100,
      totalAmount: amountCents / 100,
    };
  }

  // PM visibility gate for a project that also returns the project's
  // rounding step so create/preview can snapshot the effective step without
  // a second project read.
  private async requirePmProjectAccess(
    userId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<number | null> {
    const [row] = await this.db
      .select({ timeRoundingStepMinutes: projects.timeRoundingStepMinutes })
      .from(projects)
      .leftJoin(
        projectAssignments,
        and(
          eq(projectAssignments.projectId, projects.id),
          eq(projectAssignments.userId, userId),
        ),
      )
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, workspaceId),
          eq(projects.isActive, true),
          or(
            eq(projects.visibility, 'public'),
            eq(projectAssignments.userId, userId),
          )!,
        ),
      )
      .limit(1);

    if (!row) throw new ForbiddenException('Forbidden');
    return row.timeRoundingStepMinutes;
  }

  // Existence gate for a workspace project that also returns its rounding
  // step (null = inherits the workspace setting).
  private async requireWorkspaceProject(
    workspaceId: string,
    projectId: string,
  ): Promise<number | null> {
    const [row] = await this.db
      .select({ timeRoundingStepMinutes: projects.timeRoundingStepMinutes })
      .from(projects)
      .where(
        and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Project not found');
    return row.timeRoundingStepMinutes;
  }

  private async requirePmInvoiceAccess(
    userId: string,
    invoice: InvoiceDetailRow,
  ): Promise<void> {
    if (invoice.projectId === null) {
      throw new ForbiddenException('Forbidden');
    }
    await this.requirePmProjectAccess(
      userId,
      invoice.workspaceId,
      invoice.projectId,
    );
  }

  private toInvoiceResponse(
    row: InvoiceDetailRow,
    entries: LinkedTimeEntryRow[],
  ): InvoiceResponse {
    const entrySummaries: InvoiceTimeEntrySummary[] = entries.map((e) => ({
      id: e.id,
      taskId: e.taskId,
      userId: e.userId,
      userName: e.userName,
      taskName: e.taskName,
      startedAt: e.startedAt.toISOString(),
      endedAt: e.endedAt!.toISOString(),
      durationSeconds: e.durationSeconds!,
      roundedDurationSeconds: InvoicesService.roundEntrySeconds(
        e.durationSeconds ?? 0,
        row.roundingStepMinutes,
      ),
      isBillable: e.isBillable,
      description: e.description,
    }));

    return {
      ...(row.document ?? {}),
      reference: row.reference,
      revision: row.revision,
      id: row.id,
      workspaceId: row.workspaceId,
      projectId: row.projectId,
      title: row.title,
      status: row.status as InvoiceResponse['status'],
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      hourlyRate: Number(row.hourlyRate),
      currency: row.currency,
      discountPercent: Number(row.discountPercent),
      totalHours: Number(row.totalHours),
      totalAmount: Number(row.totalAmount),
      roundingStepMinutes: row.roundingStepMinutes,
      notes: row.notes,
      createdBy: row.createdBy,
      createdByName: row.createdByName,
      timeEntryCount:
        (row.document?.timeEntries as InvoiceTimeEntrySummary[] | undefined)
          ?.length ?? entries.length,
      timeEntries:
        (row.document?.timeEntries as InvoiceTimeEntrySummary[] | undefined) ??
        entrySummaries,
      project:
        row.projectId !== null && row.projectName !== null
          ? { id: row.projectId, name: row.projectName }
          : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toInvoiceListItem(
    row: InvoiceDetailRow,
    entryCount: number,
  ): InvoiceListItem {
    return {
      ...(row.document ?? {}),
      reference: row.reference,
      revision: row.revision,
      id: row.id,
      workspaceId: row.workspaceId,
      projectId: row.projectId,
      title: row.title,
      status: row.status as InvoiceResponse['status'],
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      hourlyRate: Number(row.hourlyRate),
      currency: row.currency,
      discountPercent: Number(row.discountPercent),
      totalHours: Number(row.totalHours),
      totalAmount: Number(row.totalAmount),
      roundingStepMinutes: row.roundingStepMinutes,
      notes: row.notes,
      createdBy: row.createdBy,
      createdByName: row.createdByName,
      timeEntryCount: entryCount,
      project:
        row.projectId !== null && row.projectName !== null
          ? { id: row.projectId, name: row.projectName }
          : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
