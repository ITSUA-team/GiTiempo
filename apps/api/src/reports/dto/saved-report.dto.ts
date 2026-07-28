import { createZodDto } from 'nestjs-zod';
import {
  createSavedReportSchema,
  savedReportListResponseSchema,
  savedReportSchema,
  updateSavedReportSchema,
} from '@gitiempo/shared';

export class CreateSavedReportDto extends createZodDto(
  createSavedReportSchema,
) {}

export class UpdateSavedReportDto extends createZodDto(
  updateSavedReportSchema,
) {}

export class SavedReportResponseDto extends createZodDto(savedReportSchema) {}

export class SavedReportListResponseDto extends createZodDto(
  savedReportListResponseSchema,
) {}
