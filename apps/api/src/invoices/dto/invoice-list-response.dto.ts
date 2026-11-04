import { createZodDto } from './../../common/zod-dto.js';
import { invoiceListResponseSchema } from '@gitiempo/shared';

export class InvoiceListResponseDto extends createZodDto(
  invoiceListResponseSchema,
) {}
