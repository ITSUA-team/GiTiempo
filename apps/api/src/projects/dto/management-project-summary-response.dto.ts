import { createZodDto } from './../../common/zod-dto.js';
import { managementProjectSummaryResponseSchema } from '@gitiempo/shared';

export class ManagementProjectSummaryResponseDto extends createZodDto(
  managementProjectSummaryResponseSchema,
) {}
