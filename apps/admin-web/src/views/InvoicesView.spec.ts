import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';
import type { InvoiceResponse } from '@gitiempo/shared';

import { useAuthStore } from '@/stores/auth';

const testMocks = vi.hoisted(() => ({
  createInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
  errorToast: vi.fn(),
  listInvoices: vi.fn(),
  listProjects: vi.fn(),
  requireConfirmation: vi.fn(),
  successToast: vi.fn(),
  updateInvoice: vi.fn(),
}));

vi.mock('@/services/admin-invoices-client', () => ({
  adminInvoicesClient: {
    createInvoice: testMocks.createInvoice,
    deleteInvoice: testMocks.deleteInvoice,
    getInvoice: vi.fn(),
    listInvoices: testMocks.listInvoices,
    updateInvoice: testMocks.updateInvoice,
  },
}));

vi.mock('@/services/admin-projects-client', () => ({
  adminProjectsClient: {
    listProjects: testMocks.listProjects,
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

import InvoicesView from './InvoicesView.vue';

const validUuid = '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001';

function createInvoice(
  overrides: Partial<InvoiceResponse> = {},
): InvoiceResponse {
  return {
    id: validUuid,
    workspaceId: validUuid,
    projectId: validUuid,
    title: 'INV-2026-041',
    status: 'draft',
    dateFrom: '2027-03-01',
    dateTo: '2027-03-31',
    hourlyRate: 120,
    currency: 'USD',
    discountPercent: 5,
    totalHours: 106.67,
    totalAmount: 12800,
    notes: 'Net 30',
    createdBy: validUuid,
    createdAt: '2027-04-01T10:00:00.000Z',
    updatedAt: '2027-04-01T10:00:00.000Z',
    project: { id: validUuid, name: 'Project Orion' },
    createdByUser: {
      id: validUuid,
      email: 'admin@example.com',
      displayName: 'Admin',
      avatarUrl: null,
    },
    timeEntryCount: 5,
    ...overrides,
  };
}

function createProject() {
  return {
    color: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    defaultBillableForTasks: true,
    description: null,
    id: validUuid,
    isActive: true,
    members: [],
    name: 'Project Orion',
    source: 'manual',
    totalSeconds: 0,
    updatedAt: '2026-05-01T10:00:00.000Z',
    visibility: 'public',
    workspaceId: '33333333-3333-4333-8333-333333333333',
  };
}

const InvoicesTableStub = {
  name: 'InvoicesTable',
  emits: ['create-invoice', 'open-invoice', 'update:filters'],
  props: {
    emptyDescription: { type: String, required: true },
    filters: { type: Object, required: true },
    isMobileViewport: { type: Boolean, required: true },
    loading: { type: Boolean, required: true },
    projectFilterOptions: { type: Array, required: true },
    rows: { type: Array, required: true },
    statusFilterOptions: { type: Array, required: true },
  },
  template: '<div data-testid="invoices-table-stub" />',
};

const InvoiceDialogStub = {
  name: 'InvoiceDialog',
  props: {
    visible: { type: Boolean, default: false },
    mode: { type: String, default: 'create' },
    invoice: { type: Object, default: null },
    projects: { type: Array, default: () => [] },
    saving: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    deleting: { type: Boolean, default: false },
  },
  emits: [
    'update:visible',
    'create',
    'update-invoice',
    'send-invoice',
    'mark-paid',
    'delete-invoice',
  ],
  template: '<div data-testid="invoice-dialog-stub" />',
};

const ManagementPageSkeletonStub = {
  name: 'ManagementPageSkeleton',
  props: { variant: { type: String, required: true } },
  template: '<div data-testid="invoices-skeleton" />',
};

const RequestErrorCardStub = {
  name: 'RequestErrorCard',
  props: {
    message: { type: String, required: true },
    title: { type: String, required: true },
  },
  emits: ['retry'],
  template: '<div data-testid="invoices-error"><button @click="$emit(\'retry\')">Try again</button></div>',
};

const StatCardStub = {
  name: 'StatCard',
  props: {
    label: { type: String, required: true },
    value: { type: [Number, String], required: true },
    description: { type: String, default: undefined },
  },
  template: '<div data-testid="stat-card">{{ label }}: {{ value }}</div>',
};

const SurfaceCardStub = {
  name: 'SurfaceCard',
  template: '<div><slot /></div>',
};

const invoicesViewStubs = {
  InvoicesTable: InvoicesTableStub,
  InvoiceDialog: InvoiceDialogStub,
  ManagementPageSkeleton: ManagementPageSkeletonStub,
  RequestErrorCard: RequestErrorCardStub,
  StatCard: StatCardStub,
  SurfaceCard: SurfaceCardStub,
};

function setupAuthStore(
  pinia: ReturnType<typeof createPinia>,
  role: 'admin' | 'pm' = 'admin',
) {
  const authStore = useAuthStore(pinia);
  authStore.accessToken = `${role}-access-token`;
  authStore.bootstrapComplete = true;
  authStore.profile = {
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    displayName: 'Admin User',
    email: 'admin@example.com',
    id: validUuid,
    role,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  return authStore;
}

function mountInvoicesView(role: 'admin' | 'pm' = 'admin') {
  const pinia = createPinia();
  setActivePinia(pinia);
  setupAuthStore(pinia, role);

  return mount(InvoicesView, {
    global: {
      plugins: [[PrimeVue, giTiempoPrimeVueOptions], pinia],
      stubs: invoicesViewStubs,
    },
  });
}

function mockListInvoicesSuccess(invoices: InvoiceResponse[] = []) {
  testMocks.listInvoices.mockResolvedValue({
    items: invoices,
    meta: {
      page: 1,
      limit: 100,
      total: invoices.length,
      totalPages: invoices.length > 0 ? 1 : 0,
    },
  });
}

function mockListProjectsSuccess(projects: unknown[] = []) {
  testMocks.listProjects.mockResolvedValue(projects);
}

describe('InvoicesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    testMocks.createInvoice.mockReset();
    testMocks.deleteInvoice.mockReset();
    testMocks.errorToast.mockReset();
    testMocks.listInvoices.mockReset();
    testMocks.listProjects.mockReset();
    testMocks.requireConfirmation.mockReset();
    testMocks.successToast.mockReset();
    testMocks.updateInvoice.mockReset();
  });

  it('renders the skeleton state before the first load resolves', async () => {
    const invoicesRequest = vi.fn(
      () => new Promise<never>(() => undefined),
    );
    testMocks.listInvoices.mockImplementation(invoicesRequest);
    testMocks.listProjects.mockResolvedValue([]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    expect(wrapper.find('[data-testid="invoices-skeleton"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="invoices-table-stub"]').exists()).toBe(false);
  });

  it('renders stat cards, the invoices table, and the dialog after a successful load', async () => {
    const invoice = createInvoice();
    mockListInvoicesSuccess([invoice]);
    mockListProjectsSuccess([createProject()]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    expect(wrapper.find('[data-testid="invoices-skeleton"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="invoices-error"]').exists()).toBe(false);

    const statCards = wrapper.findAll('[data-testid="stat-card"]');
    expect(statCards).toHaveLength(3);
    expect(statCards[0]?.text()).toContain('Open Invoices');
    expect(statCards[1]?.text()).toContain('Billed This Month');
    expect(statCards[2]?.text()).toContain('Drafts');

    expect(wrapper.find('[data-testid="invoices-table-stub"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="invoice-dialog-stub"]').exists()).toBe(true);
  });

  it('renders a request-error state with retry when the initial load fails', async () => {
    testMocks.listInvoices.mockRejectedValue(new Error('Network error'));
    testMocks.listProjects.mockResolvedValue([]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    expect(wrapper.find('[data-testid="invoices-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="invoices-table-stub"]').exists()).toBe(false);

    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Network error',
      expect.objectContaining({
        logContext: { action: 'load-invoices', feature: 'invoices' },
      }),
    );

    mockListInvoicesSuccess([]);
    wrapper.find('button').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="invoices-error"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="invoices-table-stub"]').exists()).toBe(true);
  });

  it('opens the create dialog when the table emits create-invoice', async () => {
    mockListInvoicesSuccess([]);
    mockListProjectsSuccess([]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent(InvoicesTableStub);
    table.vm.$emit('create-invoice');
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    expect(dialog.props('visible')).toBe(true);
    expect(dialog.props('mode')).toBe('create');
    expect(dialog.props('invoice')).toBeNull();
  });

  it('opens the edit dialog with the invoice when a row is clicked', async () => {
    const invoice = createInvoice();
    mockListInvoicesSuccess([invoice]);
    mockListProjectsSuccess([createProject()]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent(InvoicesTableStub);
    const row = { invoice, id: invoice.id };
    table.vm.$emit('open-invoice', row);
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    expect(dialog.props('visible')).toBe(true);
    expect(dialog.props('mode')).toBe('edit');
    expect(dialog.props('invoice')?.id).toBe(invoice.id);
  });

  it('creates an invoice, shows success toast, refreshes, and closes the dialog', async () => {
    const created = createInvoice({ title: 'New Invoice' });
    testMocks.createInvoice.mockResolvedValue(created);
    mockListInvoicesSuccess([]);
    mockListProjectsSuccess([]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent(InvoicesTableStub);
    table.vm.$emit('create-invoice');
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    const payload = {
      title: 'New Invoice',
      dateFrom: '2027-03-01',
      dateTo: '2027-03-31',
    };
    dialog.vm.$emit('create', payload);
    await flushPromises();

    expect(testMocks.createInvoice).toHaveBeenCalledWith(payload);
    expect(testMocks.successToast).toHaveBeenCalledWith('Invoice created.');
    expect(dialog.props('visible')).toBe(false);
  });

  it('shows an error toast and keeps the dialog open when creation fails', async () => {
    testMocks.createInvoice.mockRejectedValue(
      new Error('No eligible billable time entries found for the given criteria'),
    );
    mockListInvoicesSuccess([]);
    mockListProjectsSuccess([]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent(InvoicesTableStub);
    table.vm.$emit('create-invoice');
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    dialog.vm.$emit('create', {
      title: 'New Invoice',
      dateFrom: '2027-03-01',
      dateTo: '2027-03-31',
    });
    await flushPromises();

    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'No eligible billable time entries found for the given criteria',
      expect.objectContaining({
        logContext: { action: 'create-invoice', feature: 'invoices' },
      }),
    );
    expect(dialog.props('visible')).toBe(true);
  });

  it('sends an invoice (draft→sent), shows success toast, and closes the dialog', async () => {
    const invoice = createInvoice({ status: 'draft' });
    const sentInvoice = { ...invoice, status: 'sent' as const };
    testMocks.updateInvoice.mockResolvedValue(sentInvoice);
    mockListInvoicesSuccess([invoice]);
    mockListProjectsSuccess([createProject()]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent(InvoicesTableStub);
    table.vm.$emit('open-invoice', { invoice, id: invoice.id });
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    dialog.vm.$emit('send-invoice', invoice);
    await flushPromises();

    expect(testMocks.updateInvoice).toHaveBeenCalledWith(invoice.id, {
      status: 'sent',
    });
    expect(testMocks.successToast).toHaveBeenCalledWith('Invoice marked as sent.');
    expect(dialog.props('visible')).toBe(false);
  });

  it('marks an invoice as paid (sent→paid), shows success toast, and closes the dialog', async () => {
    const invoice = createInvoice({ status: 'sent' });
    const paidInvoice = { ...invoice, status: 'paid' as const };
    testMocks.updateInvoice.mockResolvedValue(paidInvoice);
    mockListInvoicesSuccess([invoice]);
    mockListProjectsSuccess([createProject()]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent(InvoicesTableStub);
    table.vm.$emit('open-invoice', { invoice, id: invoice.id });
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    dialog.vm.$emit('mark-paid', invoice);
    await flushPromises();

    expect(testMocks.updateInvoice).toHaveBeenCalledWith(invoice.id, {
      status: 'paid',
    });
    expect(testMocks.successToast).toHaveBeenCalledWith('Invoice marked as paid.');
    expect(dialog.props('visible')).toBe(false);
  });

  it('surfaces invalid status transition errors without closing the dialog', async () => {
    const invoice = createInvoice({ status: 'paid' });
    testMocks.updateInvoice.mockRejectedValue(
      new Error("Cannot transition invoice from 'paid' to 'sent'"),
    );
    mockListInvoicesSuccess([invoice]);
    mockListProjectsSuccess([createProject()]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent(InvoicesTableStub);
    table.vm.$emit('open-invoice', { invoice, id: invoice.id });
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    dialog.vm.$emit('send-invoice', invoice);
    await flushPromises();

    expect(testMocks.errorToast).toHaveBeenCalledWith(
      "Cannot transition invoice from 'paid' to 'sent'",
      expect.objectContaining({
        logContext: { action: 'transition-invoice-sent', feature: 'invoices' },
      }),
    );
    expect(dialog.props('visible')).toBe(true);
  });

  it('updates invoice fields, shows success toast, and closes the dialog', async () => {
    const invoice = createInvoice({ status: 'draft' });
    const updated = { ...invoice, title: 'Updated Title' };
    testMocks.updateInvoice.mockResolvedValue(updated);
    mockListInvoicesSuccess([invoice]);
    mockListProjectsSuccess([createProject()]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent(InvoicesTableStub);
    table.vm.$emit('open-invoice', { invoice, id: invoice.id });
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    dialog.vm.$emit('update-invoice', invoice, { title: 'Updated Title' });
    await flushPromises();

    expect(testMocks.updateInvoice).toHaveBeenCalledWith(invoice.id, {
      title: 'Updated Title',
    });
    expect(testMocks.successToast).toHaveBeenCalledWith('Invoice updated.');
    expect(dialog.props('visible')).toBe(false);
  });

  it('confirms deletion, shows success toast, refreshes, and closes the dialog for admin users', async () => {
    const invoice = createInvoice();
    testMocks.deleteInvoice.mockResolvedValue(undefined);
    testMocks.requireConfirmation.mockImplementation(
      (_message: string, _header: string, _label: string, accept: () => void) => {
        accept();
      },
    );
    // Initial load returns the invoice; after delete, refresh returns empty.
    testMocks.listInvoices
      .mockResolvedValueOnce({
        items: [invoice],
        meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        items: [],
        meta: { page: 1, limit: 100, total: 0, totalPages: 0 },
      });
    mockListProjectsSuccess([createProject()]);

    const wrapper = mountInvoicesView('admin');
    await flushPromises();

    const table = wrapper.findComponent(InvoicesTableStub);
    table.vm.$emit('open-invoice', { invoice, id: invoice.id });
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    expect(dialog.props('visible')).toBe(true);

    dialog.vm.$emit('delete-invoice', invoice);
    await flushPromises();

    expect(testMocks.requireConfirmation).toHaveBeenCalled();
    expect(testMocks.deleteInvoice).toHaveBeenCalledWith(invoice.id);
    expect(testMocks.successToast).toHaveBeenCalledWith('Invoice deleted.');
    // Dialog closes after the invoice disappears from the refreshed list.
    expect(dialog.props('visible')).toBe(false);
  });

  it('keeps the dialog open when delete confirmation is cancelled', async () => {
    const invoice = createInvoice();
    testMocks.requireConfirmation.mockImplementation(() => undefined);
    mockListInvoicesSuccess([invoice]);
    mockListProjectsSuccess([createProject()]);

    const wrapper = mountInvoicesView('admin');
    await flushPromises();

    const table = wrapper.findComponent(InvoicesTableStub);
    table.vm.$emit('open-invoice', { invoice, id: invoice.id });
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    dialog.vm.$emit('delete-invoice', invoice);
    await flushPromises();

    expect(testMocks.deleteInvoice).not.toHaveBeenCalled();
    expect(dialog.props('visible')).toBe(true);
  });

  it('keeps the delete button hidden for PM users', async () => {
    const invoice = createInvoice();
    mockListInvoicesSuccess([invoice]);
    mockListProjectsSuccess([createProject()]);

    const wrapper = mountInvoicesView('pm');
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    expect(dialog.props('isAdmin')).toBe(false);
  });

  it('does not call delete when PM emits delete-invoice (guard in composable)', async () => {
    const invoice = createInvoice();
    mockListInvoicesSuccess([invoice]);
    mockListProjectsSuccess([createProject()]);

    const wrapper = mountInvoicesView('pm');
    await flushPromises();

    const table = wrapper.findComponent(InvoicesTableStub);
    table.vm.$emit('open-invoice', { invoice, id: invoice.id });
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    dialog.vm.$emit('delete-invoice', invoice);
    await flushPromises();

    expect(testMocks.requireConfirmation).not.toHaveBeenCalled();
    expect(testMocks.deleteInvoice).not.toHaveBeenCalled();
  });

  it('surfaces delete errors and shows error toast', async () => {
    const invoice = createInvoice();
    testMocks.deleteInvoice.mockRejectedValue(new Error('Invoice not found'));
    testMocks.requireConfirmation.mockImplementation(
      (_message: string, _header: string, _label: string, accept: () => void) => {
        accept();
      },
    );
    mockListInvoicesSuccess([invoice]);
    mockListProjectsSuccess([createProject()]);

    const wrapper = mountInvoicesView('admin');
    await flushPromises();

    const table = wrapper.findComponent(InvoicesTableStub);
    table.vm.$emit('open-invoice', { invoice, id: invoice.id });
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    dialog.vm.$emit('delete-invoice', invoice);
    await flushPromises();

    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Invoice not found',
      expect.objectContaining({
        logContext: { action: 'delete-invoice', feature: 'invoices' },
      }),
    );
    // Dialog stays open because the invoice is still in the list.
    expect(dialog.props('visible')).toBe(true);
  });

  it('applies filter updates from the table', async () => {
    mockListInvoicesSuccess([]);
    mockListProjectsSuccess([]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent(InvoicesTableStub);
    table.vm.$emit('update:filters', { global: 'search term' });
    await flushPromises();

    expect(table.props('filters').global).toBe('search term');
  });

  it('passes projects to the dialog for the create form', async () => {
    const project = createProject();
    mockListInvoicesSuccess([]);
    mockListProjectsSuccess([project]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    const dialog = wrapper.findComponent(InvoiceDialogStub);
    expect(dialog.props('projects')).toHaveLength(1);
  });

  it('loads all invoice pages when the backend paginates', async () => {
    const page1Items = [createInvoice({ id: 'inv-1' })];
    const page2Items = [createInvoice({ id: 'inv-2', title: 'INV-002' })];

    testMocks.listInvoices
      .mockResolvedValueOnce({
        items: page1Items,
        meta: { page: 1, limit: 100, total: 2, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        items: page2Items,
        meta: { page: 2, limit: 100, total: 2, totalPages: 2 },
      })
      .mockResolvedValue({
        items: [...page1Items, ...page2Items],
        meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
      });
    mockListProjectsSuccess([]);

    const wrapper = mountInvoicesView();
    await flushPromises();

    expect(testMocks.listInvoices).toHaveBeenCalledTimes(2);
    const table = wrapper.findComponent(InvoicesTableStub);
    expect(table.props('rows')).toHaveLength(2);
  });
});