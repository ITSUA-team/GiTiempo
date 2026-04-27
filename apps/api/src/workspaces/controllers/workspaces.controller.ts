import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user';
import { WorkspaceAdminGuard } from '../../members/guards/workspace-admin.guard';
import { UpdateWorkspaceSettingsDto } from '../dto/update-workspace-settings.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { WorkspaceSettingsResponseDto } from '../dto/workspace-settings-response.dto';
import { WorkspaceResponseDto } from '../dto/workspace-response.dto';
import { WorkspacesService } from '../services/workspaces.service';

@ApiTags('workspace')
@ApiBearerAuth()
@Controller('workspace')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the current workspace' })
  @ApiOkResponse({ type: WorkspaceResponseDto })
  @ZodSerializerDto(WorkspaceResponseDto)
  getWorkspace(@CurrentUser() user: AuthUser): Promise<WorkspaceResponseDto> {
    return this.workspaces.getWorkspace(user.workspaceId);
  }

  @Patch()
  @UseGuards(WorkspaceAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update workspace identity fields' })
  @ApiOkResponse({ type: WorkspaceResponseDto })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ZodSerializerDto(WorkspaceResponseDto)
  updateWorkspace(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaces.updateWorkspace(user.workspaceId, body);
  }

  @Get('settings')
  @UseGuards(WorkspaceAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get workspace settings' })
  @ApiOkResponse({ type: WorkspaceSettingsResponseDto })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ZodSerializerDto(WorkspaceSettingsResponseDto)
  getSettings(
    @CurrentUser() user: AuthUser,
  ): Promise<WorkspaceSettingsResponseDto> {
    return this.workspaces.getSettings(user.workspaceId);
  }

  @Patch('settings')
  @UseGuards(WorkspaceAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update workspace settings' })
  @ApiOkResponse({ type: WorkspaceSettingsResponseDto })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ZodSerializerDto(WorkspaceSettingsResponseDto)
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateWorkspaceSettingsDto,
  ): Promise<WorkspaceSettingsResponseDto> {
    return this.workspaces.updateSettings(user.workspaceId, body);
  }
}
