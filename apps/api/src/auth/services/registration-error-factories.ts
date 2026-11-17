import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { REGISTRATION_ERROR_MESSAGES } from '../registration-errors';

export function createRegistrationBadRequest(
  code: 'invalid_workspace_name' | 'weak_password',
): BadRequestException {
  return new BadRequestException({
    code,
    error: 'BadRequest',
    message: REGISTRATION_ERROR_MESSAGES[code],
  });
}

export function createRegistrationConflict(
  code: 'duplicate_email',
): ConflictException {
  return new ConflictException({
    code,
    error: 'Conflict',
    message: REGISTRATION_ERROR_MESSAGES[code],
  });
}

export function createRegistrationUnavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: 'registration_service_unavailable',
    error: 'ServiceUnavailable',
    message: REGISTRATION_ERROR_MESSAGES.registration_service_unavailable,
  });
}

export function createIdentityProofRequired(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'identity_proof_required',
    error: 'Unauthorized',
    message: 'Authenticate with the identity already linked to this account.',
  });
}
