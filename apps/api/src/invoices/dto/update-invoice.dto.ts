import { createZodDto } from 'nestjs-zod';
import { updateInvoiceSchema } from '@gitiempo/shared';

export class UpdateInvoiceDto extends createZodDto(updateInvoiceSchema) {}
