import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import type * as VueRouter from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  InvoiceResponse,
  InvoiceTimeEntrySummary,
} from '@gitiempo/shared';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';
import { ApiError } from '@gitiempo/web-shared/http';

import { routeNames } from '@/constants/routes';
import { createTestQueryPlugin } from '@/test/query-client';
import { useAuthStore } from '@/stores/auth';

const testMocks = vi.hoisted(() => ({
  deleteInvoice: vi.fn(),
  errorToast: vi.fn(),
  getInvoice: vi.fn(),
  invoiceId: '22222222-2222-4222-8222-222222222222',
  requireConfirmation: vi.fn(),
  routerPush: vi.fn(),
  successToast: vi.fn(),
  updateInvoice: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof VueRouter>();

  return {
    ...actual,
    useRoute: () => ({ params: { id: testMocks.invoiceId } }),
    useRouter: () => ({ push: testMocks.routerPush }),
  };
});

vi.mock('@/services/admin-invoices-client', () => ({
  adminInvoicesClient: {
    deleteInvoice: testMocks.deleteInvoice,
    getInvoice: testMocks.getInvoice,
    updateInvoice: testMocks.updateInvoice,
  },
}));

vi.mock('@/composables/feedback/useConfirmation', () => ({
  useConfirmation: () => ({
    requireConfirmation: testMocks.requireConfirmation,
  }),
}));

vi.mock('@/composables/feedback/useToasts', () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
    successToast: testMocks.successToast,
  }),
}));

import InvoiceDetailView from './InvoiceDetailView.vue';

const invoiceId = testMocks.invoiceId;
const workspaceId = '44444444-4444-4444-8444-444444444444';
const projectId = '11111111-1111-4111-8111-111111111111';
const userId = '33333333-3333-4333-8333-333333333333';
const timeEntryId = '55555555-5555-4555-8555-555555555555';
const taskId = '66666666-6666-4666-8666-666666666666';

type WorkspaceRoleFixture = 'admin' | 'pm';

function createDeferred<T>() {
  const deferred = {} as {
    promise: Promise<T>;
    resolve: (..._args: [T]) => void;
  };

  deferred.promise = new Promise<T>((res) => {
    deferred.resolve = res;
  });

  return deferred;
}

function createProfile(role: WorkspaceRoleFixture) {
  return {
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    displayName: 'Alex Admin',
    email: 'alex@example.com',
    id: userId,
    role,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createTimeEntrySummary(
  overrides: Partial<InvoiceTimeEntrySummary> = {},
): InvoiceTimeEntrySummary {
  return {
    description: 'API work',
    durationSeconds: 9000,
    roundedDurationSeconds: 9000,
    endedAt: '2026-04-15T11:30:00.000Z',
    id: timeEntryId,
    isBillable: true,
    startedAt: '2026-04-15T09:00:00.000Z',
    taskId,
    taskName: 'Backend API',
    userId,
    userName: 'Alex Admin',
    ...overrides,
  };
}

function createInvoice(
  overrides: Partial<InvoiceResponse> = {},
): InvoiceResponse {
  return {
    createdAt: '2026-05-01T10:00:00.000Z',
    createdBy: userId,
    createdByName: 'Alex Admin',
    currency: 'USD',
    dateFrom: '2026-04-01',
    dateTo: '2026-04-30',
    discountPercent: 0,
    hourlyRate: 80,
    id: invoiceId,
    notes: null,
    project: { id: projectId, name: 'Project Orion' },
    projectId,
    roundingStepMinutes: 1,
    status: 'draft',
    timeEntries: [createTimeEntrySummary()],
    timeEntryCount: 2,
    title: 'April 2026 — Backend',
    totalAmount: 1000,
    totalHours: 12.5,
    updatedAt: '2026-05-10T12:00:00.000Z',
    workspaceId,
    ...overrides,
  };
}

const SkeletonStub = {
  name: 'Skeleton',
  template: '<div data-testid="skeleton" />',
};

function mountInvoiceDetailView(role: WorkspaceRoleFixture = 'admin') {
  const pinia = createPinia();
  setActivePinia(pinia);

  const authStore = useAuthStore(pinia);
  authStore.accessToken = 'access-token';
  authStore.profile = createProfile(role);

  return mount(InvoiceDetailView, {
    global: {
      plugins: [
        pinia,
        createTestQueryPlugin(),
        [PrimeVue, giTiempoPrimeVueOptions],
      ],
      stubs: {
        Skeleton: SkeletonStub,
      },
    },
  });
}

function getConfirmAccept(): () => void {
  const call = testMocks.requireConfirmation.mock.calls[0];

  expect(call).toBeDefined();

  return call[3] as () => void;
}

describe('InvoiceDetailView', () => {
  beforeEach(() => {
    testMocks.deleteInvoice.mockReset();
    testMocks.errorToast.mockReset();
    testMocks.getInvoice.mockReset();
    testMocks.requireConfirmation.mockReset();
    testMocks.routerPush.mockReset();
    testMocks.successToast.mockReset();
    testMocks.updateInvoice.mockReset();

    testMocks.getInvoice.mockResolvedValue(createInvoice());
    testMocks.updateInvoice.mockResolvedValue(createInvoice());
    testMocks.deleteInvoice.mockResolvedValue(undefined);
  });

  it('keeps the skeleton mounted until the detail request settles', async () => {
    const pendingInvoice = createDeferred<InvoiceResponse>();
    testMocks.getInvoice.mockReturnValue(pendingInvoice.promise);

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="invoice-detail-header"]').exists()).toBe(
      false,
    );

    pendingInvoice.resolve(createInvoice());
    await flushPromises();

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="invoice-detail-header"]').exists()).toBe(
      true,
    );
  });

  it('renders request errors with a retry action and recovers on retry', async () => {
    testMocks.getInvoice
      .mockRejectedValueOnce(
        new ApiError('Invoice request failed', { status: 500 }),
      )
      .mockResolvedValueOnce(createInvoice());

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    expect(wrapper.find('[data-testid="invoice-load-error"]').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain('Failed to load invoice');
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Invoice request failed',
      expect.objectContaining({
        logContext: { action: 'load-invoice', feature: 'invoices' },
      }),
    );

    const retryButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Try again');
    await retryButton?.trigger('click');
    await flushPromises();

    expect(testMocks.getInvoice).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="invoice-detail-header"]').exists()).toBe(
      true,
    );
  });

  it('renders the not-found state for a 404 response', async () => {
    testMocks.getInvoice.mockRejectedValueOnce(
      new ApiError('Invoice not found', {
        code: 'invoice_not_found',
        status: 404,
      }),
    );

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    expect(wrapper.find('[data-testid="invoice-not-found"]').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain('Invoice not found');
    expect(wrapper.find('[data-testid="invoice-detail-header"]').exists()).toBe(
      false,
    );
    expect(testMocks.errorToast).not.toHaveBeenCalled();

    const backButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Back to invoices');
    await backButton?.trigger('click');

    expect(testMocks.routerPush).toHaveBeenCalledWith({
      name: routeNames.invoices,
    });
  });

  it('renders every summary field of the invoice', async () => {
    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    const summary = wrapper.find('[data-testid="invoice-summary"]');

    expect(summary.exists()).toBe(true);
    expect(summary.text()).toContain('Project Orion');
    expect(summary.text()).toContain('Apr 1, 2026');
    expect(summary.text()).toContain('Apr 30, 2026');
    expect(summary.text()).toContain('$80.00');
    expect(summary.text()).toContain('USD');
    expect(summary.text()).toContain('0%');
    expect(summary.text()).toContain('12.5h');
    expect(summary.text()).toContain('$1,000.00');
    expect(summary.text()).toContain('May 1, 2026');
    expect(summary.text()).toContain('May 10, 2026');
    expect(summary.text()).toContain('Alex Admin');
    // The rounding step only parameterizes the computation; the detail page
    // must not surface it even though the response carries the snapshot value.
    expect(wrapper.text()).not.toContain('Rounding step');
  });

  it('renders instant timestamps in the local timezone', async () => {
    const instantFixture = '2026-05-01T23:30:00.000Z';
    const expectedLocalDate = new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(instantFixture));

    testMocks.getInvoice.mockResolvedValue(
      createInvoice({
        createdAt: instantFixture,
        timeEntries: [createTimeEntrySummary({ startedAt: instantFixture })],
        updatedAt: instantFixture,
      }),
    );

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    expect(wrapper.find('[data-testid="invoice-summary"]').text()).toContain(
      expectedLocalDate,
    );
    expect(
      wrapper.find('[data-testid="invoice-time-entries-table"]').text(),
    ).toContain(expectedLocalDate);
  });

  it('renders workspace-wide fallbacks for projectless invoices', async () => {
    testMocks.getInvoice.mockResolvedValue(
      createInvoice({
        createdByName: null,
        project: null,
        projectId: null,
      }),
    );

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    const summary = wrapper.find('[data-testid="invoice-summary"]');

    expect(summary.text()).toContain('Workspace-wide');
    expect(summary.text()).toContain('Unknown');
  });

  it('renders the linked time entries table with count and total hours', async () => {
    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    const table = wrapper.find('[data-testid="invoice-time-entries-table"]');

    expect(table.exists()).toBe(true);
    expect(wrapper.text()).toContain('Time entries (2)');
    expect(wrapper.text()).toContain('12.5h total');
    expect(table.text()).toContain('Apr 15, 2026');
    expect(table.text()).toContain('Alex Admin');
    expect(table.text()).toContain('Backend API');
    expect(table.text()).toContain('2h 30m');
    expect(table.text()).toContain('API work');
  });

  it('renders the rounded per-entry duration, not the raw tracked duration', async () => {
    testMocks.getInvoice.mockResolvedValue(
      createInvoice({
        timeEntries: [
          createTimeEntrySummary({
            durationSeconds: 360,
            roundedDurationSeconds: 600,
          }),
        ],
        timeEntryCount: 1,
      }),
    );

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    const table = wrapper.find('[data-testid="invoice-time-entries-table"]');
    expect(table.text()).toContain('0h 10m');
    expect(table.text()).not.toContain('0h 6m');
  });

  it('renders an empty state instead of the table when no entries are linked', async () => {
    testMocks.getInvoice.mockResolvedValue(
      createInvoice({ timeEntries: [], timeEntryCount: 0 }),
    );

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    expect(
      wrapper.find('[data-testid="invoice-time-entries-empty"]').exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain('No time entries linked to this invoice.');
    expect(
      wrapper.find('[data-testid="invoice-time-entries-table"]').exists(),
    ).toBe(false);
  });

  it('shows Mark as sent and Delete for admin users on draft invoices', async () => {
    const wrapper = mountInvoiceDetailView('admin');
    await flushPromises();

    expect(wrapper.find('[data-testid="invoice-mark-as-sent"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="invoice-delete"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="invoice-mark-as-paid"]').exists()).toBe(
      false,
    );
  });

  it('hides the Delete action from project managers', async () => {
    const wrapper = mountInvoiceDetailView('pm');
    await flushPromises();

    expect(wrapper.find('[data-testid="invoice-mark-as-sent"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="invoice-delete"]').exists()).toBe(false);
  });

  it('shows only Mark as paid for project managers on sent invoices', async () => {
    testMocks.getInvoice.mockResolvedValue(createInvoice({ status: 'sent' }));

    const wrapper = mountInvoiceDetailView('pm');
    await flushPromises();

    expect(wrapper.find('[data-testid="invoice-mark-as-paid"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="invoice-mark-as-sent"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="invoice-delete"]').exists()).toBe(false);
  });

  it('shows only Mark as paid on sent invoices', async () => {
    testMocks.getInvoice.mockResolvedValue(createInvoice({ status: 'sent' }));

    const wrapper = mountInvoiceDetailView('admin');
    await flushPromises();

    expect(wrapper.find('[data-testid="invoice-mark-as-paid"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="invoice-mark-as-sent"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="invoice-delete"]').exists()).toBe(false);
  });

  it('renders no status action buttons on paid invoices', async () => {
    testMocks.getInvoice.mockResolvedValue(createInvoice({ status: 'paid' }));

    const wrapper = mountInvoiceDetailView('admin');
    await flushPromises();

    expect(wrapper.find('[data-testid="invoice-mark-as-sent"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="invoice-mark-as-paid"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="invoice-delete"]').exists()).toBe(false);
  });

  it('keeps the header title truncated and status actions visible for long unbreakable titles', async () => {
    const longTitle = 'InvoiceApril2026'.repeat(15).slice(0, 223);
    testMocks.getInvoice.mockResolvedValue(
      createInvoice({ title: longTitle }),
    );

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    const header = wrapper.find('[data-testid="invoice-detail-header"]');

    expect(header.exists()).toBe(true);
    expect(
      header.find('[data-testid="invoice-status-badge"]').exists(),
    ).toBe(true);

    const titleHeading = header.get('h1');
    expect(titleHeading.classes()).toEqual(
      expect.arrayContaining(['min-w-0', 'truncate']),
    );
    expect(titleHeading.text()).toBe(longTitle);

    const titleGroup = titleHeading.element.parentElement;
    expect(titleGroup?.classList.contains('min-w-0')).toBe(true);

    const actionsGroup = header.get('[data-testid="invoice-status-actions"]');
    expect(actionsGroup.classes()).toEqual(
      expect.arrayContaining(['shrink-0']),
    );
    expect(
      actionsGroup.find('[data-testid="invoice-mark-as-sent"]').exists(),
    ).toBe(true);
    expect(
      actionsGroup.find('[data-testid="invoice-delete"]').exists(),
    ).toBe(true);
  });

  it('prefills the edit fields from the loaded invoice', async () => {
    testMocks.getInvoice.mockResolvedValue(
      createInvoice({
        notes: 'Approved by finance',
        title: 'April 2026 — Backend (final)',
      }),
    );

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    const titleInput = wrapper.find<HTMLInputElement>('#invoice-title');
    const notesInput = wrapper.find<HTMLInputElement>('#invoice-notes');

    expect(titleInput.element.value).toBe('April 2026 — Backend (final)');
    expect(notesInput.element.value).toBe('Approved by finance');
  });

  it('saves title and notes, shows success feedback, and refreshes the detail', async () => {
    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper
      .find<HTMLInputElement>('#invoice-title')
      .setValue('April 2026 — Backend (final)');
    await wrapper
      .find<HTMLInputElement>('#invoice-notes')
      .setValue('Approved by finance');
    await wrapper.find('[data-testid="invoice-save"]').trigger('click');
    await flushPromises();
    await flushPromises();

    expect(testMocks.updateInvoice).toHaveBeenCalledWith(invoiceId, {
      notes: 'Approved by finance',
      title: 'April 2026 — Backend (final)',
    });
    expect(testMocks.successToast).toHaveBeenCalledWith('Invoice updated');
    expect(testMocks.getInvoice).toHaveBeenCalledTimes(2);
  });

  it('sends null notes when the notes field is cleared', async () => {
    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper.find<HTMLInputElement>('#invoice-notes').setValue('');
    await wrapper.find('[data-testid="invoice-save"]').trigger('click');
    await flushPromises();

    expect(testMocks.updateInvoice).toHaveBeenCalledWith(invoiceId, {
      notes: null,
      title: 'April 2026 — Backend',
    });
  });

  it('surfaces save failures without treating the request as successful', async () => {
    testMocks.updateInvoice.mockRejectedValue(
      new ApiError('Title must not be empty', { status: 422 }),
    );

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper.find('[data-testid="invoice-save"]').trigger('click');
    await flushPromises();

    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Title must not be empty',
      expect.objectContaining({
        logContext: { action: 'update-invoice', feature: 'invoices' },
      }),
    );
    expect(testMocks.successToast).not.toHaveBeenCalled();
    expect(testMocks.getInvoice).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="invoice-detail-header"]').exists()).toBe(
      true,
    );
  });

  it('marks draft invoices as sent with success feedback and detail refresh', async () => {
    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper.find('[data-testid="invoice-mark-as-sent"]').trigger('click');
    await flushPromises();
    await flushPromises();

    expect(testMocks.updateInvoice).toHaveBeenCalledWith(invoiceId, {
      status: 'sent',
    });
    expect(testMocks.successToast).toHaveBeenCalledWith('Invoice updated');
    expect(testMocks.getInvoice).toHaveBeenCalledTimes(2);
  });

  it('marks sent invoices as paid with success feedback and detail refresh', async () => {
    testMocks.getInvoice.mockResolvedValue(createInvoice({ status: 'sent' }));

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper.find('[data-testid="invoice-mark-as-paid"]').trigger('click');
    await flushPromises();
    await flushPromises();

    expect(testMocks.updateInvoice).toHaveBeenCalledWith(invoiceId, {
      status: 'paid',
    });
    expect(testMocks.successToast).toHaveBeenCalledWith('Invoice updated');
    expect(testMocks.getInvoice).toHaveBeenCalledTimes(2);
  });

  it('preserves unsaved title and notes edits when Mark as sent is clicked', async () => {
    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper
      .find<HTMLInputElement>('#invoice-title')
      .setValue('April 2026 — Backend (final)');
    await wrapper
      .find<HTMLInputElement>('#invoice-notes')
      .setValue('Approved by finance');
    await wrapper.find('[data-testid="invoice-mark-as-sent"]').trigger('click');
    await flushPromises();
    await flushPromises();

    expect(testMocks.updateInvoice).toHaveBeenCalledWith(invoiceId, {
      status: 'sent',
    });
    expect(testMocks.successToast).toHaveBeenCalledWith('Invoice updated');
    expect(testMocks.getInvoice).toHaveBeenCalledTimes(2);

    const titleInput = wrapper.find<HTMLInputElement>('#invoice-title');
    const notesInput = wrapper.find<HTMLInputElement>('#invoice-notes');
    expect(titleInput.element.value).toBe('April 2026 — Backend (final)');
    expect(notesInput.element.value).toBe('Approved by finance');
  });

  it('preserves unsaved title and notes edits when Mark as paid is clicked', async () => {
    testMocks.getInvoice.mockResolvedValue(createInvoice({ status: 'sent' }));

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper
      .find<HTMLInputElement>('#invoice-title')
      .setValue('April 2026 — Backend (final)');
    await wrapper
      .find<HTMLInputElement>('#invoice-notes')
      .setValue('Approved by finance');
    await wrapper.find('[data-testid="invoice-mark-as-paid"]').trigger('click');
    await flushPromises();
    await flushPromises();

    expect(testMocks.updateInvoice).toHaveBeenCalledWith(invoiceId, {
      status: 'paid',
    });

    const titleInput = wrapper.find<HTMLInputElement>('#invoice-title');
    const notesInput = wrapper.find<HTMLInputElement>('#invoice-notes');
    expect(titleInput.element.value).toBe('April 2026 — Backend (final)');
    expect(notesInput.element.value).toBe('Approved by finance');
  });

  it('preserves unsaved edits when a status update conflicts and reloads the detail', async () => {
    const reloadedInvoice = createInvoice({
      notes: 'Server-side note after conflict',
      title: 'April 2026 — Backend (revised)',
    });
    testMocks.getInvoice
      .mockResolvedValueOnce(createInvoice())
      .mockResolvedValueOnce(reloadedInvoice);
    testMocks.updateInvoice.mockRejectedValue(
      new ApiError(
        'Invoice was modified after it was loaded. Reload to see the latest version.',
        { code: 'invoice_update_conflict', status: 409 },
      ),
    );

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper
      .find<HTMLInputElement>('#invoice-title')
      .setValue('April 2026 — Backend (final)');
    await wrapper
      .find<HTMLInputElement>('#invoice-notes')
      .setValue('Approved by finance');
    await wrapper.find('[data-testid="invoice-mark-as-sent"]').trigger('click');
    await flushPromises();
    await flushPromises();

    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'This invoice was modified by another user. Please review and try again',
      expect.objectContaining({
        logContext: { action: 'update-invoice', feature: 'invoices' },
      }),
    );
    expect(testMocks.getInvoice).toHaveBeenCalledTimes(2);

    const titleInput = wrapper.find<HTMLInputElement>('#invoice-title');
    const notesInput = wrapper.find<HTMLInputElement>('#invoice-notes');
    expect(titleInput.element.value).toBe('April 2026 — Backend (final)');
    expect(notesInput.element.value).toBe('Approved by finance');
  });

  it('clears the dirty state after Save changes succeeds so later status updates sync from the server', async () => {
    const savedInvoice = createInvoice({
      notes: 'Approved by finance',
      title: 'April 2026 — Backend (final)',
    });
    const revisedInvoice = createInvoice({
      notes: 'Revised by finance after save',
      title: 'April 2026 — Backend (revised)',
    });
    testMocks.getInvoice
      .mockResolvedValueOnce(createInvoice())
      .mockResolvedValueOnce(savedInvoice)
      .mockResolvedValueOnce(revisedInvoice);

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper
      .find<HTMLInputElement>('#invoice-title')
      .setValue('April 2026 — Backend (final)');
    await wrapper
      .find<HTMLInputElement>('#invoice-notes')
      .setValue('Approved by finance');
    await wrapper.find('[data-testid="invoice-save"]').trigger('click');
    await flushPromises();
    await flushPromises();

    expect(testMocks.updateInvoice).toHaveBeenNthCalledWith(1, invoiceId, {
      notes: 'Approved by finance',
      title: 'April 2026 — Backend (final)',
    });
    expect(testMocks.successToast).toHaveBeenCalledWith('Invoice updated');

    await wrapper.find('[data-testid="invoice-mark-as-sent"]').trigger('click');
    await flushPromises();
    await flushPromises();

    expect(testMocks.updateInvoice).toHaveBeenNthCalledWith(2, invoiceId, {
      status: 'sent',
    });

    const titleInput = wrapper.find<HTMLInputElement>('#invoice-title');
    const notesInput = wrapper.find<HTMLInputElement>('#invoice-notes');
    expect(titleInput.element.value).toBe(revisedInvoice.title);
    expect(notesInput.element.value).toBe(revisedInvoice.notes);
  });

  it('reports update conflicts, reloads the detail, and keeps the invoice rendered', async () => {
    const reloadedInvoice = createInvoice({
      title: 'April 2026 — Backend (revised)',
    });
    testMocks.getInvoice
      .mockResolvedValueOnce(createInvoice())
      .mockResolvedValueOnce(reloadedInvoice);
    testMocks.updateInvoice.mockRejectedValue(
      new ApiError(
        'Invoice was modified after it was loaded. Reload to see the latest version.',
        { code: 'invoice_update_conflict', status: 409 },
      ),
    );

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper.find('[data-testid="invoice-mark-as-sent"]').trigger('click');
    await flushPromises();
    await flushPromises();

    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'This invoice was modified by another user. Please review and try again',
      expect.objectContaining({
        logContext: { action: 'update-invoice', feature: 'invoices' },
      }),
    );
    expect(testMocks.successToast).not.toHaveBeenCalled();
    expect(testMocks.getInvoice).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="invoice-detail-header"]').exists()).toBe(
      true,
    );

    const titleInput = wrapper.find<HTMLInputElement>('#invoice-title');
    expect(titleInput.attributes('value') ?? titleInput.element.value).toBe(
      reloadedInvoice.title,
    );
  });

  it('reports invalid status transitions, reloads, and keeps the current status shown', async () => {
    testMocks.getInvoice.mockResolvedValue(createInvoice({ status: 'sent' }));
    testMocks.updateInvoice.mockRejectedValue(
      new ApiError('Cannot change the status of a sent invoice.', {
        code: 'invoice_invalid_status_transition',
        status: 409,
      }),
    );

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper.find('[data-testid="invoice-mark-as-paid"]').trigger('click');
    await flushPromises();
    await flushPromises();

    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'This status change is not allowed',
      expect.objectContaining({
        logContext: { action: 'update-invoice', feature: 'invoices' },
      }),
    );
    expect(testMocks.getInvoice).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="invoice-detail-header"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="invoice-status-badge"]').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain('Sent');
  });

  it('confirms the delete with the documented copy, then deletes, toasts, and navigates back', async () => {
    const wrapper = mountInvoiceDetailView('admin');
    await flushPromises();

    await wrapper.find('[data-testid="invoice-delete"]').trigger('click');
    await flushPromises();

    expect(testMocks.deleteInvoice).not.toHaveBeenCalled();

    const confirmCall = testMocks.requireConfirmation.mock.calls[0] as
      | unknown[]
      | undefined;
    expect(confirmCall).toBeDefined();
    expect(confirmCall?.[0]).toBe(
      'Delete this invoice? Linked time entries will be unlinked and become available for future invoices.',
    );
    expect(confirmCall?.[1]).toBe('Delete invoice?');
    expect(confirmCall?.[2]).toBe('Delete');

    getConfirmAccept()();
    await flushPromises();
    await flushPromises();

    expect(testMocks.deleteInvoice).toHaveBeenCalledWith(invoiceId);
    expect(testMocks.successToast).toHaveBeenCalledWith('Invoice deleted');
    expect(testMocks.routerPush).toHaveBeenCalledWith({
      name: routeNames.invoices,
    });
  });

  it('keeps the invoice rendered and reports the failure when a confirmed delete fails', async () => {
    testMocks.deleteInvoice.mockRejectedValue(
      new ApiError('Failed to delete invoice', { status: 500 }),
    );

    const wrapper = mountInvoiceDetailView('admin');
    await flushPromises();

    await wrapper.find('[data-testid="invoice-delete"]').trigger('click');
    await flushPromises();

    getConfirmAccept()();
    await flushPromises();

    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Failed to delete invoice',
      expect.objectContaining({
        logContext: { action: 'delete-invoice', feature: 'invoices' },
      }),
    );
    expect(testMocks.routerPush).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="invoice-detail-header"]').exists()).toBe(
      true,
    );
  });

  it('reports delete conflicts, reloads the detail, and stays on the page', async () => {
    testMocks.deleteInvoice.mockRejectedValue(
      new ApiError('Only draft invoices can be deleted.', {
        code: 'invoice_not_deletable',
        status: 409,
      }),
    );

    const wrapper = mountInvoiceDetailView('admin');
    await flushPromises();

    await wrapper.find('[data-testid="invoice-delete"]').trigger('click');
    await flushPromises();

    getConfirmAccept()();
    await flushPromises();
    await flushPromises();

    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'This invoice can no longer be deleted because its status changed',
      expect.objectContaining({
        logContext: { action: 'delete-invoice', feature: 'invoices' },
      }),
    );
    expect(testMocks.getInvoice).toHaveBeenCalledTimes(2);
    expect(testMocks.routerPush).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="invoice-detail-header"]').exists()).toBe(
      true,
    );
  });

  it('reports a 404 from a status update, reloads, and renders the not-found state', async () => {
    testMocks.getInvoice
      .mockResolvedValueOnce(createInvoice())
      .mockRejectedValueOnce(
        new ApiError('Invoice not found', {
          code: 'invoice_not_found',
          status: 404,
        }),
      );
    testMocks.updateInvoice.mockRejectedValue(
      new ApiError('Invoice not found', {
        code: 'invoice_not_found',
        status: 404,
      }),
    );

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper.find('[data-testid="invoice-mark-as-sent"]').trigger('click');
    await flushPromises();
    await flushPromises();

    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Invoice not found',
      expect.objectContaining({
        logContext: { action: 'update-invoice', feature: 'invoices' },
      }),
    );
    expect(testMocks.successToast).not.toHaveBeenCalled();
    expect(testMocks.getInvoice).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="invoice-not-found"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="invoice-detail-header"]').exists()).toBe(
      false,
    );
  });

  it('reports a 404 from a save-edits update, reloads, and renders the not-found state', async () => {
    testMocks.getInvoice
      .mockResolvedValueOnce(createInvoice())
      .mockRejectedValueOnce(
        new ApiError('Invoice not found', {
          code: 'invoice_not_found',
          status: 404,
        }),
      );
    testMocks.updateInvoice.mockRejectedValue(
      new ApiError('Invoice not found', {
        code: 'invoice_not_found',
        status: 404,
      }),
    );

    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper.find('[data-testid="invoice-save"]').trigger('click');
    await flushPromises();
    await flushPromises();

    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Invoice not found',
      expect.objectContaining({
        logContext: { action: 'update-invoice', feature: 'invoices' },
      }),
    );
    expect(testMocks.getInvoice).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="invoice-not-found"]').exists()).toBe(
      true,
    );
  });

  it('reports a 404 from a confirmed delete, reloads, and renders the not-found state', async () => {
    testMocks.getInvoice
      .mockResolvedValueOnce(createInvoice())
      .mockRejectedValueOnce(
        new ApiError('Invoice not found', {
          code: 'invoice_not_found',
          status: 404,
        }),
      );
    testMocks.deleteInvoice.mockRejectedValue(
      new ApiError('Invoice not found', {
        code: 'invoice_not_found',
        status: 404,
      }),
    );

    const wrapper = mountInvoiceDetailView('admin');
    await flushPromises();

    await wrapper.find('[data-testid="invoice-delete"]').trigger('click');
    await flushPromises();

    getConfirmAccept()();
    await flushPromises();
    await flushPromises();

    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Invoice not found',
      expect.objectContaining({
        logContext: { action: 'delete-invoice', feature: 'invoices' },
      }),
    );
    expect(testMocks.successToast).not.toHaveBeenCalled();
    expect(testMocks.routerPush).not.toHaveBeenCalled();
    expect(testMocks.getInvoice).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="invoice-not-found"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="invoice-detail-header"]').exists()).toBe(
      false,
    );
  });

  it('navigates back to the invoices list from the header back action', async () => {
    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    await wrapper.find('[data-testid="invoice-back-button"]').trigger('click');

    expect(testMocks.routerPush).toHaveBeenCalledWith({
      name: routeNames.invoices,
    });
  });
});
