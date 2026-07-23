import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user';
import { ReportPdfExportRequestDto } from '../dto/report-pdf-export-request.dto';
import { TimeReportExportRequestDto } from '../dto/time-report-export-request.dto';
import { TimeReportRequestDto } from '../dto/time-report-request.dto';
import { TimeReportResponseDto } from '../dto/time-report-response.dto';
import { ReportsService } from '../services/reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // POST, not GET: report filters are a validated JSON body rather than a
  // query string, so nothing about a report request travels in the URL.
  @Post('time')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: TimeReportRequestDto })
  @ApiOperation({ summary: 'Get aggregated time report' })
  @ApiOkResponse({ type: TimeReportResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ZodSerializerDto(TimeReportResponseDto)
  getTimeReport(
    @CurrentUser() user: AuthUser,
    @Body() body: TimeReportRequestDto,
  ): Promise<TimeReportResponseDto> {
    return this.reports.getTimeReport(user, body);
  }

  // POST, not GET: the export request is a validated set of named properties
  // in a JSON body, which keeps report filters out of URLs and proxy logs.
  @Post('time/export')
  @HttpCode(HttpStatus.OK)
  // Browsers hide Content-Disposition on cross-origin responses unless it is
  // exposed, and without it the download loses the real .csv/.pdf filename.
  @Header('Access-Control-Expose-Headers', 'Content-Disposition')
  @ApiBody({ type: TimeReportExportRequestDto })
  @ApiOperation({ summary: 'Export aggregated time report as CSV or PDF' })
  @ApiProduces('text/csv', 'application/pdf')
  @ApiOkResponse({
    description: 'CSV or PDF export of the report',
    schema: { type: 'string' },
  })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  async exportTimeReport(
    @CurrentUser() user: AuthUser,
    @Body() body: TimeReportExportRequestDto,
  ): Promise<StreamableFile> {
    const exportResult = await this.reports.exportTimeReport(user, body);
    const content = Buffer.isBuffer(exportResult.content)
      ? exportResult.content
      : Buffer.from(exportResult.content, 'utf8');

    return new StreamableFile(content, {
      disposition: `attachment; filename="${exportResult.filename}"`,
      type: exportResult.contentType,
    });
  }

  // WYSIWYG export: the client sends the exact on-screen (filtered, grouped)
  // report as a validated document and the server only applies the PDF styling,
  // so the file matches the screen. No DB query runs; the role gate stays.
  @Post('time/export/pdf')
  @HttpCode(HttpStatus.OK)
  @Header('Access-Control-Expose-Headers', 'Content-Disposition')
  @ApiBody({ type: ReportPdfExportRequestDto })
  @ApiOperation({ summary: 'Render an on-screen report document as a PDF' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'PDF of the report exactly as shown on screen',
    schema: { type: 'string' },
  })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  async exportReportPdf(
    @CurrentUser() user: AuthUser,
    @Body() body: ReportPdfExportRequestDto,
  ): Promise<StreamableFile> {
    const exportResult = await this.reports.renderPdfDocument(
      user,
      body.document,
    );
    const content = Buffer.isBuffer(exportResult.content)
      ? exportResult.content
      : Buffer.from(exportResult.content, 'utf8');

    return new StreamableFile(content, {
      disposition: `attachment; filename="${exportResult.filename}"`,
      type: exportResult.contentType,
    });
  }
}
