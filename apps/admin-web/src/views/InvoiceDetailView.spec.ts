import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import InvoiceCreateDialog from '@/components/invoices/InvoiceCreateDialog.vue';
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

const BrowserURL = URL;

const testMocks = vi.hoisted(() => ({
  createInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
  moveInvoices: vi.fn(),
  listGroups: vi.fn(),
  listEligibleEntries:vi.fn(),
  previewInvoice:vi.fn(),
  request: vi.fn(),
  errorToast: vi.fn(),
  getInvoice: vi.fn(),
  invoiceId: '22222222-2222-4222-8222-222222222222',
  routeParams:{id:'22222222-2222-4222-8222-222222222222'},
  requireConfirmation: vi.fn(),
  routerPush: vi.fn(),
  successToast: vi.fn(),
  updateInvoice: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof VueRouter>();

  return {
    ...actual,
    useRoute: () => ({ params: testMocks.routeParams }),
    useRouter: () => ({ push: testMocks.routerPush }),
  };
});

vi.mock('@/services/admin-invoices-client', () => ({
  adminInvoicesClient: {
    createInvoice: testMocks.createInvoice,
    deleteInvoice: testMocks.deleteInvoice,
    moveInvoices:testMocks.moveInvoices,
    listGroups:testMocks.listGroups,
    listEligibleEntries:testMocks.listEligibleEntries,
    previewInvoice:testMocks.previewInvoice,
    downloadInvoicePdf: testMocks.request,
    getInvoice: testMocks.getInvoice,
    updateInvoice: testMocks.updateInvoice,
  },
}));

vi.mock('@/services/api-client', () => ({getAuthenticatedAppApiClient:()=>({request:testMocks.request})}));
vi.mock('@/services/admin-projects-client',()=>({adminProjectsClient:{listProjects:vi.fn().mockResolvedValue([])}}));
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
import { reconcileInvoiceDraft, savedDraft } from '@/lib/invoice-edit';

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
    canViewInvoices: true,
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
    timeDisplayMode: 'entries',
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

function mountInvoiceDetailView(role: WorkspaceRoleFixture = 'admin',actualEditor=false) {
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
        Teleport: true,
        InvoiceCreateDialog: !actualEditor,
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
    testMocks.routeParams=reactive({id:invoiceId});
    vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
    testMocks.request.mockResolvedValue({blob:()=>Promise.resolve(new Blob(['pdf']))});
    vi.stubGlobal('URL', Object.assign(class extends BrowserURL {}, {createObjectURL:vi.fn(()=> 'blob:invoice'),revokeObjectURL:vi.fn()}));
    testMocks.deleteInvoice.mockReset();
    testMocks.createInvoice.mockReset();
    testMocks.errorToast.mockReset();
    testMocks.getInvoice.mockReset();
    testMocks.requireConfirmation.mockReset();
    testMocks.routerPush.mockReset();
    testMocks.successToast.mockReset();
    testMocks.updateInvoice.mockReset();

    testMocks.getInvoice.mockResolvedValue(createInvoice());
    testMocks.updateInvoice.mockResolvedValue(createInvoice());
    testMocks.listEligibleEntries.mockResolvedValue({entries:[createTimeEntrySummary()],count:1,totalHours:2.5,defaultHourlyRate:80,defaultCurrency:'USD',defaultRoundingStepMinutes:1});
    testMocks.previewInvoice.mockResolvedValue({entries:[createTimeEntrySummary()],count:1,totalHours:2.5,subtotal:200,discountAmount:0,totalAmount:200,currency:'USD'});
    testMocks.deleteInvoice.mockResolvedValue(undefined);
    testMocks.moveInvoices.mockResolvedValue(undefined);
    testMocks.listGroups.mockResolvedValue({groups:[{id:'group-a',name:'Retainers',count:1}],allCount:1,ungroupedCount:0});
  });

  it.each([false, true])('renders saved tasks from multiple workers without entry details (mobile=%s)', async mobile => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({matches: mobile, addEventListener: vi.fn(), removeEventListener: vi.fn()})));
    const rows = [createTimeEntrySummary({roundedDurationSeconds: 36000}), createTimeEntrySummary({id: '88888888-8888-4888-8888-888888888888', userName: 'Sam', roundedDurationSeconds: 25200})];
    testMocks.getInvoice.mockResolvedValue(createInvoice({timeDisplayMode: 'tasks', timeEntries: rows, timeEntryCount: 2, totalHours: 17}));
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    const work = wrapper.get('[data-testid="invoice-time-entries"]');
    expect(work.text()).toContain('Included tasks');
    expect(work.text()).toContain('17h');
    expect(work.text()).not.toContain('Alex Admin');
    expect(work.text()).not.toContain('Sam');
    expect(work.text()).not.toContain('API work');
    expect(work.text()).not.toContain('15 Apr 2026');
    expect(wrapper.find('[data-testid="invoice-tasks-cards"]').exists()).toBe(mobile);
    expect(wrapper.find('[data-testid="invoice-tasks-table"]').exists()).toBe(!mobile);
    expect(wrapper.find('[data-testid="invoice-time-entries-table"]').exists()).toBe(false);
    const tasks = mobile ? work.findAll('li') : work.findAll('tbody tr');
    expect(tasks).toHaveLength(1);
    wrapper.unmount();
  });

  it.each([false, true])('renders empty saved Task work without changing the zero totals (mobile=%s)', async mobile => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({matches: mobile, addEventListener: vi.fn(), removeEventListener: vi.fn()})));
    testMocks.getInvoice.mockResolvedValue(createInvoice({timeDisplayMode: 'tasks', timeEntries: [], timeEntryCount: 0, totalHours: 0, totalAmount: 0}));
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    expect(wrapper.get('[data-testid="invoice-time-entries"]').text()).toContain('Included tasks');
    expect(wrapper.get('[data-testid="invoice-time-entries-empty"]').text()).toContain('No time entries linked');
    expect(wrapper.get('[data-testid="invoice-total"]').text()).toContain('0.00');
    expect(wrapper.find('[data-testid="invoice-tasks-table"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps the saved or locally changed display mode when reconciling revisions', () => {
    const original = createInvoice({timeDisplayMode: 'entries'});
    const local = {...savedDraft(original), timeDisplayMode: 'tasks' as const};
    const latest = createInvoice({timeDisplayMode: 'entries', notes: 'Remote edit'});
    expect(reconcileInvoiceDraft(original, local, latest)).toMatchObject({draft: {timeDisplayMode: 'tasks', notes: 'Remote edit'}, patch: {timeDisplayMode: 'tasks'}});
    expect(reconcileInvoiceDraft(original, savedDraft(original), createInvoice({timeDisplayMode: 'tasks'})).patch).toEqual({});
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

  it.each(['data:image/png;base64,YQ==', 'data:image/svg+xml;base64,PHN2Zy8+'])('renders the saved sender logo (%s)', async (logo) => {
    testMocks.getInvoice.mockResolvedValue(createInvoice({ logo }));
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    expect(wrapper.get('img[alt="Invoice sender logo"]').attributes('src')).toBe(logo);
    expect(wrapper.findAll('img[alt="Invoice sender logo"]')).toHaveLength(1);
  });

  it('omits the sender logo when the invoice has none', async () => {
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    expect(wrapper.find('img[alt="Invoice sender logo"]').exists()).toBe(false);
  });

  it('renders every summary field of the invoice', async () => {
    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    const summary = wrapper.find('[data-testid="invoice-summary"]');

    expect(summary.exists()).toBe(true);
    expect(summary.text()).toContain('Project Orion');
    expect(summary.text()).toMatch(/01.*30 Apr 2026/);
    expect(summary.text()).toContain('80.00 USD');
    expect(summary.text()).toContain('0%');
    expect(summary.text()).toContain('12.5h');
    expect(summary.text()).toContain('1,000.00 USD');
    expect(summary.text()).toContain('Rounding');
    expect(summary.text()).toContain('1 min');
    const history = wrapper.get('[data-testid="invoice-audit"]');
    expect(history.text()).toContain('01 May 2026');
    expect(history.text()).toContain('10 May 2026');
    expect(history.text()).toContain('Alex Admin');
  });

  it('renders instant timestamps in the local timezone', async () => {
    const instantFixture = '2026-05-01T23:30:00.000Z';
    const expectedLocalDate = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
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

    expect(wrapper.find('[data-testid="invoice-audit"]').text()).toContain(
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
    expect(wrapper.get('[data-testid="invoice-audit"]').text()).toContain(
      'Unknown',
    );
  });

  it('renders the linked time entries table with count and total hours', async () => {
    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    const table = wrapper.find('[data-testid="invoice-time-entries-table"]');

    expect(table.exists()).toBe(true);
    expect(wrapper.text()).toContain('Included time entries');
    expect(wrapper.text()).toContain('2 entries · 12.5h');
    expect(table.attributes('data-pc-name')).toBe('datatable');
    expect(table.findAll('th').map(cell => cell.text())).toEqual([
      'Date', 'User', 'Task / description', 'Billed duration',
    ]);
    expect(table.text()).toContain('15 Apr 2026');
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
    expect(table.text()).toContain('10m');
    expect(table.text()).not.toContain('6m');
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

  it('hides the Delete action from project managers', async () => {
    const wrapper = mountInvoiceDetailView('pm');
    await flushPromises();

    expect(wrapper.findComponent(Select).exists()).toBe(true);
    expect(wrapper.find('[data-testid="invoice-delete"]').exists()).toBe(false);
  });

  it.each(['sent', 'paid'] as const)('hides Delete for an admin viewing a %s invoice', async (status) => {
    testMocks.getInvoice.mockResolvedValue(createInvoice({ status }));
    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    expect(wrapper.find('[data-testid="invoice-detail-header"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="invoice-delete"]').exists()).toBe(false);
  });

  it('shows the reference in the header and preserves the full invoice title in its history', async () => {
    const title = 'Invoice April 2026'.repeat(10);
    testMocks.getInvoice.mockResolvedValue(
      createInvoice({ reference: 'INV-2', title }),
    );
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    expect(wrapper.get('h1').text()).toBe('INV-2');
    expect(wrapper.get('[data-testid="invoice-audit"]').text()).toContain(
      title,
    );
    expect(
      wrapper.get('[data-testid="invoice-detail-header"]').text(),
    ).toContain('My group');
    expect(
      wrapper.get('[data-testid="invoice-detail-header"]').text(),
    ).toContain('Updated 10 May 2026');
  });

  it('uses the saved-invoice ceiling for a fractional cent without displaying a negative discount at 0%', async () => {
    testMocks.getInvoice.mockResolvedValue(
      createInvoice({
        hourlyRate: 1.01,
        totalHours: 0.25,
        totalAmount: 0.26,
        discountPercent: 0,
      }),
    );
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    expect(wrapper.get('[data-testid="invoice-subtotal"]').text()).toBe(
      'Subtotal 0.26 USD',
    );
    expect(wrapper.get('[data-testid="invoice-discount"]').text()).toBe(
      '0.00 USD',
    );
    expect(wrapper.get('[data-testid="invoice-total"]').text()).toBe(
      '0.26 USD',
    );
  });

  it('renders cards with task, billed duration, date, user and description on mobile', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    const cards = wrapper.get('[data-testid="invoice-time-entries-cards"]');
    for (const field of [
      'Backend API',
      '2h 30m',
      'Alex Admin',
      '15 Apr 2026',
      'API work',
    ])
      expect(cards.text()).toContain(field);
    expect(
      wrapper.find('[data-testid="invoice-time-entries-table"]').exists(),
    ).toBe(false);
  });

  it('offers a retry on generation failure and an edit action for missing billing sections', async () => {
    const body = {
      code: 'invoice_document_incomplete',
      message: 'Complete billing sections',
      details: { missingFields: ['recipient', 'payment'] },
    };
    testMocks.request
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockRejectedValueOnce(
        new ApiError(body.message, { status: 422, code: body.code, body }),
      );
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Download PDF')!
      .trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'The invoice is saved. Retry the PDF download.',
    );
    expect(wrapper.get('[role="alert"]').text()).not.toContain(
      'Edit billing information',
    );
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Retry download')!
      .trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'recipient, payment',
    );
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Edit billing information',
    );
  });

  it('confirms the delete with the documented copy, then deletes quietly and navigates back', async () => {
    const wrapper = mountInvoiceDetailView('admin');
    await flushPromises();

    const header = wrapper.get('[data-testid="invoice-detail-header"]');
    await header.get('[data-testid="invoice-delete"]').trigger('click');
    await flushPromises();

    expect(testMocks.deleteInvoice).not.toHaveBeenCalled();

    const confirmCall = testMocks.requireConfirmation.mock.calls[0] as
      | unknown[]
      | undefined;
    expect(confirmCall).toBeDefined();
    expect(confirmCall?.[0]).toBe(
      'Linked time entries will be unlinked and become available for future invoices. The invoice will be deleted.',
    );
    expect(confirmCall?.[1]).toBe('Delete this invoice?');
    expect(confirmCall?.[2]).toBe('Delete invoice');

    getConfirmAccept()();
    await flushPromises();
    await flushPromises();

    expect(testMocks.deleteInvoice).toHaveBeenCalledWith(invoiceId);
    expect(testMocks.successToast).not.toHaveBeenCalled();
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
  it('allows a Sent invoice to return to Draft with its saved revision',async()=>{
    testMocks.getInvoice.mockResolvedValue(createInvoice({status:'sent',revision:4}));
    const wrapper=mountInvoiceDetailView();
    await flushPromises();
    wrapper.findComponent(Select).vm.$emit('update:modelValue','draft');
    await flushPromises();
    expect(testMocks.updateInvoice).toHaveBeenCalledWith(invoiceId,{status:'draft',expectedRevision:4});
  });
  it('opens the full editor and submits its captured revision',async()=>{
    testMocks.getInvoice.mockResolvedValue(createInvoice({revision:3}));
    const wrapper=mountInvoiceDetailView();await flushPromises();
    await wrapper.findAll('button').find(b=>b.text()==='Edit invoice')!.trigger('click');
    const editor=wrapper.findComponent(InvoiceCreateDialog);
    expect(editor.props('editing')).toBe(true);
    await editor.props('createMutation').createInvoice({title:'Updated',dateFrom:'2026-04-01',dateTo:'2026-04-30',discountPercent:0,timeEntryIds:[]});
    expect(testMocks.updateInvoice).toHaveBeenCalledWith(invoiceId,expect.objectContaining({expectedRevision:3,timeEntryIds:[]}));
  });
  it('moves membership through the dedicated endpoint without a business revision update',async()=>{
    testMocks.getInvoice.mockResolvedValue(createInvoice({revision:7,groupId:null}));
    const wrapper=mountInvoiceDetailView();await flushPromises();
    wrapper.findAllComponents(Select).find(select=>select.props('inputId')==='detail-group')!.vm.$emit('update:modelValue','group-a');await flushPromises();
    expect(testMocks.moveInvoices).toHaveBeenCalledWith({invoiceIds:[invoiceId],groupId:'group-a'});
    expect(testMocks.updateInvoice).not.toHaveBeenCalled();
    expect(wrapper.findComponent(InvoiceCreateDialog).props('source')?.revision).toBe(7);
  });
  it('retains concurrent sender details and includes only explicitly changed membership', () => {
    const sender = { name: 'Studio', email: 'old@example.com', address: '', taxId: '' };
    const base = createInvoice({ sender, groupId: null });
    const latest = createInvoice({ sender: { ...sender, email: 'new@example.com' }, groupId: 'remote-group' });
    const local = { ...savedDraft(base), sender: { ...sender, name: 'Edited studio' } };
    const reviewed = reconcileInvoiceDraft(base, local, latest);
    const mergedSender = { ...latest.sender, name: 'Edited studio' };
    expect(reviewed.patch).toEqual({ sender: mergedSender });
    expect(reviewed.draft.groupId).toBe('remote-group');
    expect(reviewed.conflicts).toEqual([]);
    expect(reconcileInvoiceDraft(latest, { ...reviewed.draft, groupId: null }, latest).patch)
      .toEqual({ sender: mergedSender, groupId: null });
  });

  it('retries personal groups in the open copy dialog and preserves the chosen period', async () => {
    testMocks.listGroups.mockRejectedValueOnce(new Error('Offline'));
    const wrapper = mountInvoiceDetailView();
    await flushPromises();

    const header = wrapper.get('[data-testid="invoice-detail-header"]');
    const detailGroup = header.get('#detail-group');
    expect(detailGroup.attributes('aria-disabled')).toBe('true');
    expect(header.get('#' + detailGroup.attributes('aria-labelledby')).text()).toBe('My group');
    expect(header.get('[role="alert"]').text()).toContain('Could not load personal groups');

    await header.findAll('button').find(button => button.text() === 'Create from this invoice')!.trigger('click');
    const dialog = wrapper.get('[role="dialog"]');
    const copyGroup = dialog.get('#copy-group');
    expect(dialog.get('#' + copyGroup.attributes('aria-labelledby')).text()).toBe('Personal group');
    const period = [new Date(2026, 11, 1), new Date(2026, 11, 31)];
    wrapper.getComponent(DatePicker).vm.$emit('update:modelValue', period);
    await wrapper.vm.$nextTick();

    const retryResult = createDeferred<{ groups: Array<{ id: string; name: string }> }>();
    testMocks.listGroups.mockReturnValueOnce(retryResult.promise);
    await dialog.get('[role="alert"] button').trigger('click');
    expect(copyGroup.attributes('aria-disabled')).toBe('true');
    expect(copyGroup.text()).toContain('Loading groups');
    retryResult.resolve({ groups: [{ id: 'recovered', name: 'Recovered group' }] });
    await flushPromises();
    expect(dialog.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.getComponent(DatePicker).props('modelValue')).toEqual(period);
    const select = wrapper.findAllComponents(Select).find(field => field.props('inputId') === 'copy-group')!;
    expect(select.props('options')).toContainEqual({id: 'recovered', name: 'Recovered group'});
    expect(detailGroup.attributes('aria-disabled')).toBe('false');
  });

  it('ignores a failed request from a previous workspace after the new groups load', async () => {
    let rejectOld!: (error: Error) => void;
    testMocks.listGroups.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectOld = reject; }));
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    expect(wrapper.get('#detail-group').text()).toContain('Loading groups');
    testMocks.listGroups.mockResolvedValueOnce({ groups: [{id: 'new-id', name: 'New workspace group'}] });
    useAuthStore().accessToken = 'header.' + btoa(JSON.stringify({ sub: 'user-b', role: 'admin', workspaceId: 'workspace-b' })) + '.signature';
    await flushPromises();
    rejectOld(new Error('Old workspace failed'));
    await flushPromises();
    const select = wrapper.findAllComponents(Select).find(field => field.props('inputId') === 'detail-group')!;
    expect(select.props('options')).toEqual([{ id: null, name: 'Ungrouped' }, { id: 'new-id', name: 'New workspace group' }]);
    expect(wrapper.get('[data-testid="invoice-detail-header"]').find('[role="alert"]').exists()).toBe(false);
  });

  it('opens the editor with the saved invoice when a PDF export rejects its logo', async () => {
    const message = 'Replace or remove the invalid invoice logo.';
    testMocks.request.mockRejectedValueOnce(new ApiError(message, { status: 422, code: 'invoice_logo_invalid' }));
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Download PDF')!.trigger('click');
    await flushPromises();
    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toContain(message);
    expect(alert.text()).not.toContain('Retry download');
    await alert.get('button').trigger('click');
    const editor = wrapper.getComponent(InvoiceCreateDialog);
    expect(editor.props('visible')).toBe(true);
    expect(editor.props('editing')).toBe(true);
    expect(editor.props('source')?.id).toBe(invoiceId);
  });

  it('preserves the saved membership when a move fails',async()=>{
    testMocks.moveInvoices.mockRejectedValueOnce(new Error('Move failed'));
    testMocks.getInvoice.mockResolvedValue(createInvoice({groupId:null}));
    const wrapper=mountInvoiceDetailView();await flushPromises();
    const picker=wrapper.findAllComponents(Select).find(select=>select.props('inputId')==='detail-group')!;
    picker.vm.$emit('update:modelValue','group-a');await flushPromises();
    expect(picker.props('modelValue')).toBeNull();
    expect(wrapper.text()).toContain('Move failed');
  });
  it('preserves edited fields across revision conflict and explicitly reviews a new revision before retry',async()=>{
    testMocks.getInvoice.mockResolvedValue(createInvoice({revision:7,status:'sent'}));
    testMocks.updateInvoice.mockRejectedValueOnce(new ApiError('Invoice changed',{status:409,code:'invoice_update_conflict'}));
    const wrapper=mountInvoiceDetailView('pm',true);await flushPromises();
    await wrapper.findAll('button').find(button=>button.text()==='Edit invoice')!.trigger('click');await flushPromises();
    const editor=wrapper.findComponent(InvoiceCreateDialog);
    expect(editor.findAllComponents(InputText)[0]!.props('modelValue')).toBe('April 2026 — Backend');
    await editor.findComponent('#invoice-create-title').setValue('Unsaved title');
    testMocks.getInvoice.mockResolvedValue(createInvoice({revision:8,status:'sent',title:'Remote title',notes:'Saved remotely',groupId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}));
    await editor.find('[data-testid="invoice-create-submit"]').trigger('click');await flushPromises();
    expect(editor.findAllComponents(InputText)[0]!.props('modelValue')).toBe('Unsaved title');
    await editor.findAll('button').find(button=>button.text()==='Refresh latest revision')!.trigger('click');await flushPromises();
    expect(editor.text()).toContain('Saved: Remote title');
    expect(editor.text()).toContain('Your edit: Unsaved title');
    await editor.find('[data-testid="invoice-create-submit"]').trigger('click');await flushPromises();
    expect(testMocks.updateInvoice).toHaveBeenLastCalledWith(invoiceId,{title:'Unsaved title',expectedRevision:8});
    expect(testMocks.routerPush).not.toHaveBeenCalled();
  });
  it('keeps the editor and its draft through token rotation but closes it when the workspace changes', async () => {
    const wrapper = mountInvoiceDetailView('pm', true);
    const auth = useAuthStore();
    const token = (workspaceId: string, exp: number) =>
      'header.' + btoa(JSON.stringify({ sub: 'user-a', role: 'pm', workspaceId, exp })) + '.signature';
    auth.accessToken = token('workspace-a', 1);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Edit invoice')!.trigger('click');
    const editor = wrapper.getComponent(InvoiceCreateDialog);
    await editor.getComponent('#invoice-create-title').setValue('Local edit');
    auth.accessToken = token('workspace-a', 2);
    await flushPromises();
    expect(editor.props('visible')).toBe(true);
    expect(editor.findAllComponents(InputText)[0]!.props('modelValue')).toBe('Local edit');
    auth.accessToken = token('workspace-b', 3);
    await flushPromises();
    expect(wrapper.getComponent(InvoiceCreateDialog).props('visible')).toBe(false);
  });

  it('closes a draft on route changes and prevents submitting it into the next invoice',async()=>{
    const wrapper=mountInvoiceDetailView();await flushPromises();
    await wrapper.findAll('button').find(button=>button.text()==='Edit invoice')!.trigger('click');
    const submit=wrapper.findComponent(InvoiceCreateDialog).props('createMutation').createInvoice;
    testMocks.routeParams.id='88888888-8888-4888-8888-888888888888';await flushPromises();
    expect(wrapper.findComponent(InvoiceCreateDialog).props('visible')).toBe(false);
    await expect(submit({title:'Old draft',dateFrom:'2026-04-01',dateTo:'2026-04-30',discountPercent:0})).rejects.toThrow('invoice changed');
    expect(testMocks.updateInvoice).not.toHaveBeenCalled();
  });
  it('ignores a delayed old revision conflict after another invoice editor opens',async()=>{
    let rejectUpdate!:(error:Error)=>void;
    testMocks.updateInvoice.mockReturnValueOnce(new Promise((_resolve,reject)=>{rejectUpdate=reject;}));
    const wrapper=mountInvoiceDetailView();await flushPromises();
    await wrapper.findAll('button').find(button=>button.text()==='Edit invoice')!.trigger('click');
    const pending=wrapper.findComponent(InvoiceCreateDialog).props('createMutation').createInvoice({title:'Old edit',dateFrom:'2026-04-01',dateTo:'2026-04-30',discountPercent:0}).catch(()=>undefined);
    const nextId='88888888-8888-4888-8888-888888888888';
    testMocks.getInvoice.mockResolvedValue(createInvoice({id:nextId}));
    testMocks.routeParams.id=nextId;await flushPromises();
    await wrapper.findAll('button').find(button=>button.text()==='Edit invoice')!.trigger('click');
    rejectUpdate(new ApiError('Old conflict',{status:409,code:'invoice_update_conflict'}));await pending;await flushPromises();
    expect(wrapper.findComponent(InvoiceCreateDialog).props('revisionConflict')).toBe(false);
  });
  it('reviews a new period before creating a copy', async () => {
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Create from this invoice')!
      .trigger('click');
    expect(wrapper.text()).toContain(
      'Previously billed entries are not copied',
    );
    expect(wrapper.findComponent(InvoiceCreateDialog).props('visible')).toBe(
      false,
    );
  });

  it('stays on the source after a failed copy and opens the returned invoice on a successful retry', async () => {
    const copy = createInvoice({ id: '77777777-7777-4777-8777-777777777777', reference: 'INV-2' });
    testMocks.createInvoice.mockRejectedValueOnce(new Error('Save failed')).mockResolvedValueOnce(copy);
    testMocks.getInvoice.mockResolvedValue(createInvoice({ logo: 'data:image/png;base64,AAAA' }));
    const wrapper = mountInvoiceDetailView('admin', true);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Create from this invoice')!.trigger('click');
    const picker = wrapper.getComponent(DatePicker);
    picker.vm.$emit('update:modelValue', [new Date(2026, 11, 1), new Date(2026, 11, 31)]);
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Continue to new draft')!.trigger('click');
    await flushPromises();
    const editor = wrapper.getComponent(InvoiceCreateDialog);
    const submit = editor.get('[data-testid="invoice-create-submit"]');
    await submit.trigger('click');
    await flushPromises();
    expect(testMocks.createInvoice).toHaveBeenCalledTimes(1);
    expect(editor.props('visible')).toBe(true);
    expect(testMocks.routerPush).not.toHaveBeenCalled();

    await submit.trigger('click');
    await flushPromises();
    expect(testMocks.routerPush).toHaveBeenCalledExactlyOnceWith({
      name: routeNames.invoiceDetail,
      params: { id: copy.id },
    });
    expect(editor.props('visible')).toBe(false);
    expect(testMocks.updateInvoice).not.toHaveBeenCalled();
  });
  it('cancels or confirms the copy period before continuing to an independent draft', async () => {
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Create from this invoice')!.trigger('click');
    const picker = wrapper.getComponent(DatePicker);
    const range = [new Date(2026, 11, 1), new Date(2026, 11, 31)];
    await picker.get('input').trigger('click');
    picker.vm.$emit('update:modelValue', range);
    await wrapper.get('[data-testid="date-picker-cancel"]').trigger('click');
    expect(picker.props('modelValue')).toBeNull();
    expect(wrapper.find('[data-testid="date-picker-confirm"]').exists()).toBe(false);
    await picker.get('input').trigger('click');
    picker.vm.$emit('update:modelValue', range);
    await wrapper.get('[data-testid="date-picker-confirm"]').trigger('click');
    expect(picker.props('modelValue')).toEqual(range);
    expect(wrapper.find('[data-testid="date-picker-confirm"]').exists()).toBe(false);
    await wrapper.findAll('button').find(button => button.text() === 'Continue to new draft')!.trigger('click');
    expect(wrapper.getComponent(InvoiceCreateDialog).props('source')).toMatchObject({dateFrom:'2026-12-01',dateTo:'2026-12-31'});
    expect(wrapper.getComponent(InvoiceCreateDialog).props('visible')).toBe(true);
  });

  it('offers PDF download in every invoice status', async () => {
    testMocks.getInvoice.mockResolvedValue(createInvoice({ status: 'paid' }));
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    expect(
      wrapper.findAll('button').some((b) => b.text() === 'Download PDF'),
    ).toBe(true);
    expect(wrapper.findComponent(Select).props('options')).toEqual([
      { label: 'Draft', value: 'draft' },
      { label: 'Sent', value: 'sent' },
      { label: 'Paid', value: 'paid' },
    ]);
  });
  it('reconciles independently edited dates and flags competing due date edits', () => {
    const base = createInvoice({ issueDate:'2026-03-01', dueDate:'2026-03-10' });
    const local = { ...savedDraft(base), dueDate:'2026-03-20' };
    const remote = createInvoice({ issueDate:'2026-03-02', dueDate:'2026-03-15' });
    const reviewed = reconcileInvoiceDraft(base, local, remote);
    expect(reviewed.patch).toEqual({ dueDate:'2026-03-20' });
    expect(reviewed.draft.issueDate).toBe('2026-03-02');
    expect(reviewed.conflicts).toEqual([expect.stringContaining('dueDate')]);
    expect(reconcileInvoiceDraft(base,savedDraft(base),base).patch).toEqual({});
  });

  it('displays saved dates and a card link without inactive bank details', async () => {
    testMocks.getInvoice.mockResolvedValue(createInvoice({issueDate:'2026-03-01',dueDate:'2026-03-20',payment:{method:'Card',terms:'Net 19',provider:'Stripe',beneficiary:'Hidden beneficiary',account:'Hidden account',swift:'Hidden SWIFT',instructions:'Pay invoice',paymentUrl:'https://pay.example.test/invoice'}}));
    const wrapper = mountInvoiceDetailView();
    await flushPromises();
    expect(wrapper.text()).toContain('01 Mar 2026');
    expect(wrapper.text()).toContain('20 Mar 2026');
    expect(wrapper.get('a[href="https://pay.example.test/invoice"]').text()).toBe('Pay online');
    expect(wrapper.text()).not.toContain('Hidden account');
    expect(wrapper.text()).not.toContain('Hidden beneficiary');
    expect(wrapper.text()).not.toContain('Hidden SWIFT');
  });

});
