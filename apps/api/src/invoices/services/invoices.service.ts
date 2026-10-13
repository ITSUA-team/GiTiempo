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
  InvoiceListItem,
  InvoiceListQuery,
  InvoiceListResponse,
  InvoiceResponse,
  InvoiceStatsResponse,
  InvoiceTimeEntrySummary,
  UpdateInvoiceInput,
} from '@gitiempo/shared';
import type { AuthUser } from '../../auth/types/auth-user';
import { DomainError } from '../../commons/errors/domain-error';
import { escapeLikePattern } from '../../commons/utils/escape-like-pattern';
import { DRIZZLE } from '../../db/db.constants';
import type { DbTransaction, DrizzleDB } from '../../db/db.types';
import { MembersService } from '../../members/services/members.service';
import { projectAssignments } from '../../projects/schemas/project-assignments.schema';
import { projects } from '../../projects/schemas/projects.schema';
import { tasks } from '../../tasks/schemas/tasks.schema';
import { timeEntries } from '../../time-entries/schemas/time-entries.schema';
import { workspaceSettings } from '../../workspaces/schemas/workspace-settings.schema';
import { invoices } from '../schemas/invoices.schema';

interface InvoiceDetailRow {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  hourlyRate: number;
  currency: string;
  discountPercent: number;
  totalHours: number;
  totalAmount: number;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  projectName: string | null;
}

interface LinkedTimeEntryRow {
  id: string;
  taskId: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  isBillable: boolean;
  description: string | null;
}

// Shared column selections so list, detail, and transaction reads stay in
// sync with the response mapping in one place.
const invoiceDetailSelection = {
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
  notes: invoices.notes,
  createdBy: invoices.createdBy,
  createdAt: invoices.createdAt,
  updatedAt: invoices.updatedAt,
  projectName: projects.name,
} as const;

const linkedTimeEntrySelection = {
  id: timeEntries.id,
  taskId: timeEntries.taskId,
  userId: timeEntries.userId,
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

  // ── List ──────────────────────────────────────────────────────────────

  async listInvoices(
    user: AuthUser,
    query: InvoiceListQuery,
  ): Promise<InvoiceListResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );

    const isPm = membership.role === 'pm';
    const conditions: SQL[] = [eq(invoices.workspaceId, user.workspaceId)];

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
      .leftJoin(projects, eq(projects.id, invoices.projectId));

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
  async getInvoiceStats(
    user: AuthUser,
  ): Promise<InvoiceStatsResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );
    const isPm = membership.role === 'pm';

    // Resolve workspace default currency for display.
    const [settings] = await this.db
      .select({
        currency: workspaceSettings.currency,
      })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, user.workspaceId))
      .limit(1);
    const currency = settings?.currency ?? 'USD';

    // Base condition: invoices in this workspace.
    const baseConditions: SQL[] = [
      eq(invoices.workspaceId, user.workspaceId),
    ];

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
      if (row.status === 'draft' || row.status === 'sent' || row.status === 'paid') {
        byStatus[row.status] = row.value;
      }
    }

    // This month: invoices created in the current calendar month.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthConditions = [...baseConditions, gte(invoices.createdAt, monthStart)];

    const [monthRow] = await this.db
      .select({
        invoiceCount: count(),
        totalAmount: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
      })
      .from(invoices)
      .leftJoin(projects, eq(projects.id, invoices.projectId))
      .where(and(...monthConditions));

    // Distinct project count for this month.
    let projectCountQuery = this.db
      .select({
        projectCount: sql<number>`COUNT(DISTINCT ${invoices.projectId})`,
      })
      .from(invoices)
      .where(
        and(
          ...monthConditions,
          isNotNull(invoices.projectId),
        ),
      );

    if (isPm) {
      projectCountQuery = this.db
        .select({
          projectCount: sql<number>`COUNT(DISTINCT ${invoices.projectId})`,
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
        .where(
          and(
            ...monthConditions,
            isNotNull(invoices.projectId),
            eq(projects.isActive, true),
            or(
              eq(projects.visibility, 'public'),
              eq(projectAssignments.userId, user.sub),
            )!,
          ),
        );
    }

    const [projRow] = await projectCountQuery;

    return {
      byStatus,
      thisMonth: {
        invoiceCount: monthRow?.invoiceCount ?? 0,
        projectCount: projRow?.projectCount ?? 0,
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

    if (membership.role === 'pm') {
      if (query.projectId === undefined) {
        throw new ForbiddenException(
          'Project managers must scope invoices to an assigned project',
        );
      }
      await this.requirePmProjectAccess(
        user.sub,
        user.workspaceId,
        query.projectId,
      );
    } else if (query.projectId !== undefined) {
      await this.requireWorkspaceProject(user.workspaceId, query.projectId);
    }

    const conditions = [
      eq(timeEntries.workspaceId, user.workspaceId),
      isNotNull(timeEntries.endedAt),
      isNotNull(timeEntries.durationSeconds),
      eq(timeEntries.isBillable, true),
      isNull(timeEntries.invoiceId),
      gte(timeEntries.startedAt, new Date(query.dateFrom)),
      lt(
        timeEntries.startedAt,
        new Date(new Date(query.dateTo).getTime() + 86_400_000),
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
      .where(and(...conditions))
      .orderBy(timeEntries.startedAt);

    const totalSeconds = rows.reduce(
      (sum, e) => sum + (e.durationSeconds ?? 0),
      0,
    );
    const totalHoursCents = Math.round((totalSeconds / 3600) * 100);
    const totalHours = totalHoursCents / 100;

    const entries: InvoiceTimeEntrySummary[] = rows.map((e) => ({
      id: e.id,
      taskId: e.taskId,
      userId: e.userId,
      startedAt: e.startedAt.toISOString(),
      endedAt: e.endedAt!.toISOString(),
      durationSeconds: e.durationSeconds!,
      isBillable: e.isBillable,
      description: e.description,
    }));

    return {
      count: rows.length,
      totalHours,
      entries,
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

    // PMs must scope invoice creation to a visible project.
    if (membership.role === 'pm') {
      if (input.projectId === undefined) {
        throw new ForbiddenException(
          'Project managers must scope invoices to an assigned project',
        );
      }
      await this.requirePmProjectAccess(
        user.sub,
        user.workspaceId,
        input.projectId,
      );
    } else if (input.projectId !== undefined) {
      // Admins: verify the project belongs to the workspace.
      await this.requireWorkspaceProject(user.workspaceId, input.projectId);
    }

    // Resolve snapshot rate and currency from workspace settings when omitted.
    const [settings] = await this.db
      .select({
        defaultHourlyRate: workspaceSettings.defaultHourlyRate,
        currency: workspaceSettings.currency,
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

    return this.db.transaction(async (tx) => {
      // Lock eligible time entries: completed, billable, not already invoiced,
      // within the requested workspace/project/date range.
      const eligibilityConditions = [
        eq(timeEntries.workspaceId, user.workspaceId),
        isNotNull(timeEntries.endedAt),
        isNotNull(timeEntries.durationSeconds),
        eq(timeEntries.isBillable, true),
        isNull(timeEntries.invoiceId),
        // UTC day bounds; the exclusive next-day end keeps the ::date cast
        // out of the predicate so startedAt can use its timestamp index.
        gte(timeEntries.startedAt, new Date(input.dateFrom)),
        lt(
          timeEntries.startedAt,
          new Date(new Date(input.dateTo).getTime() + 86_400_000),
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

      const eligibleEntries = await tx
        .select(linkedTimeEntrySelection)
        .from(timeEntries)
        .where(and(...eligibilityConditions))
        .for('update');

      // Compute snapshot totals.
      const totalSeconds = eligibleEntries.reduce(
        (sum, e) => sum + (e.durationSeconds ?? 0),
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
          status: 'draft',
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          hourlyRate,
          currency,
          discountPercent,
          totalHours,
          totalAmount,
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

      // Re-read the full invoice detail with linked entries.
      return this.readInvoiceDetail(tx, invoice.id, user.workspaceId);
    });
  }

  // ── Detail ────────────────────────────────────────────────────────────

  async getInvoice(user: AuthUser, id: string): Promise<InvoiceResponse> {
    const membership = await this.members.requireRole(
      user.sub,
      user.workspaceId,
      ['admin', 'pm'],
    );

    const invoice = await this.findInvoiceOrThrow(user.workspaceId, id);

    if (membership.role === 'pm') {
      await this.requirePmInvoiceAccess(user.sub, invoice);
    }

    const entryRows = await this.loadLinkedEntries(this.db, id);

    return this.toInvoiceResponse(invoice, entryRows);
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

    const invoice = await this.findInvoiceOrThrow(user.workspaceId, id);

    if (membership.role === 'pm') {
      await this.requirePmInvoiceAccess(user.sub, invoice);
    }

    const updates: Partial<typeof invoices.$inferInsert> = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.status !== undefined) updates.status = input.status;
    if (input.notes !== undefined) updates.notes = input.notes;

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await this.db.update(invoices).set(updates).where(eq(invoices.id, id));
    }

    const refreshed = await this.findInvoiceOrThrow(user.workspaceId, id);
    const entryRows = await this.loadLinkedEntries(this.db, id);

    return this.toInvoiceResponse(refreshed, entryRows);
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

  private async loadInvoiceDetail(
    cx: DrizzleDB | DbTransaction,
    workspaceId: string,
    id: string,
  ): Promise<InvoiceDetailRow | null> {
    const [row] = await cx
      .select(invoiceDetailSelection)
      .from(invoices)
      .leftJoin(projects, eq(projects.id, invoices.projectId))
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
      .where(eq(timeEntries.invoiceId, invoiceId))
      .orderBy(timeEntries.startedAt);
  }

  /**
   * Pure snapshot-totals computation: hours from seconds, then amount with
   * optional percentage discount. Both values are rounded to 2 decimal
   * places to match the stored DECIMAL precision.
   *
   * The amount is computed in integer fixed-point (centihours × cents ×
   * discount basis points) so half-cent boundaries round half-up exactly;
   * binary floating point can represent e.g. 37.605 as 3760.4999… and round
   * it down to 37.60 instead of 37.61.
   */
  private computeInvoiceTotals(
    totalSeconds: number,
    hourlyRate: number,
    discountPercent: number,
  ): { totalHours: number; totalAmount: number } {
    const totalHoursCents = Math.round((totalSeconds / 3600) * 100);
    const rateCents = Math.round(hourlyRate * 100);
    const discountBps = Math.round(discountPercent * 100); // 0–10000
    const discountFactor = 10_000 - discountBps; // 0–10000

    // totalAmount = (totalHoursCents/100) × (rateCents/100) ×
    //                (discountFactor/10_000)
    //             = totalHoursCents × rateCents × discountFactor / 1e8
    const amountCents = Math.round(
      (totalHoursCents * rateCents * discountFactor) / 1_000_000,
    );

    return {
      totalHours: totalHoursCents / 100,
      totalAmount: amountCents / 100,
    };
  }

  private async requirePmProjectAccess(
    userId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const [row] = await this.db
      .select({ id: projects.id })
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
  }

  private async requireWorkspaceProject(
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const [row] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Project not found');
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
      startedAt: e.startedAt.toISOString(),
      endedAt: e.endedAt!.toISOString(),
      durationSeconds: e.durationSeconds!,
      isBillable: e.isBillable,
      description: e.description,
    }));

    return {
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
      notes: row.notes,
      createdBy: row.createdBy,
      timeEntryCount: entries.length,
      timeEntries: entrySummaries,
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
      notes: row.notes,
      createdBy: row.createdBy,
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
