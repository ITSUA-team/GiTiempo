import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user';
import {
  CreateManagedTimeEntryDto,
  ManagedTimeEntryConflictDto,
  ManagementProjectsQueryDto,
  ManagementProjectsResponseDto,
  ManagementTimeEntriesQueryDto,
  ManagementTimeEntryMembersQueryDto,
  ManagementTimeEntryMembersResponseDto,
  ManagementTimeEntryTasksQueryDto,
  ManagementTimeEntryTasksResponseDto,
  UpdateManagedTimeEntryDto,
} from '../dto/management-time-entries.dto';
import { TimeEntryListResponseDto } from '../dto/time-entry-list-response.dto';
import { TimeEntryResponseDto } from '../dto/time-entry-response.dto';
import { ManagementTimeEntriesService } from '../services/management-time-entries.service';

@ApiTags('management-time-entries')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({
  description: 'Current workspace role cannot manage time entries',
})
@Controller('management/projects')
export class ManagementTimeEntriesController {
  constructor(private readonly management: ManagementTimeEntriesService) {}

  @Get()
  @ApiOperation({
    summary: 'List manageable projects, including archived projects',
  })
  @ApiOkResponse({ type: ManagementProjectsResponseDto })
  @ZodSerializerDto(ManagementProjectsResponseDto)
  listProjects(
    @CurrentUser() user: AuthUser,
    @Query() query: ManagementProjectsQueryDto,
  ) {
    return this.management.listProjects(user, query);
  }

  @Get(':projectId/time-entry-members')
  @ApiOperation({
    summary:
      'List historical owners for filtering or eligible owners for creating entries',
  })
  @ApiOkResponse({ type: ManagementTimeEntryMembersResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ZodSerializerDto(ManagementTimeEntryMembersResponseDto)
  listMembers(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ManagementTimeEntryMembersQueryDto,
  ) {
    return this.management.listMembers(user, projectId, query);
  }

  @Get(':projectId/time-entry-tasks')
  @ApiOperation({
    summary: 'List tasks an owner can currently track in the managed project',
  })
  @ApiOkResponse({ type: ManagementTimeEntryTasksResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ZodSerializerDto(ManagementTimeEntryTasksResponseDto)
  listTasks(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ManagementTimeEntryTasksQueryDto,
  ) {
    return this.management.listTasks(user, projectId, query);
  }

  @Get(':projectId/time-entries')
  @ApiOperation({ summary: 'List individual entries in the managed project' })
  @ApiOkResponse({ type: TimeEntryListResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ZodSerializerDto(TimeEntryListResponseDto)
  listEntries(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ManagementTimeEntriesQueryDto,
  ) {
    return this.management.listEntries(user, projectId, query);
  }

  @Post(':projectId/time-entries')
  @ApiOperation({
    summary: 'Create a completed time entry for an eligible project owner',
  })
  @ApiCreatedResponse({ type: TimeEntryResponseDto })
  @ApiNotFoundResponse({ description: 'Project or task not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Owner or work is ineligible',
  })
  @ZodSerializerDto(TimeEntryResponseDto)
  createEntry(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() input: CreateManagedTimeEntryDto,
  ) {
    return this.management.createEntry(user, projectId, input);
  }

  @Patch(':projectId/time-entries/:entryId')
  @ApiOperation({
    summary: 'Update a completed unlinked entry in the managed project',
  })
  @ApiOkResponse({ type: TimeEntryResponseDto })
  @ApiNotFoundResponse({ description: 'Project, entry or task not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Owner or destination work is ineligible',
  })
  @ApiConflictResponse({ type: ManagedTimeEntryConflictDto })
  @ZodSerializerDto(TimeEntryResponseDto)
  updateEntry(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() input: UpdateManagedTimeEntryDto,
  ) {
    return this.management.updateEntry(user, projectId, entryId, input);
  }

  @Delete(':projectId/time-entries/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a completed unlinked entry in the managed project',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Project or entry not found' })
  @ApiConflictResponse({ type: ManagedTimeEntryConflictDto })
  deleteEntry(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.management.deleteEntry(user, projectId, entryId);
  }
}
