import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user';
import { TimeReportExportQueryDto } from '../dto/time-report-export-query.dto';
import { TimeReportQueryDto } from '../dto/time-report-query.dto';
import { TimeReportResponseDto } from '../dto/time-report-response.dto';
import { ReportsService } from '../services/reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('time')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get aggregated time report' })
  @ApiOkResponse({ type: TimeReportResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ZodSerializerDto(TimeReportResponseDto)
  getTimeReport(
    @CurrentUser() user: AuthUser,
    @Query() query: TimeReportQueryDto,
  ): Promise<TimeReportResponseDto> {
    return this.reports.getTimeReport(user, query);
  }

  @Get('time/export')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Export aggregated time report as CSV' })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'CSV export of aggregate report rows',
    schema: { type: 'string' },
  })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  async exportTimeReport(
    @CurrentUser() user: AuthUser,
    @Query() query: TimeReportExportQueryDto,
  ): Promise<StreamableFile> {
    const exportResult = await this.reports.exportTimeReport(user, query);
    return new StreamableFile(Buffer.from(exportResult.content, 'utf8'), {
      disposition: `attachment; filename="${exportResult.filename}"`,
      type: 'text/csv; charset=utf-8',
    });
  }
}
