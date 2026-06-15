import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import { THROTTLE_ERROR_CODE_METADATA } from '../decorators/throttle-error-code.decorator';

export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const code = this.reflector.getAllAndOverride<string | undefined>(
      THROTTLE_ERROR_CODE_METADATA,
      [context.getHandler(), context.getClass()],
    );

    throw new HttpException(
      {
        error: 'TooManyRequests',
        message: await this.getErrorMessage(context, throttlerLimitDetail),
        ...(code ? { code } : {}),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
