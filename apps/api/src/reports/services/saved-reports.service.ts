import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import {
  savedReportConfigSchema,
  timeReportGroupBySchema,
  type CreateSavedReportInput,
  type SavedReport,
  type SavedReportConfig,
  type UpdateSavedReportInput,
} from '@gitiempo/shared';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import {
  getPostgresError,
  POSTGRES_UNIQUE_VIOLATION,
} from '../../db/postgres-errors';
import { MembersService } from '../../members/services/members.service';
import type { AuthUser } from '../../auth/types/auth-user';
import {
  SAVED_REPORTS_WORKSPACE_NAME_UNIQUE,
  savedReports,
  savedReportRowSelection,
} from '../schemas/saved-reports.schema';

type SavedReportRow = typeof savedReports.$inferSelect;

/**
 * Grouping dimensions that stored configs may carry under an old vocabulary.
 * The report UI names the member dimension `member`; the API/persisted contract
 * has always named it `user`, so an early preset that stored the UI word (before
 * the client-side conversion existed) is repaired to `user` on read.
 */
const LEGACY_GROUPING_ALIASES: Record<string, string> = {
  member: 'user',
};

/**
 * Report presets are workspace-shared: every admin and PM sees the same list
 * and may edit or delete any entry. `createdBy` is attribution only.
 *
 * A preset stores filter selections, never rows, so it cannot widen anyone's
 * report scope — running the report still goes through the scoped query in
 * `ReportsService`.
 */
@Injectable()
export class SavedReportsService {
  private readonly logger = new Logger(SavedReportsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly members: MembersService,
  ) {}

  async list(user: AuthUser): Promise<SavedReport[]> {
    await this.requireReportsRole(user);

    const rows = await this.db
      .select(savedReportRowSelection)
      .from(savedReports)
      .where(eq(savedReports.workspaceId, user.workspaceId))
      .orderBy(desc(savedReports.createdAt));

    // Read is resilient per row: a single preset with a config too corrupt to
    // repair is dropped from the response (and logged), never allowed to fail
    // the whole list for every admin/PM in the workspace.
    return rows
      .map((row) => this.toSavedReportOrNull(row))
      .filter((report): report is SavedReport => report !== null);
  }

  async create(
    user: AuthUser,
    input: CreateSavedReportInput,
  ): Promise<SavedReport> {
    await this.requireReportsRole(user);

    // The config column is written only through the shared schema (D3), so a
    // malformed config cannot enter even from an internal caller that bypasses
    // the HTTP DTO. Symmetric with the re-validation in toSavedReport.
    const config = savedReportConfigSchema.parse(input.config);

    try {
      const [row] = await this.db
        .insert(savedReports)
        .values({
          config,
          createdBy: user.sub,
          name: input.name,
          workspaceId: user.workspaceId,
        })
        .returning();

      return this.toSavedReport(row!);
    } catch (error) {
      throw this.mapDuplicateName(error, input.name);
    }
  }

  async update(
    user: AuthUser,
    id: string,
    input: UpdateSavedReportInput,
  ): Promise<SavedReport> {
    await this.requireReportsRole(user);

    // Same write-side guard as create: a provided config is parsed through the
    // shared schema before it can reach the column (D3).
    const config =
      input.config === undefined
        ? undefined
        : savedReportConfigSchema.parse(input.config);

    try {
      const [row] = await this.db
        .update(savedReports)
        .set({
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(config === undefined ? {} : { config }),
          updatedAt: new Date(),
        })
        .where(this.scopedId(user, id))
        .returning();

      if (!row) throw new NotFoundException('Saved report not found');

      return this.toSavedReport(row);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw this.mapDuplicateName(error, input.name);
    }
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    await this.requireReportsRole(user);

    const [row] = await this.db
      .delete(savedReports)
      .where(this.scopedId(user, id))
      .returning({ id: savedReports.id });

    if (!row) throw new NotFoundException('Saved report not found');
  }

  private async requireReportsRole(user: AuthUser): Promise<void> {
    await this.members.requireRole(user.sub, user.workspaceId, ['admin', 'pm']);
  }

  /**
   * Every mutation is keyed by id AND workspace, so an id from another
   * workspace is not found rather than editable.
   */
  private scopedId(user: AuthUser, id: string) {
    return and(
      eq(savedReports.id, id),
      eq(savedReports.workspaceId, user.workspaceId),
    );
  }

  private mapDuplicateName(error: unknown, name?: string): unknown {
    const details = getPostgresError(error);
    if (
      details?.code === POSTGRES_UNIQUE_VIOLATION &&
      details.constraint === SAVED_REPORTS_WORKSPACE_NAME_UNIQUE
    ) {
      return new ConflictException(
        name === undefined
          ? 'A saved report with this name already exists'
          : `A saved report named "${name}" already exists`,
      );
    }

    return error;
  }

  /**
   * Config is re-validated on read so a row written before the config shape
   * changed surfaces its defaults instead of reaching the client half-formed.
   * Callers here (create/update) re-read a config they just validated, so the
   * parse always succeeds; the resilient `toSavedReportOrNull` is used for the
   * unfiltered list, where a stale row could be corrupt.
   */
  private toSavedReport(row: SavedReportRow): SavedReport {
    return this.buildSavedReport(row, this.parseStoredConfig(row.config));
  }

  /** Read-side variant that repairs a stale config, or drops the row if it is
   * corrupt beyond repair (logged), so one preset cannot fail the whole list. */
  private toSavedReportOrNull(row: SavedReportRow): SavedReport | null {
    const result = savedReportConfigSchema.safeParse(
      this.repairStoredConfig(row.config),
    );
    if (!result.success) {
      this.logger.warn({
        event: 'saved_reports.config_unrepairable',
        savedReportId: row.id,
        workspaceId: row.workspaceId,
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          code: issue.code,
        })),
      });
      return null;
    }
    return this.buildSavedReport(row, result.data);
  }

  private buildSavedReport(
    row: SavedReportRow,
    config: SavedReportConfig,
  ): SavedReport {
    return {
      config,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      id: row.id,
      name: row.name,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseStoredConfig(config: unknown): SavedReportConfig {
    return savedReportConfigSchema.parse(this.repairStoredConfig(config));
  }

  /**
   * Normalizes a stored config's `grouping` path so a stale value cannot fail
   * validation: legacy dimension names are mapped forward (e.g. `member` →
   * `user`), unknown levels are dropped, duplicates are removed, and an empty
   * result falls back to the schema default (`["project"]`). Other fields are
   * left untouched — the shared schema strips unknown keys and fills defaults.
   */
  private repairStoredConfig(config: unknown): unknown {
    if (
      typeof config !== 'object' ||
      config === null ||
      !('grouping' in config)
    ) {
      return config;
    }
    const grouping = (config as { grouping: unknown }).grouping;
    if (!Array.isArray(grouping)) return config;

    const repaired: string[] = [];
    for (const level of grouping) {
      const mapped =
        typeof level === 'string'
          ? (LEGACY_GROUPING_ALIASES[level] ?? level)
          : level;
      const parsed = timeReportGroupBySchema.safeParse(mapped);
      if (parsed.success && !repaired.includes(parsed.data)) {
        repaired.push(parsed.data);
      }
    }

    return {
      ...config,
      grouping: repaired.length > 0 ? repaired : ['project'],
    };
  }
}
