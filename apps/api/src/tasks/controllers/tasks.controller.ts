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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user';
import {
  GithubIssueListQueryDto,
  GithubRepositoryIssueListResponseDto,
} from '../../github/dto/github-browsing.dto';
import { BackfillTaskBillableDefaultDto } from '../dto/backfill-task-billable-default.dto';
import { CreateTaskDto } from '../dto/create-task.dto';
import { EnsureGitHubIssueTaskDto } from '../dto/ensure-github-issue-task.dto';
import { TaskBillableDefaultBackfillResponseDto } from '../dto/task-billable-default-backfill-response.dto';
import { TaskListQueryDto } from '../dto/task-list-query.dto';
import { TaskListResponseDto } from '../dto/task-list-response.dto';
import { TaskResponseDto } from '../dto/task-response.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TasksService } from '../services/tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('projects/:projectId/tasks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List tasks for a visible project' })
  @ApiOkResponse({ type: TaskResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ZodSerializerDto(TaskListResponseDto)
  listProjectTasks(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query() query: TaskListQueryDto,
  ): Promise<TaskResponseDto[]> {
    return this.tasks.listProjectTasks(user, projectId, query);
  }

  @Get('projects/:projectId/github/issues')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List GitHub repository issues for a visible GitHub-backed project',
  })
  @ApiOkResponse({ type: GithubRepositoryIssueListResponseDto })
  @ApiNotFoundResponse({ description: 'Project or GitHub repository not found' })
  @ZodSerializerDto(GithubRepositoryIssueListResponseDto)
  listProjectGitHubIssues(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query() query: GithubIssueListQueryDto,
  ): Promise<GithubRepositoryIssueListResponseDto> {
    return this.tasks.listProjectGitHubIssues(user, projectId, query);
  }

  @Post('projects/:projectId/tasks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a task in a visible project' })
  @ApiCreatedResponse({ type: TaskResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ApiUnprocessableEntityResponse({ description: 'Project is inactive' })
  @ZodSerializerDto(TaskResponseDto)
  createTask(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() body: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasks.createTask(user, projectId, body);
  }

  @Post('tasks/from-github')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create or reuse a visible task from a GitHub issue',
  })
  @ApiCreatedResponse({ type: TaskResponseDto })
  @ApiNotFoundResponse({
    description: 'GitHub connection, project, or issue not found',
  })
  @ApiUnprocessableEntityResponse({ description: 'Project or task inactive' })
  @ZodSerializerDto(TaskResponseDto)
  ensureGitHubIssueTask(
    @CurrentUser() user: AuthUser,
    @Body() body: EnsureGitHubIssueTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasks.ensureGitHubIssueTask(user, body);
  }

  @Get('tasks/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a visible task' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ZodSerializerDto(TaskResponseDto)
  getTask(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<TaskResponseDto> {
    return this.tasks.getTask(user, id);
  }

  @Patch('tasks/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a visible task' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ZodSerializerDto(TaskResponseDto)
  updateTask(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasks.updateTask(user, id, body);
  }

  @Post('tasks/:id/billable-default/backfill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Backfill a task billable default' })
  @ApiOkResponse({ type: TaskBillableDefaultBackfillResponseDto })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiUnprocessableEntityResponse({ description: 'Project is inactive' })
  @ZodSerializerDto(TaskBillableDefaultBackfillResponseDto)
  backfillBillableDefault(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: BackfillTaskBillableDefaultDto,
  ): Promise<TaskBillableDefaultBackfillResponseDto> {
    return this.tasks.backfillBillableDefault(user, id, body);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a visible unused task' })
  @ApiNoContentResponse({ description: 'Task deleted' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiConflictResponse({ description: 'Task has related time entries' })
  deleteTask(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.tasks.deleteTask(user, id);
  }
}
