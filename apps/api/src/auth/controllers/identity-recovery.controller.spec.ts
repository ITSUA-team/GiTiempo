import 'reflect-metadata';
import {
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IdentityRecoveryController } from './identity-recovery.controller';
import { PlatformOperatorGuard } from '../guards/platform-operator.guard';
import { AuthService } from '../services/auth.service';
import type { AuthUser } from '../types/auth-user';

const RESERVATION_ID = '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f';

const agedReservation = {
  id: RESERVATION_ID,
  normalizedEmail: 'aged@example.com',
  firebaseUid: 'firebase-aged-1',
  purpose: 'registration' as const,
  state: 'reserved' as const,
  createdAt: new Date('2026-11-08T00:00:00.000Z'),
  registrationDisplayName: 'Aged Owner',
  registrationWorkspaceName: 'Acme Studio',
};

const ASSESS_CONTRACT_KEYS = [
  'createdAt',
  'firebaseUid',
  'normalizedEmail',
  'purpose',
  'registrationDisplayName',
  'registrationWorkspaceName',
  'reservationId',
  'state',
];

const operator: AuthUser = {
  sub: 'operator-1',
  email: 'operator@example.com',
  firebaseUid: 'firebase-operator-1',
  workspaceId: 'workspace-1',
  role: 'admin',
};

const nonOperator: AuthUser = { ...operator, sub: 'regular-1' };

function createContext(user?: AuthUser): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('IdentityRecoveryController', () => {
  let controller: IdentityRecoveryController;
  let guard: PlatformOperatorGuard;
  const authService = {
    listAgedUnboundRegistrationReservations: vi.fn(),
    reportAgedUnboundRegistrationReservations: vi.fn(),
    resolveConclusivelyAbandonedRegistration: vi.fn(),
  };
  const configService = {
    get: vi.fn().mockReturnValue(['operator-1']),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentityRecoveryController],
      providers: [
        { provide: AuthService, useValue: authService },
        PlatformOperatorGuard,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    controller = module.get(IdentityRecoveryController);
    guard = module.get(PlatformOperatorGuard);
  });

  describe('assess', () => {
    it('delegates to the aged-reservation query and maps rows to the redacted contract', async () => {
      authService.listAgedUnboundRegistrationReservations.mockResolvedValue([
        agedReservation,
      ]);

      const result = await controller.assess();

      expect(result).toEqual([
        {
          reservationId: RESERVATION_ID,
          normalizedEmail: 'aged@example.com',
          firebaseUid: 'firebase-aged-1',
          purpose: 'registration',
          state: 'reserved',
          registrationDisplayName: 'Aged Owner',
          registrationWorkspaceName: 'Acme Studio',
          createdAt: '2026-11-08T00:00:00.000Z',
        },
      ]);
      expect(Object.keys(result[0]).sort()).toEqual(ASSESS_CONTRACT_KEYS);
      expect(
        authService.listAgedUnboundRegistrationReservations,
      ).toHaveBeenCalledTimes(1);
      expect(
        authService.resolveConclusivelyAbandonedRegistration,
      ).not.toHaveBeenCalled();
      expect(
        authService.reportAgedUnboundRegistrationReservations,
      ).toHaveBeenCalledWith([agedReservation]);
    });

    it('keeps null registration names null', async () => {
      authService.listAgedUnboundRegistrationReservations.mockResolvedValue([
        { ...agedReservation, registrationDisplayName: null },
      ]);

      const result = await controller.assess();

      expect(result[0].registrationDisplayName).toBeNull();
      expect(result[0].registrationWorkspaceName).toBe('Acme Studio');
    });

    it('responds with 200 on the assess route', () => {
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, controller.assess)).toBe(
        200,
      );
    });
  });

  describe('resolve', () => {
    it('passes the authenticated subject as operatorIdentity to the service', async () => {
      authService.resolveConclusivelyAbandonedRegistration.mockResolvedValue(
        undefined,
      );

      await expect(
        controller.resolve('operator-1', {
          reservationId: RESERVATION_ID,
          operatorDecision: 'Firebase UID confirmed absent',
        } as never),
      ).resolves.toBeUndefined();

      expect(
        authService.resolveConclusivelyAbandonedRegistration,
      ).toHaveBeenCalledWith({
        reservationId: RESERVATION_ID,
        operatorDecision: 'Firebase UID confirmed absent',
        operatorIdentity: 'operator-1',
      });
    });

    it('passes through the conflict failure of an unresolvable reservation', async () => {
      const conflict = new ConflictException('Reservation is not resolvable');
      authService.resolveConclusivelyAbandonedRegistration.mockRejectedValue(
        conflict,
      );

      await expect(
        controller.resolve('operator-1', {
          reservationId: RESERVATION_ID,
        } as never),
      ).rejects.toThrow(conflict);
    });

    it('passes through the uncertain-outcome service unavailable failure', async () => {
      const unavailable = new ServiceUnavailableException(
        'Outcome is uncertain',
      );
      authService.resolveConclusivelyAbandonedRegistration.mockRejectedValue(
        unavailable,
      );

      await expect(
        controller.resolve('operator-1', {
          reservationId: RESERVATION_ID,
        } as never),
      ).rejects.toThrow(unavailable);
    });

    it('responds with 204 on the resolve route', () => {
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, controller.resolve)).toBe(
        204,
      );
    });
  });

  describe('platform-operator guard', () => {
    it('allows an operator sub through', () => {
      expect(guard.canActivate(createContext(operator))).toBe(true);
    });

    it('rejects a non-operator sub with 403', () => {
      try {
        guard.canActivate(createContext(nonOperator));
        expect.fail('expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).getStatus()).toBe(403);
      }
    });

    it('rejects a missing user with 401', () => {
      try {
        guard.canActivate(createContext(undefined));
        expect.fail('expected UnauthorizedException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).getStatus()).toBe(401);
      }
    });
  });
});
