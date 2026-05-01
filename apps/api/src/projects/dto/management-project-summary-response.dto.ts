import { createZodDto } from 'nestjs-zod';
import { managementProjectSummaryResponseSchema } from '@gitiempo/shared';

export class ManagementProjectSummaryResponseDto extends createZodDto(
  managementProjectSummaryResponseSchema,
) {}
