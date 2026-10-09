import { createZodDto } from 'nestjs-zod';
import { invoiceResponseSchema } from '@gitiempo/shared';

export class InvoiceResponseDto extends createZodDto(invoiceResponseSchema) {}
