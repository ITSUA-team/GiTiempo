import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from './users.service';
import { DRIZZLE } from '../../db/db.constants';

/**
 * Helper that builds a chainable Drizzle mock covering the two query
 * shapes used by the service:
 *
 *   db.select().from(...).where(...).limit(...)           -> Promise<row[]>
 *   db.update(...).set(...).where(...).returning()        -> Promise<row[]>
 *   db.insert(...).values(...).onConflictDoUpdate(...)
 *     .returning()                                        -> Promise<row[]>
 */
function makeDbMock(opts: {
  selectRows?: unknown[];
  updateRows?: unknown[];
  insertRows?: unknown[];
}) {
  const limit = vi.fn().mockResolvedValue(opts.selectRows ?? []);
  const whereSelect = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where: whereSelect });
  const select = vi.fn().mockReturnValue({ from });

  const returningUpdate = vi.fn().mockResolvedValue(opts.updateRows ?? []);
  const whereUpdate = vi.fn().mockReturnValue({ returning: returningUpdate });
  const set = vi.fn().mockReturnValue({ where: whereUpdate });
  const update = vi.fn().mockReturnValue({ set });

  const returningInsert = vi.fn().mockResolvedValue(opts.insertRows ?? []);
  const onConflictDoUpdate = vi
    .fn()
    .mockReturnValue({ returning: returningInsert });
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  const insert = vi.fn().mockReturnValue({ values });

  return {
    select,
    update,
    insert,
    _spies: {
      limit,
      whereSelect,
      from,
      returningUpdate,
      whereUpdate,
      set,
      onConflictDoUpdate,
      values,
      returningInsert,
    },
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
    selectRows?: unknown[];
    updateRows?: unknown[];
    insertRows?: unknown[];
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

  describe('findById', () => {
    it('returns the user without firebaseUid when found', async () => {
      await build({ selectRows: [sampleRow] });

      const result = await service.findById(sampleRow.id);

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

    it('throws Unauthorized when the subject user no longer exists', async () => {
      await build({ selectRows: [] });

      await expect(service.findById(sampleRow.id)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('findRowById', () => {
    it('returns the raw row when present', async () => {
      await build({ selectRows: [sampleRow] });
      const row = await service.findRowById(sampleRow.id);
      expect(row).toBe(sampleRow);
    });

    it('returns null when missing', async () => {
      await build({ selectRows: [] });
      const row = await service.findRowById(sampleRow.id);
      expect(row).toBeNull();
    });
  });

  describe('updateById', () => {
    it('updates only the provided fields and returns the new shape', async () => {
      const updated = {
        ...sampleRow,
        displayName: 'Renamed',
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      };
      await build({ updateRows: [updated] });

      const result = await service.updateById(sampleRow.id, {
        displayName: 'Renamed',
      });

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

    it('throws NotFound when no row was updated', async () => {
      await build({ updateRows: [] });
      await expect(
        service.updateById(sampleRow.id, { displayName: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('upsertFromFirebase', () => {
    it('returns the upserted row', async () => {
      await build({ insertRows: [sampleRow] });

      const row = await service.upsertFromFirebase({
        firebaseUid: sampleRow.firebaseUid,
        email: sampleRow.email,
        displayName: sampleRow.displayName,
        avatarUrl: sampleRow.avatarUrl,
      });

      expect(row).toBe(sampleRow);
      expect(dbMock._spies.values).toHaveBeenCalledWith(
        expect.objectContaining({
          firebaseUid: sampleRow.firebaseUid,
          email: sampleRow.email,
        }),
      );
      expect(dbMock._spies.onConflictDoUpdate).toHaveBeenCalled();
    });

    it('throws when the insert returned no rows', async () => {
      await build({ insertRows: [] });

      await expect(
        service.upsertFromFirebase({
          firebaseUid: 'x',
          email: 'x@example.com',
        }),
      ).rejects.toThrow(/Failed to upsert user/);
    });
  });
});
