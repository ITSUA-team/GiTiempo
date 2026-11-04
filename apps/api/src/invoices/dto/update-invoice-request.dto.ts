import { createZodDto } from './../../common/zod-dto.js';
import { updateInvoiceSchema } from '@gitiempo/shared';

export class UpdateInvoiceRequestDto extends createZodDto(
  updateInvoiceSchema,
) {}
