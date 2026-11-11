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

const testMocks = vi.hoisted(() => ({
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
    vi.stubGlobal('URL', {createObjectURL:vi.fn(()=> 'blob:invoice'),revokeObjectURL:vi.fn()});
    testMocks.deleteInvoice.mockReset();
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
    expect(wrapper.get('[data-testid="invoice-delete"]').text()).toBe(
      'Delete invoice',
    );
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

    await wrapper.find('[data-testid="invoice-delete"]').trigger('click');
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
    testMocks.getInvoice.mockResolvedValue(createInvoice({revision:8,status:'sent'}));
    await editor.find('[data-testid="invoice-create-submit"]').trigger('click');await flushPromises();
    expect(editor.findAllComponents(InputText)[0]!.props('modelValue')).toBe('Unsaved title');
    await editor.findAll('button').find(button=>button.text()==='Refresh latest revision')!.trigger('click');await flushPromises();
    await editor.find('[data-testid="invoice-create-submit"]').trigger('click');await flushPromises();
    expect(testMocks.updateInvoice).toHaveBeenLastCalledWith(invoiceId,expect.objectContaining({title:'Unsaved title',expectedRevision:8}));
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
});
