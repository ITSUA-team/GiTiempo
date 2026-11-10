import { createZodDto } from './../../common/zod-dto.js';
import { invoiceStatsResponseSchema } from '@gitiempo/shared';

export class InvoiceStatsResponseDto extends createZodDto(
  invoiceStatsResponseSchema,
) {}
