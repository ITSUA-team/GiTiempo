import { createZodDto } from 'nestjs-zod';
import { invoiceDefaultsResponseSchema } from '@gitiempo/shared';

export class InvoiceDefaultsResponseDto extends createZodDto(
  invoiceDefaultsResponseSchema,
) {}
