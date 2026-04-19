import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from './users.service';
import { DRIZZLE } from '../../db/db.constants';

/**
 * Helper that builds a chainable Drizzle mock.
 *
 * The service uses two query shapes:
 *   db.select().from(...).orderBy(...).limit(...)        -> Promise<row[]>
 *   db.update(...).set(...).where(...).returning()       -> Promise<row[]>
 *
 * `selectRows` and `updateRows` control what each chain resolves to.
 */
function makeDbMock(opts: { selectRows: unknown[]; updateRows?: unknown[] }) {
  const limit = vi.fn().mockResolvedValue(opts.selectRows);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ orderBy });
  const select = vi.fn().mockReturnValue({ from });

  const returning = vi.fn().mockResolvedValue(opts.updateRows ?? []);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });

  return {
    select,
    update,
    _spies: { limit, orderBy, from, returning, where, set },
  };
}

const sampleRow = {
  id: '11111111-1111-1111-1111-111111111111',
  firebaseUid: 'seed-user-1',
  email: 'alice@gitiempo.dev',
  displayName: 'Alice',
  avatarUrl: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('UsersService', () => {
  let service: UsersService;
  let dbMock: ReturnType<typeof makeDbMock>;

  async function build(opts: {
    selectRows: unknown[];
    updateRows?: unknown[];
  }) {
    dbMock = makeDbMock(opts);
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: DRIZZLE, useValue: dbMock }],
    }).compile();
    service = module.get(UsersService);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findCurrent', () => {
    it('returns the first user (by email asc) without firebaseUid', async () => {
      await build({ selectRows: [sampleRow] });

      const result = await service.findCurrent();

      expect(result).toEqual({
        id: sampleRow.id,
        email: sampleRow.email,
        displayName: sampleRow.displayName,
        avatarUrl: sampleRow.avatarUrl,
        createdAt: sampleRow.createdAt.toISOString(),
        updatedAt: sampleRow.updatedAt.toISOString(),
      });
      expect(result).not.toHaveProperty('firebaseUid');
      expect(dbMock.select).toHaveBeenCalled();
    });

    it('throws NotFound when there are no users', async () => {
      await build({ selectRows: [] });

      await expect(service.findCurrent()).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateCurrent', () => {
    it('updates only the provided fields and returns the new shape', async () => {
      const updated = {
        ...sampleRow,
        displayName: 'Renamed',
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      };
      await build({ selectRows: [sampleRow], updateRows: [updated] });

      const result = await service.updateCurrent({ displayName: 'Renamed' });

      expect(dbMock._spies.set).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'Renamed' }),
      );
      // avatarUrl was NOT in the input → should not be in the set payload.
      const setArg = dbMock._spies.set.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(setArg).not.toHaveProperty('avatarUrl');

      expect(result.displayName).toBe('Renamed');
      expect(result).not.toHaveProperty('firebaseUid');
    });
  });
});
