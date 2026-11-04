import { createZodDto } from './../../common/zod-dto.js';
import { createInvoiceSchema } from '@gitiempo/shared';

export class CreateInvoiceRequestDto extends createZodDto(
  createInvoiceSchema,
) {}
