import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
import { POSTGRES_UNIQUE_VIOLATION } from '../../db/postgres-errors';
import { SAVED_REPORTS_WORKSPACE_NAME_UNIQUE } from '../schemas/saved-reports.schema';
import { SavedReportsService } from './saved-reports.service';

const adminUser: AuthUser = {
  email: 'admin@example.com',
  firebaseUid: 'admin-uid',
  role: 'admin',
  sub: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001',
  workspaceId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002',
};

const pmUser: AuthUser = { ...adminUser, role: 'pm', sub: 'pm-1' };
const memberUser: AuthUser = { ...adminUser, role: 'member', sub: 'member-1' };

const validConfig = {
  dateRange: {
    dateFrom: '2026-07-01T00:00:00.000Z',
    dateTo: '2026-07-15T00:00:00.000Z',
    kind: 'absolute',
  },
};

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    config: {
      dateRange: {
        dateFrom: '2026-07-01T00:00:00.000Z',
        dateTo: '2026-07-15T00:00:00.000Z',
        kind: 'absolute',
      },
      grouping: ['project'],
    },
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    createdBy: adminUser.sub,
    id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9010',
    name: 'Monthly billing',
    updatedAt: new Date('2026-07-02T10:00:00.000Z'),
    workspaceId: adminUser.workspaceId,
    ...overrides,
  };
}

function createService(
  role: 'admin' | 'pm' | 'member',
  db: Record<string, unknown> = {},
) {
  const members = {
    requireRole: vi.fn().mockImplementation(() => {
      if (role === 'member') throw new ForbiddenException('Forbidden');
      return Promise.resolve({ role });
    }),
  };

  return {
    members,
    service: new SavedReportsService(db as never, members as never),
  };
}

function selectReturning(rows: unknown[]) {
  return {
    select: () => ({
      from: () => ({ where: () => ({ orderBy: () => Promise.resolve(rows) }) }),
    }),
  };
}

function mutationReturning(
  rows: unknown[],
  capture?: (values: unknown) => void,
) {
  return {
    delete: () => ({
      where: () => ({ returning: () => Promise.resolve(rows) }),
    }),
    insert: () => ({
      values: (values: unknown) => {
        capture?.(values);
        return { returning: () => Promise.resolve(rows) };
      },
    }),
    update: () => ({
      set: (values: unknown) => {
        capture?.(values);
        return { where: () => ({ returning: () => Promise.resolve(rows) }) };
      },
    }),
  };
}

function uniqueViolation(
  constraint: string = SAVED_REPORTS_WORKSPACE_NAME_UNIQUE,
) {
  return Object.assign(new Error('duplicate key'), {
    code: POSTGRES_UNIQUE_VIOLATION,
    constraint,
  });
}

describe('SavedReportsService authorization', () => {
  it('rejects a member listing presets', async () => {
    const { service } = createService('member');

    await expect(service.list(memberUser)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects a member creating a preset', async () => {
    const { service } = createService('member');

    await expect(
      service.create(memberUser, { config: {} as never, name: 'Nope' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a member deleting a preset', async () => {
    const { service } = createService('member');

    await expect(service.remove(memberUser, 'id')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lets a PM edit a preset created by an admin', async () => {
    const { service } = createService(
      'pm',
      mutationReturning([makeRow({ name: 'Renamed' })]),
    );

    await expect(
      service.update(pmUser, 'id', { name: 'Renamed' }),
    ).resolves.toMatchObject({ name: 'Renamed' });
  });

  it('asks for admin or PM on every path', async () => {
    const { members, service } = createService('admin', selectReturning([]));

    await service.list(adminUser);

    expect(members.requireRole).toHaveBeenCalledWith(
      adminUser.sub,
      adminUser.workspaceId,
      ['admin', 'pm'],
    );
  });
});

describe('SavedReportsService reads', () => {
  it('maps rows to the contract shape with ISO timestamps', async () => {
    const { service } = createService('admin', selectReturning([makeRow()]));

    const [preset] = await service.list(adminUser);

    expect(preset).toEqual({
      config: {
        dateRange: {
          dateFrom: '2026-07-01T00:00:00.000Z',
          dateTo: '2026-07-15T00:00:00.000Z',
          kind: 'absolute',
        },
        filters: {
          activity: 'any',
          billable: 'any',
          billableShare: 'any',
          global: '',
          hours: 'any',
        },
        grouping: ['project'],
        memberId: null,
        projectId: null,
      },
      createdAt: '2026-07-01T10:00:00.000Z',
      createdBy: adminUser.sub,
      id: makeRow().id,
      name: 'Monthly billing',
      updatedAt: '2026-07-02T10:00:00.000Z',
    });
  });

  it('fills defaults for a config stored before a filter existed', async () => {
    const { service } = createService(
      'admin',
      selectReturning([
        makeRow({
          config: {
            dateRange: {
              dateFrom: '2026-07-01T00:00:00.000Z',
              dateTo: '2026-07-15T00:00:00.000Z',
              kind: 'absolute',
            },
            entries: 'gte10',
          },
        }),
      ]),
    );

    const [preset] = await service.list(adminUser);

    expect(preset!.config.filters.hours).toBe('any');
    expect(preset!.config).not.toHaveProperty('entries');
  });
});

describe('SavedReportsService writes', () => {
  it('stamps the workspace and author on create', async () => {
    const captured: unknown[] = [];
    const { service } = createService(
      'admin',
      mutationReturning([makeRow()], (values) => captured.push(values)),
    );

    await service.create(adminUser, {
      config: { ...validConfig, grouping: ['project'] } as never,
      name: 'Monthly billing',
    });

    expect(captured[0]).toMatchObject({
      createdBy: adminUser.sub,
      name: 'Monthly billing',
      workspaceId: adminUser.workspaceId,
    });
  });

  it('writes the config through the shared schema on create, applying defaults', async () => {
    const captured: Record<string, unknown>[] = [];
    const { service } = createService(
      'admin',
      mutationReturning([makeRow()], (values) =>
        captured.push(values as Record<string, unknown>),
      ),
    );

    await service.create(adminUser, {
      config: { ...validConfig, grouping: ['project'] } as never,
      name: 'Monthly billing',
    });

    // the column receives the full parsed shape, never the raw input
    expect(captured[0]!.config).toMatchObject({
      grouping: ['project'],
      memberId: null,
      projectId: null,
      filters: { activity: 'any', billable: 'any' },
    });
  });

  it('rejects an invalid config on create before touching the database', async () => {
    const insert = vi.fn();
    const { service } = createService('admin', { insert });

    await expect(
      service.create(adminUser, {
        config: { ...validConfig, projectId: 'not-a-uuid' } as never,
        name: 'Broken',
      }),
    ).rejects.toThrow();

    expect(insert).not.toHaveBeenCalled();
  });

  it('writes a provided config through the shared schema on update', async () => {
    const captured: Record<string, unknown>[] = [];
    const { service } = createService(
      'admin',
      mutationReturning([makeRow()], (values) =>
        captured.push(values as Record<string, unknown>),
      ),
    );

    await service.update(adminUser, 'id', {
      config: { ...validConfig, grouping: ['project', 'user'] } as never,
    });

    expect(captured[0]!.config).toMatchObject({
      grouping: ['project', 'user'],
      projectId: null,
    });
  });

  it('rejects an invalid config on update before touching the database', async () => {
    const update = vi.fn();
    const { service } = createService('admin', { update });

    await expect(
      service.update(adminUser, 'id', {
        config: { ...validConfig, grouping: ['not-a-dimension'] } as never,
      }),
    ).rejects.toThrow();

    expect(update).not.toHaveBeenCalled();
  });

  it('reports a duplicate name as a conflict', async () => {
    const { service } = createService('admin', {
      insert: () => ({
        values: () => ({
          returning: () => Promise.reject(uniqueViolation()),
        }),
      }),
    });

    await expect(
      service.create(adminUser, {
        config: validConfig,
        name: 'Monthly billing',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reports a duplicate name on rename as a conflict', async () => {
    const { service } = createService('admin', {
      update: () => ({
        set: () => ({
          where: () => ({ returning: () => Promise.reject(uniqueViolation()) }),
        }),
      }),
    });

    await expect(
      service.update(adminUser, 'id', { name: 'Client hours' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not mask an unrelated unique constraint violation', async () => {
    const violation = uniqueViolation('saved_reports_other_unique');
    const { service } = createService('admin', {
      insert: () => ({
        values: () => ({
          returning: () => Promise.reject(violation),
        }),
      }),
    });

    await expect(
      service.create(adminUser, {
        config: validConfig,
        name: 'Monthly billing',
      }),
    ).rejects.toBe(violation);
  });

  it('advances the update timestamp', async () => {
    const captured: unknown[] = [];
    const { service } = createService(
      'admin',
      mutationReturning([makeRow()], (values) => captured.push(values)),
    );

    await service.update(adminUser, 'id', { name: 'Renamed' });

    expect(captured[0]).toHaveProperty('updatedAt');
  });

  it('leaves the name alone when only the config is updated', async () => {
    const captured: Record<string, unknown>[] = [];
    const { service } = createService(
      'admin',
      mutationReturning([makeRow()], (values) =>
        captured.push(values as Record<string, unknown>),
      ),
    );

    await service.update(adminUser, 'id', {
      config: { ...validConfig, grouping: ['user'] } as never,
    });

    expect(captured[0]).not.toHaveProperty('name');
    expect(captured[0]).toHaveProperty('config');
  });

  it('reports a missing preset on update as not found', async () => {
    const { service } = createService('admin', mutationReturning([]));

    await expect(
      service.update(adminUser, 'missing', { name: 'Renamed' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reports a missing preset on delete as not found', async () => {
    const { service } = createService('admin', mutationReturning([]));

    await expect(service.remove(adminUser, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('resolves when a delete removes a row', async () => {
    const { service } = createService(
      'admin',
      mutationReturning([{ id: makeRow().id }]),
    );

    await expect(
      service.remove(adminUser, makeRow().id),
    ).resolves.toBeUndefined();
  });
});
