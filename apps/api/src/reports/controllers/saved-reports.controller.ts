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
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user';
import {
  CreateSavedReportDto,
  SavedReportListResponseDto,
  SavedReportResponseDto,
  UpdateSavedReportDto,
} from '../dto/saved-report.dto';
import { SavedReportsService } from '../services/saved-reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports/saved')
export class SavedReportsController {
  constructor(private readonly savedReports: SavedReportsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List saved report presets for the workspace' })
  @ApiOkResponse({ type: SavedReportListResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ZodSerializerDto(SavedReportListResponseDto)
  list(@CurrentUser() user: AuthUser) {
    return this.savedReports.list(user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a saved report preset' })
  @ApiCreatedResponse({ type: SavedReportResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ApiConflictResponse({ description: 'Preset name already used' })
  @ZodSerializerDto(SavedReportResponseDto)
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateSavedReportDto,
  ): Promise<SavedReportResponseDto> {
    return this.savedReports.create(user, body);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rename a saved report preset or replace its config',
  })
  @ApiOkResponse({ type: SavedReportResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ApiNotFoundResponse({ description: 'Preset not found in this workspace' })
  @ApiConflictResponse({ description: 'Preset name already used' })
  @ZodSerializerDto(SavedReportResponseDto)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateSavedReportDto,
  ): Promise<SavedReportResponseDto> {
    return this.savedReports.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved report preset' })
  @ApiNoContentResponse({ description: 'Preset deleted' })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ApiNotFoundResponse({ description: 'Preset not found in this workspace' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.savedReports.remove(user, id);
  }
}
