import { createZodDto } from 'nestjs-zod';
import { invoiceListResponseSchema } from '@gitiempo/shared';

export class InvoiceListResponseDto extends createZodDto(
  invoiceListResponseSchema,
) {}
