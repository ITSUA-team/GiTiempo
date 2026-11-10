import { trackingCapabilityResponseSchema } from '@gitiempo/shared';
import { createZodDto } from './../../common/zod-dto.js';

export class TrackingCapabilityResponseDto extends createZodDto(
  trackingCapabilityResponseSchema,
) {}
