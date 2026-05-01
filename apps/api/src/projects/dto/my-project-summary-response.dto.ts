import { createZodDto } from 'nestjs-zod';
import { myProjectSummaryResponseSchema } from '@gitiempo/shared';

export class MyProjectSummaryResponseDto extends createZodDto(
  myProjectSummaryResponseSchema,
) {}
