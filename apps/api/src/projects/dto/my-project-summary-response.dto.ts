import { createZodDto } from './../../common/zod-dto.js';
import { myProjectSummaryResponseSchema } from '@gitiempo/shared';

export class MyProjectSummaryResponseDto extends createZodDto(
  myProjectSummaryResponseSchema,
) {}
