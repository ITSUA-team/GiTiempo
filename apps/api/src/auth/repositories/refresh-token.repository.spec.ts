import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RefreshTokenRepository } from './refresh-token.repository';

/**
 * Chainable Drizzle mock covering the four shapes this repo uses:
 *
 *   db.insert(t).values(v).returning()             -> Promise<row[]>
 *   db.select().from(t).where(w).limit(n)          -> Promise<row[]>
 *   db.update(t).set(v).where(w).returning()       -> Promise<row[]>
 *   db.update(t).set(v).where(w)                   -> Promise<void>
 *   db.delete(t).where(w)                          -> Promise<void>
 *   db.transaction(fn)                             -> invokes fn(tx)
 */
function makeDbMock(
  opts: {
    insertRows?: unknown[];
    selectRows?: unknown[];
    updateReturningRows?: unknown[];
  } = {},
) {
  const returning = vi.fn().mockResolvedValue(opts.insertRows ?? []);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn().mockReturnValue({ values });

  const limit = vi.fn().mockResolvedValue(opts.selectRows ?? []);
  const whereSelect = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where: whereSelect });
  const select = vi.fn().mockReturnValue({ from });

  const returningUpdate = vi
    .fn()
    .mockResolvedValue(opts.updateReturningRows ?? []);
  const whereUpdateReturning = vi
    .fn()
    .mockReturnValue({ returning: returningUpdate });
  const whereUpdate = vi.fn().mockResolvedValue(undefined);
  const setReturning = vi.fn().mockReturnValue({ where: whereUpdateReturning });
  const set = vi.fn().mockReturnValue({ where: whereUpdate });
  const update = vi.fn().mockReturnValue({ set });

  const whereDelete = vi.fn().mockResolvedValue(undefined);
  const deleteFn = vi.fn().mockReturnValue({ where: whereDelete });

  const txReturning = vi.fn().mockResolvedValue(opts.insertRows ?? []);
  const txValues = vi.fn().mockReturnValue({ returning: txReturning });
  const txInsert = vi.fn().mockReturnValue({ values: txValues });

  const txUpdateReturning = vi
    .fn()
    .mockResolvedValue(opts.updateReturningRows ?? []);
  const txWhereUpdate = vi
    .fn()
    .mockReturnValue({ returning: txUpdateReturning });
  const txSet = vi.fn().mockReturnValue({ where: txWhereUpdate });
  const txUpdate = vi.fn().mockReturnValue({ set: txSet });

  const transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      insert: txInsert,
      update: txUpdate,
      rollback: () => {},
    };
    return fn(tx);
  });

  return {
    insert,
    select,
    update,
    delete: deleteFn,
    transaction,
    _spies: {
      returning,
      values,
      limit,
      whereSelect,
      from,
      set,
      setReturning,
      whereUpdate,
      whereUpdateReturning,
      returningUpdate,
      whereDelete,
      txInsert,
      txValues,
      txReturning,
      txUpdate,
      txSet,
      txWhereUpdate,
      txUpdateReturning,
    },
  };
}

const sampleRow = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: '22222222-2222-2222-2222-222222222222',
  familyId: '33333333-3333-3333-3333-333333333333',
  tokenHash: 'a'.repeat(64),
  replacedBy: null,
  revokedAt: null,
  expiresAt: new Date('2026-02-01T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

describe('RefreshTokenRepository', () => {
  let repo: RefreshTokenRepository;
  let dbMock: ReturnType<typeof makeDbMock>;

  function build(opts: Parameters<typeof makeDbMock>[0] = {}) {
    dbMock = makeDbMock(opts);
    repo = new RefreshTokenRepository(
      dbMock as unknown as ConstructorParameters<
        typeof RefreshTokenRepository
      >[0],
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('inserts and returns the new row', async () => {
      build({ insertRows: [sampleRow] });
      const row = await repo.create({
        userId: sampleRow.userId,
        familyId: sampleRow.familyId,
        tokenHash: sampleRow.tokenHash,
        expiresAt: sampleRow.expiresAt,
      });
      expect(row).toEqual(sampleRow);
      expect(dbMock._spies.values).toHaveBeenCalledWith({
        userId: sampleRow.userId,
        familyId: sampleRow.familyId,
        tokenHash: sampleRow.tokenHash,
        expiresAt: sampleRow.expiresAt,
      });
    });

    it('throws if the insert returns no rows', async () => {
      build({ insertRows: [] });
      await expect(
        repo.create({
          userId: sampleRow.userId,
          familyId: sampleRow.familyId,
          tokenHash: sampleRow.tokenHash,
          expiresAt: sampleRow.expiresAt,
        }),
      ).rejects.toThrow(/Failed to insert/);
    });
  });

  describe('findActiveByHash', () => {
    it('returns the first matching row', async () => {
      build({ selectRows: [sampleRow] });
      const row = await repo.findActiveByHash(sampleRow.tokenHash);
      expect(row).toEqual(sampleRow);
      expect(dbMock.select).toHaveBeenCalled();
    });

    it('returns null when no rows match', async () => {
      build({ selectRows: [] });
      expect(await repo.findActiveByHash('missing')).toBeNull();
    });
  });

  describe('findByHashIncludingRevoked', () => {
    it('returns even revoked rows', async () => {
      const revoked = { ...sampleRow, revokedAt: new Date() };
      build({ selectRows: [revoked] });
      const row = await repo.findByHashIncludingRevoked(sampleRow.tokenHash);
      expect(row).toEqual(revoked);
    });
  });

  describe('markRevoked', () => {
    it('sets revokedAt and replacedBy', async () => {
      build();
      await repo.markRevoked('old-id', 'new-id');
      const setArg = dbMock._spies.set.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      expect(setArg.replacedBy).toBe('new-id');
      expect(setArg.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('deleteFamily', () => {
    it('issues a delete scoped to the family', async () => {
      build();
      await repo.deleteFamily('fam-1');
      expect(dbMock.delete).toHaveBeenCalled();
      expect(dbMock._spies.whereDelete).toHaveBeenCalled();
    });
  });

  describe('revokeFamily', () => {
    it('soft-revokes without deleting', async () => {
      build();
      await repo.revokeFamily('fam-1');
      expect(dbMock.update).toHaveBeenCalled();
      const setArg = dbMock._spies.set.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      expect(setArg.revokedAt).toBeInstanceOf(Date);
      expect(setArg).not.toHaveProperty('replacedBy');
    });
  });

  describe('deleteById', () => {
    it('deletes exactly one row', async () => {
      build();
      await repo.deleteById('row-1');
      expect(dbMock.delete).toHaveBeenCalled();
      expect(dbMock._spies.whereDelete).toHaveBeenCalled();
    });
  });

  describe('rotateIfActive', () => {
    const newRow = {
      id: 'new-rt-id',
      userId: sampleRow.userId,
      familyId: sampleRow.familyId,
      tokenHash: 'b'.repeat(64),
      replacedBy: null,
      revokedAt: null,
      expiresAt: new Date('2026-03-01T00:00:00Z'),
      createdAt: new Date('2026-02-01T00:00:00Z'),
    };

    it('inserts new row and revokes old row atomically', async () => {
      build({ insertRows: [newRow], updateReturningRows: [sampleRow] });
      const result = await repo.rotateIfActive(sampleRow.id, {
        userId: sampleRow.userId,
        familyId: sampleRow.familyId,
        tokenHash: newRow.tokenHash,
        expiresAt: newRow.expiresAt,
      });
      expect(result).toEqual({ newRow });
      expect(dbMock.transaction).toHaveBeenCalledOnce();
      expect(dbMock._spies.txValues).toHaveBeenCalledWith(
        expect.objectContaining({ tokenHash: newRow.tokenHash }),
      );
      expect(dbMock._spies.txSet).toHaveBeenCalledWith(
        expect.objectContaining({ replacedBy: newRow.id }),
      );
    });

    it('returns null when the old row is already revoked (race lost)', async () => {
      build({ insertRows: [newRow], updateReturningRows: [] });
      const result = await repo.rotateIfActive(sampleRow.id, {
        userId: sampleRow.userId,
        familyId: sampleRow.familyId,
        tokenHash: newRow.tokenHash,
        expiresAt: newRow.expiresAt,
      });
      expect(result).toBeNull();
    });

    it('returns null when insert returns no rows', async () => {
      build({ insertRows: [], updateReturningRows: [sampleRow] });
      const result = await repo.rotateIfActive(sampleRow.id, {
        userId: sampleRow.userId,
        familyId: sampleRow.familyId,
        tokenHash: newRow.tokenHash,
        expiresAt: newRow.expiresAt,
      });
      expect(result).toBeNull();
    });
  });
});
