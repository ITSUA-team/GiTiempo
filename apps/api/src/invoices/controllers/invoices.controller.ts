import type { Response } from 'express';
import {
  PreviewInvoiceDto,
  InvoiceGroupDto,
  MoveInvoicesDto,
  PreviewInvoiceResponseDto,
  InvoiceGroupResponseDto,
  InvoiceGroupsResponseDto,
  InvoiceDocumentIncompleteDto,
  InvoiceLogoInvalidDto,
} from '../dto/invoice-management.dto';
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
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  getSchemaPath,
  ApiForbiddenResponse,
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
import { CreateInvoiceRequestDto } from '../dto/create-invoice-request.dto';
import { EligibleEntriesQueryDto } from '../dto/eligible-entries-query.dto';
import { EligibleEntriesResponseDto } from '../dto/eligible-entries-response.dto';
import { InvoiceDefaultsResponseDto } from '../dto/invoice-defaults-response.dto';
import { InvoiceListQueryDto } from '../dto/invoice-list-query.dto';
import { InvoiceListResponseDto } from '../dto/invoice-list-response.dto';
import { InvoiceResponseDto } from '../dto/invoice-response.dto';
import { InvoiceStatsResponseDto } from '../dto/invoice-stats-response.dto';
import { UpdateInvoiceRequestDto } from '../dto/update-invoice-request.dto';
import { InvoicesService } from '../services/invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List invoices (PM: assigned projects only)' })
  @ApiOkResponse({ type: InvoiceListResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ZodSerializerDto(InvoiceListResponseDto)
  listInvoices(
    @CurrentUser() user: AuthUser,
    @Query() query: InvoiceListQueryDto,
  ): Promise<InvoiceListResponseDto> {
    return this.invoices.listInvoices(user, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: CreateInvoiceRequestDto })
  @ApiOperation({ summary: 'Create invoice from eligible time entries' })
  @ApiCreatedResponse({ type: InvoiceResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ZodSerializerDto(InvoiceResponseDto)
  createInvoice(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateInvoiceRequestDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoices.createInvoice(user, body);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get invoice stats (counts by status, this month summary)',
  })
  @ApiOkResponse({ type: InvoiceStatsResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ZodSerializerDto(InvoiceStatsResponseDto)
  getInvoiceStats(
    @CurrentUser() user: AuthUser,
  ): Promise<InvoiceStatsResponseDto> {
    return this.invoices.getInvoiceStats(user);
  }

  @Get('eligible-entries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview eligible time entries for a potential invoice',
  })
  @ApiOkResponse({ type: EligibleEntriesResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ZodSerializerDto(EligibleEntriesResponseDto)
  previewEligibleEntries(
    @CurrentUser() user: AuthUser,
    @Query() query: EligibleEntriesQueryDto,
  ): Promise<EligibleEntriesResponseDto> {
    return this.invoices.previewEligibleEntries(user, query);
  }

  @Get('defaults')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get invoice defaults (currency, rate, rounding step)',
  })
  @ApiOkResponse({ type: InvoiceDefaultsResponseDto })
  @ApiForbiddenResponse({
    description: 'Admin or PM role with invoice view permission required',
  })
  @ZodSerializerDto(InvoiceDefaultsResponseDto)
  getInvoiceDefaults(
    @CurrentUser() user: AuthUser,
  ): Promise<InvoiceDefaultsResponseDto> {
    return this.invoices.getInvoiceDefaults(user);
  }

  @Post('preview')
  @ApiCreatedResponse({ type: PreviewInvoiceResponseDto })
  @ZodSerializerDto(PreviewInvoiceResponseDto)
  preview(@CurrentUser() user: AuthUser, @Body() body: PreviewInvoiceDto) {
    return this.invoices.previewInvoice(user, body);
  }

  @Get('groups')
  @ApiOkResponse({ type: InvoiceGroupsResponseDto })
  @ZodSerializerDto(InvoiceGroupsResponseDto)
  groups(@CurrentUser() user: AuthUser) {
    return this.invoices.listGroups(user);
  }

  @Post('groups')
  @ApiCreatedResponse({ type: InvoiceGroupResponseDto })
  @ZodSerializerDto(InvoiceGroupResponseDto)
  createGroup(@CurrentUser() user: AuthUser, @Body() body: InvoiceGroupDto) {
    return this.invoices.saveGroup(user, body.name);
  }

  @Patch('groups/:id')
  @ApiOkResponse({ type: InvoiceGroupResponseDto })
  @ZodSerializerDto(InvoiceGroupResponseDto)
  renameGroup(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: InvoiceGroupDto,
  ) {
    return this.invoices.saveGroup(user, body.name, id);
  }

  @Delete('groups/:id')
  @HttpCode(204)
  deleteGroup(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoices.deleteGroup(user, id);
  }

  @Post('groups/move')
  @HttpCode(204)
  move(@CurrentUser() user: AuthUser, @Body() body: MoveInvoicesDto) {
    return this.invoices.moveInvoices(user, body.invoiceIds, body.groupId);
  }

  @Get(':id/pdf')
  @ApiOkResponse({
    content: {
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
    headers: {
      'Content-Disposition': {
        schema: { type: 'string' },
        description: 'Attachment filename containing the invoice reference',
      },
    },
  })
  @ApiExtraModels(InvoiceDocumentIncompleteDto, InvoiceLogoInvalidDto)
  @ApiUnprocessableEntityResponse({
    description:
      'Required billing sections are missing or the saved logo needs replacement.',
    schema: {
      oneOf: [InvoiceDocumentIncompleteDto, InvoiceLogoInvalidDto].map(
        (dto) => ({ $ref: getSchemaPath(dto) }),
      ),
    },
  })
  async pdf(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const result = await this.invoices.downloadPdf(user, id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.reference}.pdf"`,
    );
    response.send(result.bytes);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get invoice details' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ZodSerializerDto(InvoiceResponseDto)
  getInvoice(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoices.getInvoice(user, id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: UpdateInvoiceRequestDto })
  @ApiOperation({ summary: 'Update invoice (status, notes, title)' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ZodSerializerDto(InvoiceResponseDto)
  updateInvoice(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateInvoiceRequestDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoices.updateInvoice(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete invoice (Admin only)' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  deleteInvoice(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.invoices.deleteInvoice(user, id);
  }
}
