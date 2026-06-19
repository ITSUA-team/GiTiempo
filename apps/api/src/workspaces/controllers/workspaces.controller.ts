import {
  Delete,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user';
import { WorkspaceAdminGuard } from '../../members/guards/workspace-admin.guard';
import { WorkspaceGitHubOrganizationsService } from '../../github/services/workspace-github-organizations.service';
import { AddWorkspaceGitHubOrganizationDto } from '../dto/add-workspace-github-organization.dto';
import { UpdateWorkspaceSettingsDto } from '../dto/update-workspace-settings.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { WorkspaceGitHubOrganizationListResponseDto } from '../dto/workspace-github-organization-list-response.dto';
import { WorkspaceGitHubOrganizationRecoveryErrorResponseDto } from '../dto/workspace-github-organization-recovery-error-response.dto';
import { WorkspaceGitHubOrganizationResponseDto } from '../dto/workspace-github-organization-response.dto';
import { WorkspaceSettingsResponseDto } from '../dto/workspace-settings-response.dto';
import { WorkspaceResponseDto } from '../dto/workspace-response.dto';
import { WorkspacesService } from '../services/workspaces.service';

@ApiTags('workspace')
@ApiBearerAuth()
@Controller('workspace')
export class WorkspacesController {
  constructor(
    private readonly workspaces: WorkspacesService,
    private readonly workspaceGitHubOrganizations: WorkspaceGitHubOrganizationsService,
  ) {}

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

  @Get('github/organizations')
  @UseGuards(WorkspaceAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List workspace allowed GitHub organizations' })
  @ApiOkResponse({ type: WorkspaceGitHubOrganizationListResponseDto })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ZodSerializerDto(WorkspaceGitHubOrganizationListResponseDto)
  listGitHubOrganizations(
    @CurrentUser() user: AuthUser,
  ): Promise<WorkspaceGitHubOrganizationListResponseDto> {
    return this.workspaceGitHubOrganizations.list(user.workspaceId);
  }

  @Post('github/organizations')
  @UseGuards(WorkspaceAdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add an allowed GitHub organization to the workspace',
  })
  @ApiCreatedResponse({ type: WorkspaceGitHubOrganizationResponseDto })
  @ApiBadRequestResponse({
    description:
      'The organization cannot be added until the GitHub connection or GitHub App access issue is resolved',
    type: WorkspaceGitHubOrganizationRecoveryErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'Existing GitHub-backed workspace mappings for this organization must be reconciled before it can be allowed',
  })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiServiceUnavailableResponse({
    description: 'GitHub organization validation is temporarily unavailable',
    type: WorkspaceGitHubOrganizationRecoveryErrorResponseDto,
  })
  @ZodSerializerDto(WorkspaceGitHubOrganizationResponseDto)
  addGitHubOrganization(
    @CurrentUser() user: AuthUser,
    @Body() body: AddWorkspaceGitHubOrganizationDto,
  ): Promise<WorkspaceGitHubOrganizationResponseDto> {
    return this.workspaceGitHubOrganizations.add(user, body);
  }

  @Delete('github/organizations/:organizationId')
  @UseGuards(WorkspaceAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove an allowed GitHub organization from the workspace',
  })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Admin role required' })
  removeGitHubOrganization(
    @CurrentUser() user: AuthUser,
    @Param('organizationId') organizationId: string,
  ): Promise<void> {
    return this.workspaceGitHubOrganizations.remove(
      user.workspaceId,
      organizationId,
    );
  }
}
