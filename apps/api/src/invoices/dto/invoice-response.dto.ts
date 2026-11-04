import { createZodDto } from './../../common/zod-dto.js';
import { invoiceResponseSchema } from '@gitiempo/shared';

export class InvoiceResponseDto extends createZodDto(invoiceResponseSchema) {}
