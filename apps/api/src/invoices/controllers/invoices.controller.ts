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
  ApiBody,
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
import { CreateInvoiceRequestDto } from '../dto/create-invoice-request.dto';
import { EligibleEntriesQueryDto } from '../dto/eligible-entries-query.dto';
import { EligibleEntriesResponseDto } from '../dto/eligible-entries-response.dto';
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
