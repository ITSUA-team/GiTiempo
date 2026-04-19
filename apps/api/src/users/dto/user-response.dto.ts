import { createZodDto } from 'nestjs-zod';
import { userResponseSchema } from '@gitiempo/shared';

/**
 * Public user representation returned by the API.
 *
 * Generated from the shared Zod contract so that the frontend and
 * backend cannot drift. `firebaseUid` is intentionally omitted.
 */
export class UserResponseDto extends createZodDto(userResponseSchema) {}
