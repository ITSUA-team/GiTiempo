import { createZodDto } from 'nestjs-zod';
import {
  previewInvoiceSchema,
  createInvoiceGroupSchema,
  moveInvoicesSchema,
} from '@gitiempo/shared';
export class PreviewInvoiceDto extends createZodDto(previewInvoiceSchema) {}
export class InvoiceGroupDto extends createZodDto(createInvoiceGroupSchema) {}
export class MoveInvoicesDto extends createZodDto(moveInvoicesSchema) {}
