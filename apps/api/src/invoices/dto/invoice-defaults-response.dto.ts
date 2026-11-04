import { createZodDto } from './../../common/zod-dto.js';
import { invoiceDefaultsResponseSchema } from '@gitiempo/shared';

export class InvoiceDefaultsResponseDto extends createZodDto(
  invoiceDefaultsResponseSchema,
) {}
