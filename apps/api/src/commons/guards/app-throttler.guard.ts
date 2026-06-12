import { HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import { THROTTLE_ERROR_CODE_METADATA } from '../decorators/throttle-error-code.decorator';

export class AppThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected override async throwThrottlingException(
    context: Parameters<ThrottlerGuard['throwThrottlingException']>[0],
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const code = this.reflector.getAllAndOverride<string | undefined>(
      THROTTLE_ERROR_CODE_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!code) {
      await super.throwThrottlingException(context, throttlerLimitDetail);
      return;
    }

    throw new HttpException(
      {
        code,
        error: 'TooManyRequests',
        message: await this.getErrorMessage(context, throttlerLimitDetail),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
