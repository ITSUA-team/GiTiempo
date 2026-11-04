import { createZodDto } from './../../common/zod-dto.js';
import { invoiceListQuerySchema } from '@gitiempo/shared';

export class InvoiceListQueryDto extends createZodDto(invoiceListQuerySchema) {}
