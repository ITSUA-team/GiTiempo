import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type {
  UpdateWorkspaceInput,
  UpdateWorkspaceSettingsInput,
  WorkspaceResponse,
  WorkspaceSettingsResponse,
} from '@gitiempo/shared';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { workspaceSettings } from '../schemas/workspace-settings.schema';
import { workspaces } from '../schemas/workspaces.schema';

type WorkspaceRow = typeof workspaces.$inferSelect;
type WorkspaceSettingsRow = typeof workspaceSettings.$inferSelect;

@Injectable()
export class WorkspacesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getWorkspace(workspaceId: string): Promise<WorkspaceResponse> {
    const row = await this.findWorkspace(workspaceId);
    return this.toWorkspaceResponse(row);
  }

  async updateWorkspace(
    workspaceId: string,
    input: UpdateWorkspaceInput,
  ): Promise<WorkspaceResponse> {
    const [row] = await this.db
      .update(workspaces)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId))
      .returning();
    if (!row) throw new UnauthorizedException('Unauthorized');
    return this.toWorkspaceResponse(row);
  }

  async getSettings(workspaceId: string): Promise<WorkspaceSettingsResponse> {
    const row = await this.findSettings(workspaceId);
    return this.toSettingsResponse(row);
  }

  async updateSettings(
    workspaceId: string,
    input: UpdateWorkspaceSettingsInput,
  ): Promise<WorkspaceSettingsResponse> {
    const [row] = await this.db
      .update(workspaceSettings)
      .set({
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.defaultHourlyRate !== undefined
          ? { defaultHourlyRate: input.defaultHourlyRate }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .returning();
    if (!row) throw new NotFoundException('Workspace settings not found');
    return this.toSettingsResponse(row);
  }

  private async findWorkspace(workspaceId: string): Promise<WorkspaceRow> {
    const [row] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    if (!row) throw new UnauthorizedException('Unauthorized');
    return row;
  }

  private async findSettings(
    workspaceId: string,
  ): Promise<WorkspaceSettingsRow> {
    const [row] = await this.db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .limit(1);
    if (!row) throw new NotFoundException('Workspace settings not found');
    return row;
  }

  private toWorkspaceResponse(row: WorkspaceRow): WorkspaceResponse {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toSettingsResponse(
    row: WorkspaceSettingsRow,
  ): WorkspaceSettingsResponse {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      currency: row.currency,
      defaultHourlyRate: row.defaultHourlyRate,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
