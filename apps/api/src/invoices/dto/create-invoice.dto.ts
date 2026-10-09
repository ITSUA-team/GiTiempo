import { createZodDto } from 'nestjs-zod';
import { createInvoiceSchema } from '@gitiempo/shared';

export class CreateInvoiceDto extends createZodDto(createInvoiceSchema) {}
