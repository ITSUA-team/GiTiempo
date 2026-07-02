import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from './users.service';
import { DRIZZLE } from '../../db/db.constants';
import { MembersService } from '../../members/services/members.service';

type UserRowMock = typeof sampleRow;

function hasQueryChunks(value: unknown): value is { queryChunks: unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'queryChunks' in value &&
    Array.isArray((value as { queryChunks?: unknown }).queryChunks)
  );
}

function isStringChunk(chunk: unknown): boolean {
  return (
    typeof chunk === 'object' &&
    chunk !== null &&
    chunk.constructor.name === 'StringChunk'
  );
}

function evaluateSqlChunk(chunk: unknown, currentRow: UserRowMock): unknown {
  if (typeof chunk !== 'object' || chunk === null) return chunk;
  const columnName = (chunk as { name?: unknown }).name;

  if (columnName === 'display_name') return currentRow.displayName;
  if (columnName === 'avatar_url') return currentRow.avatarUrl;

  return undefined;
}

function evaluateSetValue(value: unknown, currentRow: UserRowMock): unknown {
  if (!hasQueryChunks(value)) return value;

  for (const chunk of value.queryChunks) {
    if (isStringChunk(chunk)) continue;
    const candidate = evaluateSqlChunk(chunk, currentRow);

    if (candidate !== null && candidate !== undefined) return candidate;
  }

  return null;
}

function applySet(
  row: UserRowMock,
  setArg: Record<string, unknown>,
): UserRowMock {
  const nextRow = { ...row };

  for (const [key, value] of Object.entries(setArg)) {
    nextRow[key as keyof UserRowMock] = evaluateSetValue(value, row) as never;
  }

  return nextRow;
}

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
  let updateSetArg: Record<string, unknown> = {};
  let conflictSetArg: Record<string, unknown> | null = null;
  const limit = vi.fn().mockResolvedValue(opts.selectRows ?? []);
  const whereSelect = vi.fn().mockReturnValue({ limit });
  const innerJoin = vi.fn().mockReturnValue({ where: whereSelect });
  const from = vi.fn().mockReturnValue({ where: whereSelect, innerJoin });
  const select = vi.fn().mockReturnValue({ from });

  const returningUpdate = vi.fn(async () =>
    (opts.updateRows ?? []).map((row) =>
      applySet(row as UserRowMock, updateSetArg),
    ),
  );
  const whereUpdate = vi.fn().mockReturnValue({ returning: returningUpdate });
  const set = vi.fn((input: Record<string, unknown>) => {
    updateSetArg = input;

    return { where: whereUpdate };
  });
  const update = vi.fn().mockReturnValue({ set });

  const returningInsert = vi.fn(async () =>
    (opts.insertRows ?? []).map((row) =>
      conflictSetArg
        ? applySet(row as UserRowMock, conflictSetArg)
        : (row as UserRowMock),
    ),
  );
  const onConflictDoUpdate = vi.fn(
    (input: { set: Record<string, unknown> }) => {
      conflictSetArg = input.set;

      return { returning: returningInsert };
    },
  );
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
      innerJoin,
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

const workspaceId = '22222222-2222-2222-2222-222222222222';
const sampleRole = 'admin' as const;

describe('UsersService', () => {
  let service: UsersService;
  let dbMock: ReturnType<typeof makeDbMock>;
  let membersService: {
    listMembershipsForUser: ReturnType<typeof vi.fn>;
  };

  async function build(opts: {
    selectRows?: unknown[];
    updateRows?: unknown[];
    insertRows?: unknown[];
  }) {
    dbMock = makeDbMock(opts);
    membersService = {
      listMembershipsForUser: vi.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DRIZZLE, useValue: dbMock },
        { provide: MembersService, useValue: membersService },
      ],
    }).compile();
    service = module.get(UsersService);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('returns the user without firebaseUid when found', async () => {
      await build({ selectRows: [{ user: sampleRow, role: sampleRole }] });

      const result = await service.findById(sampleRow.id, workspaceId);

      expect(result).toEqual({
        id: sampleRow.id,
        email: sampleRow.email,
        displayName: sampleRow.displayName,
        avatarUrl: sampleRow.avatarUrl,
        role: sampleRole,
        createdAt: sampleRow.createdAt.toISOString(),
        updatedAt: sampleRow.updatedAt.toISOString(),
      });
      expect(result).not.toHaveProperty('firebaseUid');
      expect(dbMock.select).toHaveBeenCalled();
    });

    it('throws Unauthorized when the subject user no longer exists', async () => {
      await build({ selectRows: [] });

      await expect(
        service.findById(sampleRow.id, workspaceId),
      ).rejects.toBeInstanceOf(UnauthorizedException);
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
      await build({
        selectRows: [{ role: sampleRole }],
        updateRows: [updated],
      });

      const result = await service.updateById(sampleRow.id, workspaceId, {
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
      expect(result.role).toBe(sampleRole);
      expect(result).not.toHaveProperty('firebaseUid');
    });

    it('throws Unauthorized when no row was updated', async () => {
      await build({ updateRows: [] });
      await expect(
        service.updateById(sampleRow.id, workspaceId, { displayName: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('listCurrentUserWorkspaces', () => {
    it('returns the ordered memberships with exactly one current workspace', async () => {
      await build({});
      membersService.listMembershipsForUser.mockResolvedValueOnce([
        {
          workspaceId: workspaceId,
          workspaceName: 'GiTiempo Studio',
          role: 'admin',
        },
        {
          workspaceId: '33333333-3333-3333-3333-333333333333',
          workspaceName: 'Client Delivery',
          role: 'member',
        },
      ]);

      await expect(
        service.listCurrentUserWorkspaces(sampleRow.id, workspaceId),
      ).resolves.toEqual({
        items: [
          {
            workspaceId,
            workspaceName: 'GiTiempo Studio',
            role: 'admin',
            isCurrent: true,
          },
          {
            workspaceId: '33333333-3333-3333-3333-333333333333',
            workspaceName: 'Client Delivery',
            role: 'member',
            isCurrent: false,
          },
        ],
      });
    });

    it('rejects stale sessions when the token workspace is no longer in the membership list', async () => {
      await build({});
      membersService.listMembershipsForUser.mockResolvedValueOnce([
        {
          workspaceId: '33333333-3333-3333-3333-333333333333',
          workspaceName: 'Client Delivery',
          role: 'member',
        },
      ]);

      await expect(
        service.listCurrentUserWorkspaces(sampleRow.id, workspaceId),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('updateFromFirebase', () => {
    it('preserves locally saved profile fields during Firebase login sync', async () => {
      await build({
        updateRows: [
          {
            ...sampleRow,
            avatarUrl: 'https://cdn.example.com/local-avatar.png',
          },
        ],
      });

      const result = await service.updateFromFirebase(sampleRow.id, {
        avatarUrl: 'https://cdn.example.com/firebase-avatar.png',
        displayName: 'Firebase Alice',
        email: sampleRow.email,
        firebaseUid: sampleRow.firebaseUid,
      });

      expect(result.displayName).toBe('Alice');
      expect(result.avatarUrl).toBe('https://cdn.example.com/local-avatar.png');
    });
  });

  describe('upsertFromFirebase', () => {
    it('preserves locally saved profile fields on Firebase conflict sync', async () => {
      await build({
        insertRows: [
          {
            ...sampleRow,
            avatarUrl: 'https://cdn.example.com/local-avatar.png',
          },
        ],
      });

      const result = await service.upsertFromFirebase({
        avatarUrl: 'https://cdn.example.com/firebase-avatar.png',
        displayName: 'Firebase Alice',
        email: sampleRow.email,
        firebaseUid: sampleRow.firebaseUid,
      });

      expect(result.displayName).toBe('Alice');
      expect(result.avatarUrl).toBe('https://cdn.example.com/local-avatar.png');
    });
  });
});
