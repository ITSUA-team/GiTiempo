import { createZodDto } from 'nestjs-zod';
import { invoiceListQuerySchema } from '@gitiempo/shared';

export class InvoiceListQueryDto extends createZodDto(invoiceListQuerySchema) {}
