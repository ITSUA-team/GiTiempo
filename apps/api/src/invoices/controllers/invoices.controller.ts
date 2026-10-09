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
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { InvoiceListQueryDto } from '../dto/invoice-list-query.dto';
import { InvoiceListResponseDto } from '../dto/invoice-list-response.dto';
import { InvoiceResponseDto } from '../dto/invoice-response.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
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
  @ApiBody({ type: CreateInvoiceDto })
  @ApiOperation({ summary: 'Create invoice from time report data' })
  @ApiCreatedResponse({ type: InvoiceResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ApiConflictResponse({ description: 'Invalid status transition' })
  @ApiUnprocessableEntityResponse({
    description: 'No eligible billable time entries found',
  })
  @ZodSerializerDto(InvoiceResponseDto)
  createInvoice(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoices.createInvoice(user, body);
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
  @ApiBody({ type: UpdateInvoiceDto })
  @ApiOperation({ summary: 'Update invoice (status, notes, rates)' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiForbiddenResponse({ description: 'Admin or PM role required' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiConflictResponse({
    description:
      'Invalid status transition or rate change on non-draft invoice',
  })
  @ZodSerializerDto(InvoiceResponseDto)
  updateInvoice(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoices.updateInvoice(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete invoice (unlinks time entries)' })
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
