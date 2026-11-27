import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  createManagedTimeEntrySchema,
  managedTimeEntryConflictSchema,
  managementProjectsQuerySchema,
  managementTimeEntriesQuerySchema,
  managementTimeEntryMembersQuerySchema,
  managementTimeEntryTasksQuerySchema,
  managementTimeEntryTasksResponseSchema,
  updateManagedTimeEntrySchema,
} from './time-entries.js';

const userId = 'c07d2a0c-4214-44e3-b621-73c5d0503260';
const taskId = 'a4c89ed1-d3dd-4a85-8c12-86ae0b653074';
const startedAt = '2026-11-23T09:00:00.000Z';
const endedAt = '2026-11-23T10:00:00.000Z';

describe('management time-entry contracts', () => {
  it('validates picker purpose, pagination, and owner IDs', () => {
    expect(managementProjectsQuerySchema.parse({ limit: '100' })).toEqual({
      page: 1,
      limit: 100,
    });
    expect(managementProjectsQuerySchema.safeParse({ page: 0 }).success).toBe(
      false,
    );
    expect(
      managementProjectsQuerySchema.safeParse({ limit: 101 }).success,
    ).toBe(false);
    for (const purpose of ['filter', 'create']) {
      expect(
        managementTimeEntryMembersQuerySchema.parse({ purpose }).purpose,
      ).toBe(purpose);
    }
    expect(
      managementTimeEntryMembersQuerySchema.safeParse({ purpose: 'other' })
        .success,
    ).toBe(false);
    expect(
      managementTimeEntryMembersQuerySchema.parse({ purpose: 'create', taskId })
        .taskId,
    ).toBe(taskId);
    expect(
      managementTimeEntryMembersQuerySchema.safeParse({
        purpose: 'filter',
        taskId,
      }).success,
    ).toBe(false);
    expect(
      managementTimeEntryMembersQuerySchema.safeParse({
        purpose: 'create',
        taskId: 'other',
      }).success,
    ).toBe(false);
    expect(managementTimeEntryTasksQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 20,
    });
    expect(managementTimeEntryTasksQuerySchema.parse({ userId }).userId).toBe(
      userId,
    );
    expect(
      managementTimeEntryTasksQuerySchema.safeParse({ userId: 'other' })
        .success,
    ).toBe(false);
  });

  it('preserves assignment on an empty owner task page', () => {
    const emptyPage = {
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
    expect(managementTimeEntryTasksResponseSchema.parse(emptyPage)).toEqual(
      emptyPage,
    );
    for (const isOwnerAssigned of [true, false]) {
      const response = { ...emptyPage, isOwnerAssigned };
      expect(managementTimeEntryTasksResponseSchema.parse(response)).toEqual(
        response,
      );
    }
  });

  it('accepts composed filters and validates the interval and query scope', () => {
    expect(
      managementTimeEntriesQuerySchema.parse({
        userId,
        search: ' Task ',
        dateFrom: startedAt,
        dateTo: endedAt,
      }),
    ).toEqual({
      userId,
      search: 'Task',
      dateFrom: startedAt,
      dateTo: endedAt,
      page: 1,
      limit: 20,
    });
    expect(
      managementTimeEntriesQuerySchema.safeParse({
        dateFrom: endedAt,
        dateTo: startedAt,
      }).success,
    ).toBe(false);
    expect(
      managementTimeEntriesQuerySchema.safeParse({ projectId: taskId }).success,
    ).toBe(false);
  });

  it('requires the owner on create and preserves immutable fields on patch', () => {
    const interval = { taskId, startedAt, endedAt, description: null };
    expect(
      createManagedTimeEntrySchema.parse({ ...interval, userId }).description,
    ).toBeNull();
    expect(createManagedTimeEntrySchema.safeParse(interval).success).toBe(
      false,
    );
    expect(
      createManagedTimeEntrySchema.safeParse({
        ...interval,
        userId,
        endedAt: startedAt,
      }).success,
    ).toBe(false);
    expect(updateManagedTimeEntrySchema.parse({ description: null })).toEqual({
      description: null,
    });
    expect(updateManagedTimeEntrySchema.safeParse({}).success).toBe(false);
    expect(
      z.toJSONSchema(updateManagedTimeEntrySchema, { io: 'input' }),
    ).toHaveProperty('minProperties', 1);
    expect(
      updateManagedTimeEntrySchema.safeParse({ startedAt, endedAt: startedAt })
        .success,
    ).toBe(false);
    const immutableFields = { workspaceId: userId, invoiceId: userId, source: 'manual' };
    for (const [field, value] of Object.entries(immutableFields)) {
      expect(
        updateManagedTimeEntrySchema.safeParse({
          description: null,
          [field]: value,
        }).success,
      ).toBe(false);
    }
  });

  it('accepts managed reassignment fields as optional UUIDs', () => {
    const projectId = '60000000-0000-4000-8000-000000000006';
    expect(updateManagedTimeEntrySchema.parse({ userId })).toEqual({ userId });
    expect(updateManagedTimeEntrySchema.parse({ projectId, taskId })).toEqual({
      projectId,
      taskId,
    });
    expect(
      updateManagedTimeEntrySchema.safeParse({ projectId: 'invalid' }).success,
    ).toBe(false);
    expect(
      updateManagedTimeEntrySchema.safeParse({ userId: 'invalid' }).success,
    ).toBe(false);
  });

  it.each([
    'time_entry_running',
    'time_entry_invoiced',
    'time_entry_concurrent_update',
  ])(
    'parses the %s conflict',
    (code) => {
      expect(
        managedTimeEntryConflictSchema.parse({
          statusCode: 409,
          code,
          message: 'The update conflicts with the current record',
          error: 'Conflict',
        }).code,
      ).toBe(code);
    },
  );
});
