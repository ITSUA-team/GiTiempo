import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { registerRequestSchema, type RegisterRequest } from '@gitiempo/shared';
import * as z from 'zod';

const REGISTER_VALIDATION_MESSAGES = {
  invalid_workspace_name: 'Enter a valid workspace name.',
  weak_password: 'Choose a stronger password and try again.',
} as const;

type RegisterValidationCode = keyof typeof REGISTER_VALIDATION_MESSAGES;

function getRegisterValidationCode(
  issues: z.core.$ZodIssue[],
): RegisterValidationCode | null {
  const issuePaths = issues.map((issue) => issue.path[0]);

  if (
    issuePaths.length > 0 &&
    issuePaths.every((path) => path === 'password')
  ) {
    return 'weak_password';
  }

  if (
    issuePaths.length > 0 &&
    issuePaths.every((path) => path === 'workspaceName')
  ) {
    return 'invalid_workspace_name';
  }

  return null;
}

@Injectable()
export class RegisterBodyPipe implements PipeTransform<
  unknown,
  RegisterRequest
> {
  transform(value: unknown): RegisterRequest {
    try {
      return registerRequestSchema.parse(value);
    } catch (error) {
      if (!(error instanceof z.ZodError)) {
        throw error;
      }

      const code = getRegisterValidationCode(error.issues);

      throw new BadRequestException({
        ...(code ? { code } : {}),
        details: error.issues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          path: issue.path,
        })),
        error: 'BadRequest',
        message: code
          ? REGISTER_VALIDATION_MESSAGES[code]
          : 'Validation failed',
      });
    }
  }
}
