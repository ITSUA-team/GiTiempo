import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  jiraAuthUrlResponseSchema,
  jiraConnectionStatusResponseSchema,
} from '@gitiempo/shared';

export class JiraConnectionStatusResponseDto extends createZodDto(
  jiraConnectionStatusResponseSchema as unknown as z.ZodObject<z.ZodRawShape>,
) {}

export class JiraAuthUrlResponseDto extends createZodDto(
  jiraAuthUrlResponseSchema,
) {}
