import { SetMetadata } from '@nestjs/common';

export const THROTTLE_ERROR_CODE_METADATA = 'throttle:error-code';

export function ThrottleErrorCode(code: string) {
  return SetMetadata(THROTTLE_ERROR_CODE_METADATA, code);
}
