import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user';
import { BackfillProjectBillableDefaultDto } from '../dto/backfill-project-billable-default.dto';
import { CreateProjectAssignmentDto } from '../dto/create-project-assignment.dto';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ManagementProjectSummaryResponseDto } from '../dto/management-project-summary-response.dto';
import { MyProjectSummaryResponseDto } from '../dto/my-project-summary-response.dto';
import { ProjectBillableDefaultBackfillResponseDto } from '../dto/project-billable-default-backfill-response.dto';
import { ProjectAssignmentListResponseDto } from '../dto/project-assignment-list-response.dto';
import { ProjectAssignmentResponseDto } from '../dto/project-assignment-response.dto';
import { ProjectDetailResponseDto } from '../dto/project-detail-response.dto';
import { ProjectListResponseDto } from '../dto/project-list-response.dto';
import { ProjectResponseDto } from '../dto/project-response.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectsService } from '../services/projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List visible projects' })
  @ApiOkResponse({ type: ProjectResponseDto, isArray: true })
  @ZodSerializerDto(ProjectListResponseDto)
  listProjects(@CurrentUser() user: AuthUser): Promise<ProjectResponseDto[]> {
    return this.projects.listProjects(user);
  }

  @Get('management-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get management project summary' })
  @ApiOkResponse({ type: ManagementProjectSummaryResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ZodSerializerDto(ManagementProjectSummaryResponseDto)
  getManagementSummary(
    @CurrentUser() user: AuthUser,
  ): Promise<ManagementProjectSummaryResponseDto> {
    return this.projects.getManagementSummary(user);
  }

  @Get('my-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user project summary' })
  @ApiOkResponse({ type: MyProjectSummaryResponseDto })
  @ZodSerializerDto(MyProjectSummaryResponseDto)
  getMySummary(
    @CurrentUser() user: AuthUser,
  ): Promise<MyProjectSummaryResponseDto> {
    return this.projects.getMySummary(user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a project' })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ZodSerializerDto(ProjectResponseDto)
  createProject(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projects.createProject(user, body);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a visible project' })
  @ApiOkResponse({ type: ProjectDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ZodSerializerDto(ProjectDetailResponseDto)
  getProject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ProjectDetailResponseDto> {
    return this.projects.getProject(user, id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a project' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiForbiddenResponse({ description: 'Project update forbidden' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ZodSerializerDto(ProjectResponseDto)
  updateProject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projects.updateProject(user, id, body);
  }

  @Post(':id/billable-default/backfill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Backfill a project billable default' })
  @ApiOkResponse({ type: ProjectBillableDefaultBackfillResponseDto })
  @ApiForbiddenResponse({ description: 'Project update forbidden' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ZodSerializerDto(ProjectBillableDefaultBackfillResponseDto)
  backfillBillableDefault(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: BackfillProjectBillableDefaultDto,
  ): Promise<ProjectBillableDefaultBackfillResponseDto> {
    return this.projects.backfillBillableDefault(user, id, body);
  }

  @Get(':id/assignments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List project assignments' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ZodSerializerDto(ProjectAssignmentListResponseDto)
  listAssignments(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ProjectAssignmentResponseDto[]> {
    return this.projects.listAssignments(user, id);
  }

  @Post(':id/assignments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a workspace user to a project' })
  @ApiCreatedResponse({ type: ProjectAssignmentResponseDto })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Project or member not found' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid assignment target' })
  @ZodSerializerDto(ProjectAssignmentResponseDto)
  createAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: CreateProjectAssignmentDto,
  ): Promise<ProjectAssignmentResponseDto> {
    return this.projects.createAssignment(user, id, body);
  }

  @Delete(':id/assignments/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a project assignment' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Project assignment not found' })
  removeAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.projects.removeAssignment(user, id, userId);
  }
}
