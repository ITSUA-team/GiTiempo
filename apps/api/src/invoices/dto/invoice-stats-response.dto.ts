import { createZodDto } from 'nestjs-zod';
import { invoiceStatsResponseSchema } from '@gitiempo/shared';

export class InvoiceStatsResponseDto extends createZodDto(
  invoiceStatsResponseSchema,
) {}