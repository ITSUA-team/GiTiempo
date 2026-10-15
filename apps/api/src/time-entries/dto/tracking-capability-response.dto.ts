import { trackingCapabilityResponseSchema } from '@gitiempo/shared';
import { createZodDto } from 'nestjs-zod';

export class TrackingCapabilityResponseDto extends createZodDto(
  trackingCapabilityResponseSchema,
) {}
