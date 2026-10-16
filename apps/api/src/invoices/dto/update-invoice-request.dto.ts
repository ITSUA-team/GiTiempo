import { createZodDto } from 'nestjs-zod';
import { updateInvoiceSchema } from '@gitiempo/shared';

export class UpdateInvoiceRequestDto extends createZodDto(
  updateInvoiceSchema,
) {}
