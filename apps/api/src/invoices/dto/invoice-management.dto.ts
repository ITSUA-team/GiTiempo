import { createZodDto } from '../../common/zod-dto';
import {
  previewInvoiceSchema,
  previewInvoiceResponseSchema,
  invoiceGroupSchema,
  invoiceGroupsResponseSchema,
  invoiceDocumentIncompleteErrorSchema,
  invoiceLogoInvalidErrorSchema,
  createInvoiceGroupSchema,
  moveInvoicesSchema,
} from '@gitiempo/shared';
export class PreviewInvoiceDto extends createZodDto(previewInvoiceSchema) {}
export class InvoiceGroupDto extends createZodDto(createInvoiceGroupSchema) {}
export class MoveInvoicesDto extends createZodDto(moveInvoicesSchema) {}
export class PreviewInvoiceResponseDto extends createZodDto(
  previewInvoiceResponseSchema,
) {}
export class InvoiceGroupResponseDto extends createZodDto(invoiceGroupSchema) {}
export class InvoiceGroupsResponseDto extends createZodDto(
  invoiceGroupsResponseSchema,
) {}
export class InvoiceDocumentIncompleteDto extends createZodDto(
  invoiceDocumentIncompleteErrorSchema,
) {}
export class InvoiceLogoInvalidDto extends createZodDto(
  invoiceLogoInvalidErrorSchema,
) {}
