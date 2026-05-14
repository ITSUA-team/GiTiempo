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
import { CreateTaskDto } from '../dto/create-task.dto';
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
  ): Promise<TaskResponseDto[]> {
    return this.tasks.listProjectTasks(user, projectId);
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
