import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi, type Mock } from 'vitest';
import type { InvoiceListItem, InvoiceResponse } from '@gitiempo/shared';
import type { AuthUser } from '../../auth/types/auth-user';
import { DomainError } from '../../commons/errors/domain-error';
import { escapeLikePattern } from '../../commons/utils/escape-like-pattern';
import { invoices } from '../schemas/invoices.schema';
import { InvoicesService } from './invoices.service';

// escapeLikePattern is mocked with the real escaping rule so the search
// test can prove the escaped pattern flows into the ILIKE condition while
// staying independent of the raw user input string.
vi.mock('../../commons/utils/escape-like-pattern', () => ({
  escapeLikePattern: vi.fn((value: string) =>
    value.replace(/[\\%_]/g, (char) => `\\${char}`),
  ),
}));

const adminUser: AuthUser = {
  sub: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001',
  email: 'admin@example.com',
  firebaseUid: 'admin-uid',
  workspaceId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002',
  role: 'admin',
};

const pmUser: AuthUser = {
  ...adminUser,
  sub: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003',
  email: 'pm@example.com',
  firebaseUid: 'pm-uid',
  role: 'pm',
};

const memberUser: AuthUser = {
  ...adminUser,
  sub: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004',
  email: 'member@example.com',
  firebaseUid: 'member-uid',
  role: 'member',
};

function createService(role: 'admin' | 'pm' | 'member') {
  const members = {
    requireRole: vi
      .fn()
      .mockImplementation(
        (_userId: string, _wsId: string, roles: readonly string[]) => {
          if (!roles.includes(role)) throw new ForbiddenException('Forbidden');
          return Promise.resolve({ role });
        },
      ),
  };
  return {
    service: new InvoicesService({} as never, members as never),
    members,
  };
}

const CHAINABLE_METHODS = [
  'from',
  'leftJoin',
  'innerJoin',
  'where',
  'orderBy',
  'limit',
  'offset',
  'groupBy',
  'for',
] as const;

type ChainTerminal = (typeof CHAINABLE_METHODS)[number];

type ChainBuilder = Record<ChainTerminal, Mock>;

/**
 * Models the real Drizzle select contract: select(...).from(...).leftJoin(...)
 * [repeated].where(...)...terminalMethod(...). Every chainable method returns
 * the builder itself so chaining holds, and the terminal method resolves to
 * `value` when awaited (e.g. rows for offset, `[row]` for limit, groupBy rows).
 */
function makeSelectChain(
  terminal: ChainTerminal,
  value: unknown,
): ChainBuilder {
  const builder = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    groupBy: vi.fn(),
    for: vi.fn(),
  } as ChainBuilder;
  for (const method of CHAINABLE_METHODS) {
    builder[method].mockReturnValue(builder);
  }
  builder[terminal] = vi.fn().mockResolvedValue(value);
  return builder;
}

type PrivateMethod<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => TResult;

/** Accesses a private service helper for behavior-focused unit assertions. */
function priv<TArgs extends unknown[], TResult>(
  service: InvoicesService,
  name: string,
): PrivateMethod<TArgs, TResult> {
  const candidate = (service as unknown as Record<string, unknown>)[name];
  if (typeof candidate !== 'function') {
    throw new Error(`Private helper "${name}" not found on InvoicesService`);
  }
  return (candidate as PrivateMethod<TArgs, TResult>).bind(service);
}

/**
 * Collects literal text out of a Drizzle SQL fragment (string chunks, bound
 * param values, and column names) so filters like ILIKE can be asserted
 * without running a real SQL dialect.
 */
function collectSqlText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (node === null || typeof node !== 'object') {
    return node === null || node === undefined ? '' : String(node);
  }
  const candidates = node as { queryChunks?: unknown[]; value?: unknown };
  if (Array.isArray(candidates.queryChunks)) {
    return candidates.queryChunks
      .map((chunk) => collectSqlText(chunk))
      .join('');
  }
  if (
    typeof candidates.value === 'string' ||
    typeof candidates.value === 'number' ||
    typeof candidates.value === 'boolean'
  ) {
    return String(candidates.value);
  }
  if (Array.isArray(candidates.value)) {
    return candidates.value.map((chunk) => collectSqlText(chunk)).join('');
  }
  if (typeof (node as { name?: unknown }).name === 'string') {
    return (node as { name: string }).name;
  }
  return '';
}

// Deterministic ids reused across create-flow assertions.
const createdInvoiceId = '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9111';
const pmProjectId = '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9077';
const filterProjectId = '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9099';

const sampleInvoiceRow = {
  id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9010',
  workspaceId: adminUser.workspaceId,
  projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9005',
  title: 'Invoice 2026-04',
  status: 'draft',
  dateFrom: '2026-04-01',
  dateTo: '2026-04-30',
  hourlyRate: 75,
  currency: 'USD',
  discountPercent: 0,
  totalHours: 10,
  totalAmount: 750,
  notes: null,
  createdBy: adminUser.sub,
  createdAt: new Date('2026-04-30T18:00:00.000Z'),
  updatedAt: new Date('2026-04-30T18:00:00.000Z'),
  projectName: 'Project Orion',
};

const sampleEntries = [
  {
    id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9020',
    taskId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9006',
    userId: adminUser.sub,
    startedAt: new Date('2026-04-21T09:00:00.000Z'),
    endedAt: new Date('2026-04-21T11:00:00.000Z'),
    durationSeconds: 7200,
    isBillable: true,
    description: null,
  },
];

interface CreateDbStage {
  selectSpy: Mock;
  transactionSpy: Mock;
  insertSpy: Mock;
  insertValuesSpy: Mock;
  insertReturningSpy: Mock;
  updateSetSpy: Mock;
  probeStage?: ChainBuilder;
  tx: { select: Mock; insert: Mock; update: Mock };
}

/**
 * Wires the db mocks for the create path. db.select calls happen in this
 * order: [optional project-access probe, then workspace settings]. The
 * transaction is executed synchronously against a tx whose select queue is:
 * eligible-entry lock, invoice detail re-read, linked entries.
 */
function stageCreateDb(
  service: InvoicesService,
  options: {
    /** Rows for the settings read. `[]` simulates a missing settings row. */
    settings: Array<{
      defaultHourlyRate: number | null;
      currency: string | null;
    }>;
    /** Rows for the requirePmProjectAccess/requireWorkspaceProject probe. Omit when no project is involved; pass `[]` for an inaccessible project. */
    projectProbeRows?: Array<{ id: string }>;
    /** True when the input carries a projectId, which adds the eligibility inArray subquery as a db.select call inside the transaction. */
    eligibilitySubquery?: boolean;
    /** Row the transaction's detail re-read returns. */
    detailRow?: unknown;
    /** Completed billable entries locked by the SELECT FOR UPDATE. */
    eligibleEntries?: Array<{ id: string; durationSeconds?: number }>;
  },
): CreateDbStage {
  const detailRow = options.detailRow ?? sampleInvoiceRow;

  const txSelectSpy = vi.fn();
  txSelectSpy
    .mockImplementationOnce(() =>
      makeSelectChain('for', options.eligibleEntries ?? []),
    )
    .mockImplementationOnce(() => makeSelectChain('limit', [detailRow]))
    .mockImplementationOnce(() => makeSelectChain('orderBy', []));

  const insertReturningSpy = vi
    .fn()
    .mockResolvedValue([{ id: createdInvoiceId }]);
  const insertValuesSpy = vi
    .fn()
    .mockReturnValue({ returning: insertReturningSpy });
  const insertSpy = vi.fn().mockReturnValue({ values: insertValuesSpy });

  const updateWhereSpy = vi.fn().mockResolvedValue(undefined);
  const updateSetSpy = vi.fn().mockReturnValue({ where: updateWhereSpy });
  const updateSpy = vi.fn().mockReturnValue({ set: updateSetSpy });

  const tx = { select: txSelectSpy, insert: insertSpy, update: updateSpy };

  const selectSpy = vi.fn();
  let probeStage: ChainBuilder | undefined;
  if (options.projectProbeRows) {
    probeStage = makeSelectChain('limit', options.projectProbeRows);
    selectSpy.mockImplementationOnce(() => probeStage);
  }
  selectSpy.mockImplementationOnce(() =>
    makeSelectChain('limit', options.settings),
  );
  if (options.eligibilitySubquery) {
    // The subquery is embedded in inArray(...) and never awaited; every
    // method stays chainable so no terminal is replaced.
    selectSpy.mockImplementationOnce(() => makeSelectChain('groupBy', []));
  }

  const transactionSpy = vi.fn(async (handler: (t: typeof tx) => unknown) =>
    handler(tx),
  );
  Object.defineProperty(service, 'db', {
    value: { select: selectSpy, transaction: transactionSpy },
  });

  return {
    selectSpy,
    transactionSpy,
    insertSpy,
    insertValuesSpy,
    insertReturningSpy,
    updateSetSpy,
    probeStage,
    tx,
  };
}

function stageUpdateDb(
  service: InvoicesService,
  options: {
    initialRow?: unknown | null;
    refreshedRow?: unknown | null;
    updateResult?: Array<{ id: string }>;
  } = {},
) {
  const initialRow =
    options.initialRow === undefined ? sampleInvoiceRow : options.initialRow;
  const refreshedRow =
    options.refreshedRow === undefined
      ? sampleInvoiceRow
      : options.refreshedRow;
  const updateReturningSpy = vi
    .fn()
    .mockResolvedValue(options.updateResult ?? [{ id: sampleInvoiceRow.id }]);
  const updateWhereSpy = vi
    .fn()
    .mockReturnValue({ returning: updateReturningSpy });
  const updateSetSpy = vi.fn().mockReturnValue({ where: updateWhereSpy });
  const updateSpy = vi.fn().mockReturnValue({ set: updateSetSpy });
  const txSelectSpy = vi
    .fn()
    .mockImplementationOnce(() =>
      makeSelectChain('limit', initialRow ? [initialRow] : []),
    )
    .mockImplementationOnce(() =>
      makeSelectChain('limit', refreshedRow ? [refreshedRow] : []),
    )
    .mockImplementationOnce(() => makeSelectChain('orderBy', []));
  const tx = { select: txSelectSpy, update: updateSpy };
  const transactionSpy = vi.fn(
    async (handler: (transaction: typeof tx) => unknown) => handler(tx),
  );

  Object.defineProperty(service, 'db', {
    value: { transaction: transactionSpy },
  });
  Object.defineProperty(service, 'toInvoiceResponse', {
    value: vi.fn().mockReturnValue({ id: sampleInvoiceRow.id }),
  });

  return {
    transactionSpy,
    updateSpy,
    updateSetSpy,
    updateReturningSpy,
    txSelectSpy,
  };
}

describe('InvoicesService', () => {
  // ── Authorization ─────────────────────────────────────────────────────

  it('rejects members on list', async () => {
    const { service } = createService('member');
    await expect(
      service.listInvoices(memberUser, { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects members on create', async () => {
    const { service } = createService('member');
    await expect(
      service.createInvoice(memberUser, {
        title: 'Test',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        discountPercent: 0,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects members on get', async () => {
    const { service } = createService('member');
    await expect(
      service.getInvoice(memberUser, '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9010'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects members on update', async () => {
    const { service } = createService('member');
    await expect(
      service.updateInvoice(
        memberUser,
        '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9010',
        {
          status: 'sent',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects PMs on delete (admin-only)', async () => {
    const { service, members } = createService('pm');
    await expect(
      service.deleteInvoice(pmUser, '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9010'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(members.requireRole).toHaveBeenCalledWith(
      pmUser.sub,
      pmUser.workspaceId,
      ['admin'],
    );
  });

  it('requires PMs to scope invoice creation to a project', async () => {
    const { service } = createService('pm');
    await expect(
      service.createInvoice(pmUser, {
        title: 'Workspace-wide',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        discountPercent: 0,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // ── Totals calculation ────────────────────────────────────────────────

  it('computes totals from seconds, rate, and discount', () => {
    const { service } = createService('admin');
    const compute = priv<
      [number, number, number],
      {
        totalHours: number;
        totalAmount: number;
      }
    >(service, 'computeInvoiceTotals');

    // 7200 seconds = 2 hours, rate 75, no discount → 150.00
    expect(compute(7200, 75, 0)).toEqual({ totalHours: 2, totalAmount: 150 });

    // 3600 seconds = 1 hour, rate 80, 10% discount → 72.00
    expect(compute(3600, 80, 10)).toEqual({ totalHours: 1, totalAmount: 72 });

    // 5400 seconds = 1.5 hours, rate 100, 50% discount → 75.00
    expect(compute(5400, 100, 50)).toEqual({
      totalHours: 1.5,
      totalAmount: 75,
    });
  });

  it('handles zero entries with zero totals', () => {
    const { service } = createService('admin');
    const compute = priv<
      [number, number, number],
      {
        totalHours: number;
        totalAmount: number;
      }
    >(service, 'computeInvoiceTotals');

    expect(compute(0, 75, 0)).toEqual({ totalHours: 0, totalAmount: 0 });
  });

  it('maps a 100% discount to a zero amount', () => {
    const { service } = createService('admin');
    const compute = priv<
      [number, number, number],
      {
        totalHours: number;
        totalAmount: number;
      }
    >(service, 'computeInvoiceTotals');

    expect(compute(7200, 75, 100)).toEqual({ totalHours: 2, totalAmount: 0 });
  });

  it('rounds half-cent amounts like 16.665 up to 16.67', () => {
    const { service } = createService('admin');
    const compute = priv<
      [number, number, number],
      {
        totalHours: number;
        totalAmount: number;
      }
    >(service, 'computeInvoiceTotals');

    // 1800 seconds = 0.5 hours × rate 33.33 = 16.665 → 16.67
    expect(compute(1800, 33.33, 0)).toEqual({
      totalHours: 0.5,
      totalAmount: 16.67,
    });
  });

  it('rounds half-cent amounts correctly for 0.5h × $75.21', () => {
    const { service } = createService('admin');
    const compute = priv<
      [number, number, number],
      {
        totalHours: number;
        totalAmount: number;
      }
    >(service, 'computeInvoiceTotals');

    // 0.5h × 75.21 = 37.605 — binary floating point evaluates
    // 37.605 * 100 as 3760.4999999999995, so the fixed-point path must
    // round the exact half up to 37.61 instead of down to 37.60.
    expect(compute(1800, 75.21, 0)).toEqual({
      totalHours: 0.5,
      totalAmount: 37.61,
    });
  });

  it('rounds discounted amounts at the two-decimal boundary', () => {
    const { service } = createService('admin');
    const compute = priv<
      [number, number, number],
      {
        totalHours: number;
        totalAmount: number;
      }
    >(service, 'computeInvoiceTotals');

    // 5400 seconds = 1.5 hours × rate 100 minus 33.33% = 100.005 → 100.01
    expect(compute(5400, 100, 33.33)).toEqual({
      totalHours: 1.5,
      totalAmount: 100.01,
    });
  });

  it('keeps two-decimal hours for very small durations', () => {
    const { service } = createService('admin');
    const compute = priv<
      [number, number, number],
      {
        totalHours: number;
        totalAmount: number;
      }
    >(service, 'computeInvoiceTotals');

    // 36 seconds = 0.01 hours × rate 100 = 1
    expect(compute(36, 100, 0)).toEqual({ totalHours: 0.01, totalAmount: 1 });
  });

  it('handles a zero hourly rate', () => {
    const { service } = createService('admin');
    const compute = priv<
      [number, number, number],
      {
        totalHours: number;
        totalAmount: number;
      }
    >(service, 'computeInvoiceTotals');

    // 7200 seconds = 2 hours × rate 0 = 0
    expect(compute(7200, 0, 0)).toEqual({ totalHours: 2, totalAmount: 0 });
  });

  it('applies the rate to rounded hours, not raw seconds', () => {
    const { service } = createService('admin');
    const compute = priv<
      [number, number, number],
      {
        totalHours: number;
        totalAmount: number;
      }
    >(service, 'computeInvoiceTotals');

    // 5392 seconds = 1.49778h → hours round to 1.50, amount = 1.50 × 100 =
    // 150.00 (raw seconds would give 149.78) — documented design order.
    expect(compute(5392, 100, 0)).toEqual({
      totalHours: 1.5,
      totalAmount: 150,
    });
  });

  it('rounds 522 seconds to 0.15 hours, not 0.14 (floating-point drift)', () => {
    const { service } = createService('admin');
    const compute = priv<
      [number, number, number],
      {
        totalHours: number;
        totalAmount: number;
      }
    >(service, 'computeInvoiceTotals');

    // 522 seconds = 0.145 hours. The naive (seconds / 3600) * 100 produces
    // 14.499999999999998 in IEEE 754, which Math.round truncates to 14
    // centihours (0.14h). Integer-first arithmetic (seconds * 100 / 3600)
    // yields the exact 14.5, rounding to 15 centihours (0.15h) → $15.00.
    expect(compute(522, 100, 0)).toEqual({
      totalHours: 0.15,
      totalAmount: 15,
    });
  });

  it('preserves exact cents when the triple product exceeds MAX_SAFE_INTEGER', () => {
    const { service } = createService('admin');
    const compute = priv<
      [number, number, number],
      {
        totalHours: number;
        totalAmount: number;
      }
    >(service, 'computeInvoiceTotals');

    // 360000036 s → 100000.01 centihours × $1000.01/hr × no discount.
    // The intermediate product 10000001 × 100001 × 10000 = 10000101000010000
    // exceeds Number.MAX_SAFE_INTEGER (9007199254740991). BigInt arithmetic
    // keeps the intermediate exact: amountCents = 10000101000 → $100001010.00.
    expect(compute(360000036, 1000.01, 0)).toEqual({
      totalHours: 100000.01,
      totalAmount: 100001010,
    });
  });

  // ── Response mapping ──────────────────────────────────────────────────

  it('maps an invoice row with linked entries to the response contract', () => {
    const { service } = createService('admin');
    const toResponse = priv<[unknown, unknown[]], InvoiceResponse>(
      service,
      'toInvoiceResponse',
    );

    const response = toResponse(sampleInvoiceRow, sampleEntries);

    expect(response.id).toBe(sampleInvoiceRow.id);
    expect(response.status).toBe('draft');
    expect(response.project).toEqual({
      id: sampleInvoiceRow.projectId,
      name: 'Project Orion',
    });
    expect(response.timeEntryCount).toBe(1);
    expect(response.timeEntries[0]).toMatchObject({
      id: sampleEntries[0].id,
      durationSeconds: 7200,
    });
  });

  it('maps an invoice with no project to a null project summary', () => {
    const { service } = createService('admin');
    const toResponse = priv<[unknown, unknown[]], InvoiceResponse>(
      service,
      'toInvoiceResponse',
    );

    const response = toResponse(
      { ...sampleInvoiceRow, projectId: null, projectName: null },
      [],
    );

    expect(response.project).toBeNull();
    expect(response.timeEntryCount).toBe(0);
    expect(response.timeEntries).toEqual([]);
  });

  it('passes entry endedAt and durationSeconds through for complete entries', () => {
    const { service } = createService('admin');
    const toResponse = priv<[unknown, unknown[]], InvoiceResponse>(
      service,
      'toInvoiceResponse',
    );

    const response = toResponse(sampleInvoiceRow, [
      {
        id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9021',
        taskId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9006',
        userId: adminUser.sub,
        startedAt: new Date('2026-04-21T09:15:45.123Z'),
        endedAt: new Date('2026-04-21T15:30:45.123Z'),
        durationSeconds: 3661,
        isBillable: false,
        description: 'Backend work',
      },
    ]);

    expect(response.timeEntries).toEqual([
      {
        id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9021',
        taskId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9006',
        userId: adminUser.sub,
        startedAt: '2026-04-21T09:15:45.123Z',
        endedAt: '2026-04-21T15:30:45.123Z',
        durationSeconds: 3661,
        isBillable: false,
        description: 'Backend work',
      },
    ]);
  });

  it('casts the stored status string for all three statuses', () => {
    const { service } = createService('admin');
    const toResponse = priv<[unknown, unknown[]], InvoiceResponse>(
      service,
      'toInvoiceResponse',
    );

    for (const status of ['draft', 'sent', 'paid'] as const) {
      const response = toResponse({ ...sampleInvoiceRow, status }, []);
      expect(response.status).toBe(status);
    }
  });

  it('coerces numeric snapshot fields the DB may return as strings', () => {
    const { service } = createService('admin');
    const toResponse = priv<[unknown, unknown[]], InvoiceResponse>(
      service,
      'toInvoiceResponse',
    );

    const response = toResponse(
      {
        ...sampleInvoiceRow,
        hourlyRate: '75',
        discountPercent: '25',
        totalHours: '10',
        totalAmount: '750',
      },
      [],
    );

    expect(response.hourlyRate).toBe(75);
    expect(response.discountPercent).toBe(25);
    expect(response.totalHours).toBe(10);
    expect(response.totalAmount).toBe(750);
  });

  it('returns a null project when projectId is null even if projectName exists', () => {
    const { service } = createService('admin');
    const toResponse = priv<[unknown, unknown[]], InvoiceResponse>(
      service,
      'toInvoiceResponse',
    );

    const response = toResponse(
      { ...sampleInvoiceRow, projectId: null, projectName: 'Orphan name' },
      [],
    );

    expect(response.project).toBeNull();
  });

  it('returns a null project when projectName is null even if projectId exists', () => {
    const { service } = createService('admin');
    const toResponse = priv<[unknown, unknown[]], InvoiceResponse>(
      service,
      'toInvoiceResponse',
    );

    const response = toResponse({ ...sampleInvoiceRow, projectName: null }, []);

    expect(response.project).toBeNull();
    expect(response.projectId).toBe(sampleInvoiceRow.projectId);
  });

  // ── List item mapping ─────────────────────────────────────────────────

  it('maps list items without a timeEntries field', () => {
    const { service } = createService('admin');
    const toListItem = priv<[unknown, number], InvoiceListItem>(
      service,
      'toInvoiceListItem',
    );

    const item = toListItem(sampleInvoiceRow, 4);

    expect(item).not.toHaveProperty('timeEntries');
    expect(item.id).toBe(sampleInvoiceRow.id);
    expect(item.title).toBe(sampleInvoiceRow.title);
    expect(item.project).toEqual({
      id: sampleInvoiceRow.projectId,
      name: 'Project Orion',
    });
  });

  it('uses the passed entry count for the list item', () => {
    const { service } = createService('admin');
    const toListItem = priv<[unknown, number], InvoiceListItem>(
      service,
      'toInvoiceListItem',
    );

    const item = toListItem(sampleInvoiceRow, 4);

    expect(item.timeEntryCount).toBe(4);
  });

  it('maps a null project to a null list-item summary', () => {
    const { service } = createService('admin');
    const toListItem = priv<[unknown, number], InvoiceListItem>(
      service,
      'toInvoiceListItem',
    );

    const item = toListItem(
      { ...sampleInvoiceRow, projectId: null, projectName: null },
      2,
    );

    expect(item.project).toBeNull();
    expect(item.projectId).toBeNull();
    expect(item.timeEntryCount).toBe(2);
  });

  it('accepts a zero entry count for list items', () => {
    const { service } = createService('admin');
    const toListItem = priv<[unknown, number], InvoiceListItem>(
      service,
      'toInvoiceListItem',
    );

    const item = toListItem(sampleInvoiceRow, 0);

    expect(item.timeEntryCount).toBe(0);
  });

  it('coerces numeric list-item fields the DB may return as strings', () => {
    const { service } = createService('admin');
    const toListItem = priv<[unknown, number], InvoiceListItem>(
      service,
      'toInvoiceListItem',
    );

    const item = toListItem(
      {
        ...sampleInvoiceRow,
        hourlyRate: '75',
        discountPercent: '25',
        totalHours: '10',
        totalAmount: '750',
      },
      0,
    );

    expect(item.hourlyRate).toBe(75);
    expect(item.discountPercent).toBe(25);
    expect(item.totalHours).toBe(10);
    expect(item.totalAmount).toBe(750);
  });

  // ── List scoping ──────────────────────────────────────────────────────

  function stageListDb(options: {
    rows: unknown[];
    total: number;
    entryCounts?: Array<{ invoiceId: string | null; entryCount: number }>;
  }) {
    const listStage = makeSelectChain('offset', options.rows);
    const countStage = makeSelectChain('where', [{ value: options.total }]);
    const entryCountStage = makeSelectChain(
      'groupBy',
      options.entryCounts ?? [],
    );
    const selectSpy = vi.fn();
    selectSpy.mockImplementationOnce(() => listStage);
    selectSpy.mockImplementationOnce(() => countStage);
    if (options.rows.length > 0) {
      selectSpy.mockImplementationOnce(() => entryCountStage);
    }
    return { selectSpy, listStage, countStage, entryCountStage };
  }

  it('allows admins to list all workspace invoices', async () => {
    const { service, members } = createService('admin');
    const { selectSpy, listStage, countStage } = stageListDb({
      rows: [],
      total: 0,
    });
    Object.defineProperty(service, 'db', {
      value: { select: selectSpy },
    });

    const result = await service.listInvoices(adminUser, {
      page: 1,
      limit: 20,
    });

    expect(result.items).toEqual([]);
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
    expect(members.requireRole).toHaveBeenCalledWith(
      adminUser.sub,
      adminUser.workspaceId,
      ['admin', 'pm'],
    );
    // Admins join projects and users (createdByName) — no assignment scoping.
    expect(listStage.leftJoin).toHaveBeenCalledTimes(2);
    expect(countStage.leftJoin).toHaveBeenCalledTimes(1);
  });

  it('allows PMs to list invoices scoped to visible projects', async () => {
    const { service, members } = createService('pm');
    const { selectSpy, listStage, countStage } = stageListDb({
      rows: [],
      total: 0,
    });
    Object.defineProperty(service, 'db', {
      value: { select: selectSpy },
    });

    const result = await service.listInvoices(pmUser, { page: 1, limit: 20 });

    expect(result.items).toEqual([]);
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
    expect(members.requireRole).toHaveBeenCalledWith(
      pmUser.sub,
      pmUser.workspaceId,
      ['admin', 'pm'],
    );
    // PM scoping adds the assignment leftJoin on both list and count queries.
    // List also joins users for createdByName.
    expect(listStage.leftJoin).toHaveBeenCalledTimes(3);
    expect(countStage.leftJoin).toHaveBeenCalledTimes(2);
  });

  it('filters by search with the escaped ILIKE pattern', async () => {
    const { service } = createService('admin');
    const { selectSpy, listStage } = stageListDb({ rows: [], total: 0 });
    Object.defineProperty(service, 'db', {
      value: { select: selectSpy },
    });

    await service.listInvoices(adminUser, {
      page: 1,
      limit: 20,
      search: 'Orion 50%',
    });

    expect(escapeLikePattern).toHaveBeenCalledWith('Orion 50%');
    const whereArg = listStage.where.mock.calls[0][0];
    const whereText = collectSqlText(whereArg);
    expect(whereText).toContain(' ILIKE ');
    // Backslash-escaped wildcard proves the escaped pattern was embedded.
    expect(whereText).toContain('Orion 50\\%');
  });

  it('filters by projectId', async () => {
    const { service } = createService('admin');
    const { selectSpy, listStage } = stageListDb({ rows: [], total: 0 });
    Object.defineProperty(service, 'db', {
      value: { select: selectSpy },
    });

    await service.listInvoices(adminUser, {
      page: 1,
      limit: 20,
      projectId: filterProjectId,
    });

    const whereText = collectSqlText(listStage.where.mock.calls[0][0]);
    expect(whereText).toContain(filterProjectId);
  });

  it('filters by status', async () => {
    const { service } = createService('admin');
    const { selectSpy, listStage } = stageListDb({ rows: [], total: 0 });
    Object.defineProperty(service, 'db', {
      value: { select: selectSpy },
    });

    await service.listInvoices(adminUser, {
      page: 1,
      limit: 20,
      status: 'sent',
    });

    const whereText = collectSqlText(listStage.where.mock.calls[0][0]);
    expect(whereText).toContain('sent');
  });

  it('filters by date range', async () => {
    const { service } = createService('admin');
    const { selectSpy, listStage } = stageListDb({ rows: [], total: 0 });
    Object.defineProperty(service, 'db', {
      value: { select: selectSpy },
    });

    await service.listInvoices(adminUser, {
      page: 1,
      limit: 20,
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
    });

    const whereText = collectSqlText(listStage.where.mock.calls[0][0]);
    expect(whereText).toContain('2026-04-01');
    expect(whereText).toContain('>=');
    expect(whereText).toContain('2026-04-30');
    expect(whereText).toContain('<=');
  });

  it('paginates and aggregates per-invoice entry counts', async () => {
    const { service } = createService('admin');
    const { selectSpy, listStage } = stageListDb({
      rows: [sampleInvoiceRow],
      total: 7,
      entryCounts: [{ invoiceId: sampleInvoiceRow.id, entryCount: 3 }],
    });
    Object.defineProperty(service, 'db', {
      value: { select: selectSpy },
    });

    const result = await service.listInvoices(adminUser, {
      page: 2,
      limit: 5,
    });

    // page 2 with limit 5 → offset (2 - 1) * 5 = 5
    expect(listStage.limit).toHaveBeenCalledWith(5);
    expect(listStage.offset).toHaveBeenCalledWith(5);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].timeEntryCount).toBe(3);
    expect(result.meta).toEqual({
      page: 2,
      limit: 5,
      total: 7,
      totalPages: 2,
    });
  });

  it('returns empty items and zeroed pagination for no matches', async () => {
    const { service } = createService('admin');
    const { selectSpy, entryCountStage } = stageListDb({ rows: [], total: 0 });
    Object.defineProperty(service, 'db', {
      value: { select: selectSpy },
    });

    const result = await service.listInvoices(adminUser, {
      page: 1,
      limit: 20,
    });

    // No rows → the per-invoice count query is skipped entirely.
    expect(entryCountStage.groupBy).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  // ── Create flow (settings & transactions) ─────────────────────────────

  it('rejects creation when no rate is provided and no workspace default exists', async () => {
    const { service } = createService('admin');
    const { transactionSpy } = stageCreateDb(service, { settings: [] });

    const thrown = await service
      .createInvoice(adminUser, {
        title: 'No Rate',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        discountPercent: 0,
      })
      .then(
        () => null,
        (error: unknown) => error,
      );

    expect(thrown).toBeInstanceOf(DomainError);
    expect((thrown as DomainError).getResponse()).toMatchObject({
      code: 'invoice_rate_required',
    });
    // Fails before the transaction starts.
    expect(transactionSpy).not.toHaveBeenCalled();
  });

  it('rejects creation when neither input nor settings provide a currency', async () => {
    const { service } = createService('admin');
    const { transactionSpy } = stageCreateDb(service, {
      settings: [{ defaultHourlyRate: 75, currency: null }],
    });

    const thrown = await service
      .createInvoice(adminUser, {
        title: 'No Currency',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        discountPercent: 0,
      })
      .then(
        () => null,
        (error: unknown) => error,
      );

    expect(thrown).toBeInstanceOf(DomainError);
    expect((thrown as DomainError).getResponse()).toMatchObject({
      code: 'invoice_currency_required',
    });
    expect(transactionSpy).not.toHaveBeenCalled();
  });

  it('rejects creation when the computed total overflows NUMERIC(12,2)', async () => {
    const { service } = createService('admin');
    const { insertSpy, transactionSpy } = stageCreateDb(service, {
      settings: [{ defaultHourlyRate: 150_000, currency: 'USD' }],
      // 360,000,000 seconds = 100,000 hours →
      // 100,000h × $150,000 = $15,000,000,000, far above the
      // NUMERIC(12,2) ceiling of $9,999,999,999.99.
      eligibleEntries: [{ id: createdInvoiceId, durationSeconds: 360_000_000 }],
    });

    const thrown = await service
      .createInvoice(adminUser, {
        title: 'Overflow Invoice',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        discountPercent: 0,
      })
      .then(
        () => null,
        (error: unknown) => error,
      );

    expect(thrown).toBeInstanceOf(DomainError);
    expect((thrown as DomainError).getResponse()).toMatchObject({
      code: 'invoice_total_overflow',
    });
    expect((thrown as DomainError).getStatus()).toBe(422);
    // The transaction started, but no invoice row was written.
    expect(transactionSpy).toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('falls back to workspace settings for both rate and currency', async () => {
    const { service } = createService('admin');
    const { insertValuesSpy } = stageCreateDb(service, {
      settings: [{ defaultHourlyRate: 75, currency: 'EUR' }],
    });

    const result = await service.createInvoice(adminUser, {
      title: 'From Settings',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      discountPercent: 0,
    });

    expect(insertValuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: adminUser.workspaceId,
        projectId: null,
        hourlyRate: 75,
        currency: 'EUR',
        status: 'draft',
        createdBy: adminUser.sub,
      }),
    );
    // The snapshot row written by the transaction is re-read for the response.
    expect(result.id).toBe(sampleInvoiceRow.id);
  });

  it('prefers explicit input rate and currency over workspace settings', async () => {
    const { service } = createService('admin');
    const { insertValuesSpy } = stageCreateDb(service, {
      settings: [{ defaultHourlyRate: 75, currency: 'EUR' }],
    });

    await service.createInvoice(adminUser, {
      title: 'Explicit Values',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      discountPercent: 33.33,
      hourlyRate: 120,
      currency: 'GBP',
    });

    expect(insertValuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        hourlyRate: 120,
        currency: 'GBP',
        discountPercent: 33.33,
      }),
    );
  });

  it('links eligible entries to the created invoice inside the transaction', async () => {
    const { service } = createService('admin');
    const { insertSpy, insertReturningSpy, updateSetSpy, transactionSpy } =
      stageCreateDb(service, {
        settings: [{ defaultHourlyRate: 75, currency: 'USD' }],
        eligibleEntries: [
          {
            id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9020',
          },
        ],
      });

    await service.createInvoice(adminUser, {
      title: 'Linked Entries',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      discountPercent: 0,
    });

    // Insert happens before the entry-linking update, all within one tx.
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertReturningSpy).toHaveBeenCalledTimes(1);
    expect(updateSetSpy).toHaveBeenCalledWith({
      invoiceId: createdInvoiceId,
    });
    expect(insertSpy.mock.invocationCallOrder[0]).toBeLessThan(
      updateSetSpy.mock.invocationCallOrder[0],
    );
    expect(transactionSpy).toHaveBeenCalledTimes(1);
  });

  it('allows PMs to create for a public project without an assignment', async () => {
    const { service } = createService('pm');
    const { insertValuesSpy, selectSpy, probeStage } = stageCreateDb(service, {
      settings: [{ defaultHourlyRate: 75, currency: 'USD' }],
      // Access probe matches: the public project row satisfies visibility.
      projectProbeRows: [{ id: pmProjectId }],
      // Project-scoped creation wires the eligibility inArray subquery.
      eligibilitySubquery: true,
    });

    const result = await service.createInvoice(pmUser, {
      title: 'Public Project',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      discountPercent: 0,
      projectId: pmProjectId,
    });

    expect(result).toBeDefined();
    // Access probe + settings + eligibility subquery.
    expect(selectSpy).toHaveBeenCalledTimes(3);
    // The access probe condition requires a visible project: public
    // visibility or a matching assignment row for this PM.
    const probeText = collectSqlText(probeStage?.where.mock.calls[0]?.[0]);
    expect(probeText).toContain('public');
    expect(probeText).toContain(pmUser.sub);
    expect(insertValuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: pmProjectId,
        status: 'draft',
        createdBy: pmUser.sub,
        hourlyRate: 75,
        currency: 'USD',
      }),
    );
  });

  it('rejects PMs creating for an inactive project', async () => {
    const { service } = createService('pm');
    const { transactionSpy, insertValuesSpy, probeStage } = stageCreateDb(
      service,
      {
        settings: [{ defaultHourlyRate: 75, currency: 'USD' }],
        // Access probe finds no active+visible project row.
        projectProbeRows: [],
      },
    );

    await expect(
      service.createInvoice(pmUser, {
        title: 'Inactive Project',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        discountPercent: 0,
        projectId: pmProjectId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    // The probe condition requires an active project.
    const probeText = collectSqlText(probeStage?.where.mock.calls[0]?.[0]);
    expect(probeText).toContain('true');
    expect(transactionSpy).not.toHaveBeenCalled();
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('rejects admins creating for a project outside the workspace', async () => {
    const { service } = createService('admin');
    const { transactionSpy, insertValuesSpy } = stageCreateDb(service, {
      settings: [{ defaultHourlyRate: 75, currency: 'USD' }],
      // Workspace probe finds no such project row.
      projectProbeRows: [],
    });

    await expect(
      service.createInvoice(adminUser, {
        title: 'Unknown Project',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        discountPercent: 0,
        projectId: filterProjectId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(transactionSpy).not.toHaveBeenCalled();
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  // ── Update immutability of snapshot fields ────────────────────────────

  it('updates only editable fields and never touches snapshot totals', async () => {
    const { service } = createService('admin');
    const { updateSetSpy } = stageUpdateDb(service);

    const result = await service.updateInvoice(adminUser, sampleInvoiceRow.id, {
      status: 'sent',
      notes: 'Updated notes',
    });

    expect(result).toEqual({ id: sampleInvoiceRow.id });
    expect(updateSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'sent',
        notes: 'Updated notes',
        updatedAt: expect.any(Date),
      }),
    );
    // Verify snapshot fields are NOT in the update.
    const setCallArg = updateSetSpy.mock.calls[0][0];
    expect(setCallArg).not.toHaveProperty('totalHours');
    expect(setCallArg).not.toHaveProperty('totalAmount');
    expect(setCallArg).not.toHaveProperty('hourlyRate');
  });

  it('does not patch the row when the update body is empty', async () => {
    const { service } = createService('admin');
    const { updateSpy, transactionSpy, txSelectSpy } = stageUpdateDb(service);

    const result = await service.updateInvoice(
      adminUser,
      sampleInvoiceRow.id,
      {},
    );

    expect(updateSpy).not.toHaveBeenCalled();
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    // Initial detail, refreshed detail, and linked entries all use the tx.
    expect(txSelectSpy).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ id: sampleInvoiceRow.id });
  });

  it('patches title only and stamps updatedAt', async () => {
    const { service } = createService('admin');
    const { updateSetSpy } = stageUpdateDb(service);

    await service.updateInvoice(adminUser, sampleInvoiceRow.id, {
      title: 'Renamed',
    });

    expect(updateSetSpy.mock.calls[0][0]).toEqual({
      title: 'Renamed',
      updatedAt: expect.any(Date),
    });
  });

  it('clears notes when notes is explicitly null', async () => {
    const { service } = createService('admin');
    const { updateSetSpy } = stageUpdateDb(service);

    await service.updateInvoice(adminUser, sampleInvoiceRow.id, {
      notes: null,
    });

    expect(updateSetSpy.mock.calls[0][0]).toEqual({
      notes: null,
      updatedAt: expect.any(Date),
    });
  });

  it('rejects a stale status update when another request changed the invoice', async () => {
    const { service } = createService('admin');
    const { transactionSpy, updateReturningSpy } = stageUpdateDb(service, {
      updateResult: [],
    });

    const thrown = await service
      .updateInvoice(adminUser, sampleInvoiceRow.id, { status: 'sent' })
      .then(
        () => null,
        (error: unknown) => error,
      );

    expect(thrown).toBeInstanceOf(DomainError);
    expect((thrown as DomainError).getResponse()).toMatchObject({
      code: 'invoice_update_conflict',
    });
    expect((thrown as DomainError).getStatus()).toBe(409);
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    expect(updateReturningSpy).toHaveBeenCalledTimes(1);
  });

  it('fails the transaction when the updated invoice cannot be refreshed', async () => {
    const { service } = createService('admin');
    const { transactionSpy, updateReturningSpy, txSelectSpy } = stageUpdateDb(
      service,
      { refreshedRow: null },
    );

    await expect(
      service.updateInvoice(adminUser, sampleInvoiceRow.id, {
        title: 'Renamed',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(transactionSpy).toHaveBeenCalledTimes(1);
    expect(updateReturningSpy).toHaveBeenCalledTimes(1);
    // Initial and refreshed detail reads run in the transaction; linked
    // entries are not read after the refresh failure.
    expect(txSelectSpy).toHaveBeenCalledTimes(2);
  });

  it('throws NotFound when the updated invoice does not exist', async () => {
    const { service } = createService('admin');
    const { updateSpy, transactionSpy } = stageUpdateDb(service, {
      initialRow: null,
    });

    await expect(
      service.updateInvoice(adminUser, '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9999', {
        status: 'paid',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(updateSpy).not.toHaveBeenCalled();
    expect(transactionSpy).toHaveBeenCalledTimes(1);
  });

  it('denies PM updates to workspace-wide invoices (null project)', async () => {
    const { service } = createService('pm');
    const { updateSpy } = stageUpdateDb(service, {
      initialRow: {
        ...sampleInvoiceRow,
        projectId: null,
        projectName: null,
      },
    });

    await expect(
      service.updateInvoice(pmUser, sampleInvoiceRow.id, { status: 'paid' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(updateSpy).not.toHaveBeenCalled();
  });

  // ── Delete ────────────────────────────────────────────────────────────

  it('throws NotFound when the deleted invoice does not exist', async () => {
    const { service } = createService('admin');
    const deleteSpy = vi.fn();
    Object.defineProperty(service, 'findInvoiceOrThrow', {
      value: vi.fn().mockImplementation(() => {
        throw new NotFoundException('Invoice not found');
      }),
    });
    Object.defineProperty(service, 'db', {
      value: { delete: deleteSpy },
    });

    await expect(
      service.deleteInvoice(adminUser, '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9999'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('deletes the found invoice by id for admins', async () => {
    const { service } = createService('admin');
    const deleteReturningSpy = vi
      .fn()
      .mockResolvedValue([{ id: sampleInvoiceRow.id }]);
    const deleteWhereSpy = vi.fn().mockReturnValue({
      returning: deleteReturningSpy,
    });
    const deleteSpy = vi.fn().mockReturnValue({ where: deleteWhereSpy });
    Object.defineProperty(service, 'findInvoiceOrThrow', {
      value: vi.fn().mockResolvedValue(sampleInvoiceRow),
    });
    Object.defineProperty(service, 'db', {
      value: { delete: deleteSpy },
    });

    await expect(
      service.deleteInvoice(adminUser, sampleInvoiceRow.id),
    ).resolves.toBeUndefined();

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith(invoices);
    expect(deleteWhereSpy).toHaveBeenCalledTimes(1);
    // The draft-only lock must live inside the DELETE predicate so a
    // concurrent PATCH cannot slip between the check and the delete.
    const whereArg = deleteWhereSpy.mock.calls[0]?.[0];
    expect(collectSqlText(whereArg)).toContain('draft');
  });

  it('rejects deletion of a sent invoice', async () => {
    const { service } = createService('admin');
    // The guarded DELETE matches zero rows for a non-draft invoice.
    const deleteReturningSpy = vi.fn().mockResolvedValue([]);
    const deleteWhereSpy = vi.fn().mockReturnValue({
      returning: deleteReturningSpy,
    });
    const deleteSpy = vi.fn().mockReturnValue({ where: deleteWhereSpy });
    Object.defineProperty(service, 'findInvoiceOrThrow', {
      value: vi.fn().mockResolvedValue({ ...sampleInvoiceRow, status: 'sent' }),
    });
    Object.defineProperty(service, 'db', {
      value: { delete: deleteSpy },
    });

    const thrown = await service
      .deleteInvoice(adminUser, sampleInvoiceRow.id)
      .then(
        () => null,
        (error: unknown) => error,
      );

    expect(thrown).toBeInstanceOf(DomainError);
    expect((thrown as DomainError).getResponse()).toMatchObject({
      code: 'invoice_not_deletable',
      message: expect.stringContaining('sent'),
    });
    expect((thrown as DomainError).getStatus()).toBe(409);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects deletion of a paid invoice', async () => {
    const { service } = createService('admin');
    const deleteReturningSpy = vi.fn().mockResolvedValue([]);
    const deleteWhereSpy = vi.fn().mockReturnValue({
      returning: deleteReturningSpy,
    });
    const deleteSpy = vi.fn().mockReturnValue({ where: deleteWhereSpy });
    Object.defineProperty(service, 'findInvoiceOrThrow', {
      value: vi.fn().mockResolvedValue({ ...sampleInvoiceRow, status: 'paid' }),
    });
    Object.defineProperty(service, 'db', {
      value: { delete: deleteSpy },
    });

    const thrown = await service
      .deleteInvoice(adminUser, sampleInvoiceRow.id)
      .then(
        () => null,
        (error: unknown) => error,
      );

    expect(thrown).toBeInstanceOf(DomainError);
    expect((thrown as DomainError).getResponse()).toMatchObject({
      code: 'invoice_not_deletable',
      message: expect.stringContaining('paid'),
    });
    expect((thrown as DomainError).getStatus()).toBe(409);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects deletion when status changed concurrently', async () => {
    // The read sees a draft invoice, but the atomic DELETE matches zero
    // rows because a concurrent PATCH flipped the status in between —
    // exactly the race the guarded predicate closes.
    const { service } = createService('admin');
    const deleteReturningSpy = vi.fn().mockResolvedValue([]);
    const deleteWhereSpy = vi.fn().mockReturnValue({
      returning: deleteReturningSpy,
    });
    const deleteSpy = vi.fn().mockReturnValue({ where: deleteWhereSpy });
    Object.defineProperty(service, 'findInvoiceOrThrow', {
      value: vi.fn().mockResolvedValue(sampleInvoiceRow), // draft
    });
    Object.defineProperty(service, 'db', {
      value: { delete: deleteSpy },
    });

    const thrown = await service
      .deleteInvoice(adminUser, sampleInvoiceRow.id)
      .then(
        () => null,
        (error: unknown) => error,
      );

    expect(thrown).toBeInstanceOf(DomainError);
    expect((thrown as DomainError).getResponse()).toMatchObject({
      code: 'invoice_not_deletable',
      message: expect.stringContaining('changed concurrently'),
    });
    expect((thrown as DomainError).getStatus()).toBe(409);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  // ── PM access to invoices ─────────────────────────────────────────────

  it('denies PM access to workspace-wide invoices (null project)', async () => {
    const { service } = createService('pm');
    Object.defineProperty(service, 'findInvoiceOrThrow', {
      value: vi.fn().mockResolvedValue({
        ...sampleInvoiceRow,
        projectId: null,
        projectName: null,
      }),
    });

    await expect(
      service.getInvoice(pmUser, sampleInvoiceRow.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows PMs to read project-scoped invoices for visible projects', async () => {
    const { service } = createService('pm');
    // Call order: detail lookup, PM project probe, linked entries.
    const selectSpy = vi.fn();
    selectSpy.mockImplementationOnce(() =>
      makeSelectChain('limit', [sampleInvoiceRow]),
    );
    selectSpy.mockImplementationOnce(() =>
      makeSelectChain('limit', [{ id: sampleInvoiceRow.projectId }]),
    );
    selectSpy.mockImplementationOnce(() => makeSelectChain('orderBy', []));
    Object.defineProperty(service, 'db', {
      value: { select: selectSpy },
    });

    const result = await service.getInvoice(pmUser, sampleInvoiceRow.id);

    expect(result.id).toBe(sampleInvoiceRow.id);
    expect(result.status).toBe('draft');
    expect(result.project?.name).toBe('Project Orion');
    expect(result.timeEntryCount).toBe(0);
  });

  it('throws NotFound for cross-workspace invoice access', async () => {
    const { service } = createService('admin');
    Object.defineProperty(service, 'findInvoiceOrThrow', {
      value: vi.fn().mockImplementation(() => {
        throw new NotFoundException('Invoice not found');
      }),
    });

    await expect(
      service.getInvoice(adminUser, '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9999'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
