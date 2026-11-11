import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../../config/env.validation';
import { PlatformOperatorGuard } from './platform-operator.guard';
import type { AuthUser } from '../types/auth-user';

const operator: AuthUser = {
  sub: 'operator-1',
  email: 'operator@example.com',
  firebaseUid: 'firebase-operator-1',
  workspaceId: 'workspace-1',
  role: 'admin',
};

function createContext(user?: AuthUser): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function createGuard(operatorIds: string[]) {
  const config = {
    get: vi.fn().mockReturnValue(operatorIds),
  } as unknown as ConfigService<Env, true>;
  const guard = new PlatformOperatorGuard(config);
  return { guard, configGet: vi.mocked(config.get) };
}

describe('PlatformOperatorGuard', () => {
  it('allows an authenticated subject on the operator allowlist', () => {
    const { guard, configGet } = createGuard(['operator-1']);

    expect(guard.canActivate(createContext(operator))).toBe(true);
    expect(configGet).toHaveBeenCalledWith('PLATFORM_OPERATOR_USER_IDS', {
      infer: true,
    });
  });

  it('rejects an authenticated subject outside the allowlist with 403', () => {
    const { guard } = createGuard(['other-operator']);

    try {
      guard.canActivate(createContext(operator));
      expect.fail('expected ForbiddenException');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getStatus()).toBe(403);
    }
  });

  it('rejects every authenticated subject when the allowlist is empty', () => {
    const { guard } = createGuard([]);

    expect(() => guard.canActivate(createContext(operator))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects an unauthenticated request with 401', () => {
    const { guard } = createGuard(['operator-1']);

    try {
      guard.canActivate(createContext(undefined));
      expect.fail('expected UnauthorizedException');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getStatus()).toBe(401);
    }
  });
});
