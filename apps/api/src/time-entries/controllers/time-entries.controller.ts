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
import { CreateManualTimeEntryDto } from '../dto/create-manual-time-entry.dto';
import { CurrentTimeEntryResponseDto } from '../dto/current-time-entry-response.dto';
import { StartTimerFromGitHubDto } from '../dto/start-timer-from-github.dto';
import { StartTimerDto } from '../dto/start-timer.dto';
import { TimeEntryListQueryDto } from '../dto/time-entry-list-query.dto';
import { TimeEntryListResponseDto } from '../dto/time-entry-list-response.dto';
import { TimeEntryResponseDto } from '../dto/time-entry-response.dto';
import { UpdateTimeEntryDto } from '../dto/update-time-entry.dto';
import { TimeEntriesService } from '../services/time-entries.service';

@ApiTags('time-entries')
@ApiBearerAuth()
@Controller()
export class TimeEntriesController {
  constructor(private readonly timeEntries: TimeEntriesService) {}

  @Get('time-entries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List own time entries' })
  @ApiOkResponse({ type: TimeEntryListResponseDto })
  @ZodSerializerDto(TimeEntryListResponseDto)
  listOwnEntries(
    @CurrentUser() user: AuthUser,
    @Query() query: TimeEntryListQueryDto,
  ): Promise<TimeEntryListResponseDto> {
    return this.timeEntries.listOwnEntries(user, query);
  }

  @Post('time-entries')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a manual time entry' })
  @ApiCreatedResponse({ type: TimeEntryResponseDto })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiUnprocessableEntityResponse({ description: 'Task or project inactive' })
  @ZodSerializerDto(TimeEntryResponseDto)
  createManualEntry(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateManualTimeEntryDto,
  ): Promise<TimeEntryResponseDto> {
    return this.timeEntries.createManualEntry(user, body);
  }

  @Get('time-entries/current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current running timer' })
  @ApiOkResponse({ type: CurrentTimeEntryResponseDto })
  @ZodSerializerDto(CurrentTimeEntryResponseDto)
  getCurrentTimer(
    @CurrentUser() user: AuthUser,
  ): Promise<CurrentTimeEntryResponseDto> {
    return this.timeEntries.getCurrentTimer(user);
  }

  @Post('time-entries/timer/start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start timer for an existing task' })
  @ApiCreatedResponse({ type: TimeEntryResponseDto })
  @ApiConflictResponse({ description: 'Timer already running' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiUnprocessableEntityResponse({ description: 'Task or project inactive' })
  @ZodSerializerDto(TimeEntryResponseDto)
  startTimer(
    @CurrentUser() user: AuthUser,
    @Body() body: StartTimerDto,
  ): Promise<TimeEntryResponseDto> {
    return this.timeEntries.startTimer(user, body);
  }

  @Post('time-entries/timer/start-from-github')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start timer from GitHub issue data' })
  @ApiCreatedResponse({ type: TimeEntryResponseDto })
  @ApiConflictResponse({ description: 'Timer already running' })
  @ApiUnprocessableEntityResponse({ description: 'Project or task inactive' })
  @ZodSerializerDto(TimeEntryResponseDto)
  startTimerFromGitHub(
    @CurrentUser() user: AuthUser,
    @Body() body: StartTimerFromGitHubDto,
  ): Promise<TimeEntryResponseDto> {
    return this.timeEntries.startTimerFromGitHub(user, body);
  }

  @Post('time-entries/timer/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop current running timer' })
  @ApiOkResponse({ type: TimeEntryResponseDto })
  @ApiNotFoundResponse({ description: 'Running timer not found' })
  @ZodSerializerDto(TimeEntryResponseDto)
  stopTimer(@CurrentUser() user: AuthUser): Promise<TimeEntryResponseDto> {
    return this.timeEntries.stopTimer(user);
  }

  @Get('time-entries/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get own time entry' })
  @ApiOkResponse({ type: TimeEntryResponseDto })
  @ApiNotFoundResponse({ description: 'Time entry not found' })
  @ZodSerializerDto(TimeEntryResponseDto)
  getOwnEntry(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<TimeEntryResponseDto> {
    return this.timeEntries.getOwnEntry(user, id);
  }

  @Patch('time-entries/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update own time entry' })
  @ApiOkResponse({ type: TimeEntryResponseDto })
  @ApiConflictResponse({
    description:
      'Running entries may update only task and description without stopping first',
  })
  @ApiNotFoundResponse({ description: 'Time entry not found' })
  @ApiUnprocessableEntityResponse({ description: 'Task or project inactive' })
  @ZodSerializerDto(TimeEntryResponseDto)
  updateOwnEntry(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateTimeEntryDto,
  ): Promise<TimeEntryResponseDto> {
    return this.timeEntries.updateOwnEntry(user, id, body);
  }

  @Delete('time-entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own completed time entry' })
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'Running entries must be stopped first' })
  @ApiNotFoundResponse({ description: 'Time entry not found' })
  deleteOwnEntry(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.timeEntries.deleteOwnEntry(user, id);
  }

  @Get('projects/:projectId/time-entries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List visible project time entries' })
  @ApiOkResponse({ type: TimeEntryListResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ZodSerializerDto(TimeEntryListResponseDto)
  listProjectEntries(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query() query: TimeEntryListQueryDto,
  ): Promise<TimeEntryListResponseDto> {
    return this.timeEntries.listProjectEntries(user, projectId, query);
  }
}
