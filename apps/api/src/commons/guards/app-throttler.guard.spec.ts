import { HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type {
  ThrottlerLimitDetail,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { describe, expect, it, vi } from 'vitest';
import { THROTTLE_ERROR_CODE_METADATA } from '../decorators/throttle-error-code.decorator';
import { AppThrottlerGuard } from './app-throttler.guard';

function createGuard(
  code?: string,
  message = 'Too many requests. Please try again later.',
) {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(code),
  } as unknown as Reflector;
  const guard = new AppThrottlerGuard(
    { throttlers: [{ limit: 10, ttl: 60_000 }] } as ThrottlerModuleOptions,
    {} as ThrottlerStorage,
    reflector,
  ) as AppThrottlerGuard & {
    throwThrottlingException(
      context: unknown,
      throttlerLimitDetail: ThrottlerLimitDetail,
    ): Promise<void>;
    getErrorMessage: (
      context: unknown,
      throttlerLimitDetail: ThrottlerLimitDetail,
    ) => Promise<string>;
  };

  vi.spyOn(guard, 'getErrorMessage').mockResolvedValue(message);

  return { guard, reflector };
}

function createContext() {
  return {
    getClass: vi.fn(),
    getHandler: vi.fn(),
  };
}

function createLimitDetail(key: string, limit: number): ThrottlerLimitDetail {
  return {
    key,
    limit,
    ttl: 60_000,
    totalHits: limit + 1,
    timeToExpire: 60_000,
    isBlocked: true,
    timeToBlockExpire: 60_000,
    tracker: '127.0.0.1',
  };
}

describe('AppThrottlerGuard', () => {
  it('returns the normalized 429 envelope without a code by default', async () => {
    const { guard, reflector } = createGuard();
    const context = createContext();

    try {
      await guard.throwThrottlingException(
        context as any,
        createLimitDetail('login', 10) as any,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect((error as HttpException).getResponse()).toEqual({
        error: 'TooManyRequests',
        message: 'Too many requests. Please try again later.',
      });
    }

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      THROTTLE_ERROR_CODE_METADATA,
      [context.getHandler(), context.getClass()],
    );
  });

  it('adds the route-specific throttle code when metadata is present', async () => {
    const { guard } = createGuard('rate_limited');

    try {
      await guard.throwThrottlingException(
        createContext() as any,
        createLimitDetail('register', 5) as any,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect((error as HttpException).getResponse()).toEqual({
        code: 'rate_limited',
        error: 'TooManyRequests',
        message: 'Too many requests. Please try again later.',
      });
    }
  });
});
