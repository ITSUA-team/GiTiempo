import { createZodDto } from 'nestjs-zod';
import { createInvoiceSchema } from '@gitiempo/shared';

export class CreateInvoiceRequestDto extends createZodDto(
  createInvoiceSchema,
) {}
