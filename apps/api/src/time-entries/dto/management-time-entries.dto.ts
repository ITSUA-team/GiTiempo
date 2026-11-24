import {
  createManagedTimeEntrySchema,
  managedTimeEntryConflictSchema,
  managementProjectsQuerySchema,
  managementProjectsResponseSchema,
  managementTimeEntriesQuerySchema,
  managementTimeEntryMembersQuerySchema,
  managementTimeEntryMembersResponseSchema,
  managementTimeEntryTasksQuerySchema,
  managementTimeEntryTasksResponseSchema,
  updateManagedTimeEntrySchema,
} from '@gitiempo/shared';
import { createZodDto } from '../../common/zod-dto';

export class ManagementProjectsQueryDto extends createZodDto(
  managementProjectsQuerySchema,
) {}
export class ManagementProjectsResponseDto extends createZodDto(
  managementProjectsResponseSchema,
) {}
export class ManagementTimeEntryMembersQueryDto extends createZodDto(
  managementTimeEntryMembersQuerySchema,
) {}
export class ManagementTimeEntryMembersResponseDto extends createZodDto(
  managementTimeEntryMembersResponseSchema,
) {}
export class ManagementTimeEntryTasksQueryDto extends createZodDto(
  managementTimeEntryTasksQuerySchema,
) {}
export class ManagementTimeEntryTasksResponseDto extends createZodDto(
  managementTimeEntryTasksResponseSchema,
) {}
export class ManagementTimeEntriesQueryDto extends createZodDto(
  managementTimeEntriesQuerySchema,
) {}
export class CreateManagedTimeEntryDto extends createZodDto(
  createManagedTimeEntrySchema,
) {}
export class UpdateManagedTimeEntryDto extends createZodDto(
  updateManagedTimeEntrySchema,
) {}
export class ManagedTimeEntryConflictDto extends createZodDto(
  managedTimeEntryConflictSchema,
) {}
