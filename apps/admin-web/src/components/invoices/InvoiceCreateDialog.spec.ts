import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import DatePicker from 'primevue/datepicker';
import DataTable from 'primevue/datatable';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateInvoiceInput,
  EligibleEntriesResponse,
  InvoiceResponse,
  InvoiceTimeEntrySummary,
} from '@gitiempo/shared';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';
import { ApiError } from '@gitiempo/web-shared/http';
import { ref } from 'vue';

import { createTestQueryPlugin } from '@/test/query-client';

const testMocks = vi.hoisted(() => ({
  listEligibleEntries: vi.fn(),
}));

vi.mock('@/services/admin-invoices-client', () => ({
  adminInvoicesClient: {
    listEligibleEntries: testMocks.listEligibleEntries,
  },
}));

import InvoiceCreateDialog from './InvoiceCreateDialog.vue';

const workspaceId = '44444444-4444-4444-8444-444444444444';
const projectId = '11111111-1111-4111-8111-111111111111';
const billingProjectId = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';
const invoiceId = '55555555-5555-4555-8555-555555555555';

const PROJECT_OPTIONS = [
  { id: projectId, name: 'Project Orion' },
  { id: billingProjectId, name: 'Billing API' },
];

function createTimeEntry(
  overrides: Partial<InvoiceTimeEntrySummary> = {},
): InvoiceTimeEntrySummary {
  return {
    description: 'Backend API implementation',
    durationSeconds: 9000,
    endedAt: '2026-04-15T11:30:00.000Z',
    id: '66666666-6666-4666-8666-666666666666',
    isBillable: true,
    startedAt: '2026-04-15T09:00:00.000Z',
    taskId: '77777777-7777-4777-8777-777777777777',
    taskName: 'Backend API',
    userId,
    userName: 'Alex Admin',
    ...overrides,
  };
}

function createEntriesResponse(
  overrides: Partial<EligibleEntriesResponse> = {},
): EligibleEntriesResponse {
  return {
    count: 1,
    defaultCurrency: 'USD',
    defaultHourlyRate: 80,
    entries: [createTimeEntry()],
    totalHours: 2.5,
    ...overrides,
  };
}

function createInvoiceResponse(): InvoiceResponse {
  return {
    id: invoiceId,
    workspaceId,
    projectId,
    title: 'Website redesign',
    status: 'draft',
    dateFrom: '2026-04-01',
    dateTo: '2026-04-30',
    hourlyRate: 80,
    currency: 'USD',
    discountPercent: 0,
    totalHours: 2.5,
    totalAmount: 200,
    notes: null,
    createdBy: userId,
    createdByName: 'Alex Admin',
    timeEntryCount: 1,
    timeEntries: [createTimeEntry()],
    project: { id: projectId, name: 'Project Orion' },
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  };
}

interface MountDialogOptions {
  isAdmin?: boolean;
  projects?: Array<{ id: string; name: string }>;
  createInvoice?: (input: CreateInvoiceInput) => Promise<InvoiceResponse>;
}

function createCreateInvoiceSpy(
  outcome: 'success' | 'domain-error' = 'success',
): (input: CreateInvoiceInput) => Promise<InvoiceResponse> {
  return vi.fn((input: CreateInvoiceInput): Promise<InvoiceResponse> =>
    outcome === 'success'
      ? Promise.resolve(createInvoiceResponse())
      : Promise.reject(
          new ApiError('Please provide an hourly rate or currency', {
            code: 'invoice_rate_required',
            status: 422,
          }),
        ),
  );
}

async function mountDialog(options: MountDialogOptions = {}) {
  const isAdmin = options.isAdmin ?? true;
  const createInvoice =
    options.createInvoice ?? createCreateInvoiceSpy();

  const wrapper = mount(InvoiceCreateDialog, {
    global: {
      plugins: [
        [PrimeVue, giTiempoPrimeVueOptions],
        createTestQueryPlugin(),
      ],
    },
    props: {
      visible: false,
      isAdmin,
      projects: options.projects ?? PROJECT_OPTIONS,
      scope: {
        role: isAdmin ? 'admin' : 'pm',
        userId: 'user-1',
        workspaceId,
      },
      createMutation: {
        createInvoice,
        isCreating: ref(false),
      },
    },
  });

  // PrimeVue Dialog only mounts its content when visibility transitions to true.
  await wrapper.setProps({ visible: true });
  await flushPromises();
  return wrapper;
}

type MountedDialog = Awaited<ReturnType<typeof mountDialog>>;

function getSubmitButton(wrapper: MountedDialog) {
  return wrapper.getComponent('[data-testid="invoice-create-submit"]');
}

async function enterDateRange(wrapper: MountedDialog): Promise<void> {
  await wrapper
    .findComponent(DatePicker)
    .vm.$emit('update:modelValue', [
      new Date(2026, 3, 1),
      new Date(2026, 3, 30),
    ]);
  await flushPromises();
}

async function submitInvoice(wrapper: MountedDialog): Promise<void> {
  await getSubmitButton(wrapper).trigger('click');
  await flushPromises();
}

function bodyText(): string {
  return document.body.textContent ?? '';
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('InvoiceCreateDialog', () => {
  beforeEach(() => {
    testMocks.listEligibleEntries.mockReset();
    // PrimeVue Select/DatePicker call matchMedia from mounted hooks; jsdom
    // does not implement it.
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: '',
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );
  });

  it('renders all seven form fields and the create actions when opened', async () => {
    const wrapper = await mountDialog();

    for (const label of [
      'Title',
      'Project',
      'Date range',
      'Hourly rate',
      'Currency',
      'Discount',
      'Notes',
    ]) {
      expect(bodyText()).toContain(label);
    }
    expect(wrapper.findComponent(Select).exists()).toBe(true);
    expect(wrapper.findComponent(DatePicker).exists()).toBe(true);
    expect(wrapper.findAllComponents(InputNumber)).toHaveLength(2);
    expect(wrapper.findComponent(Textarea).exists()).toBe(true);

    expect(
      document.querySelector<HTMLInputElement>('#invoice-create-title')
        ?.placeholder,
    ).toBe('Invoice title');
    expect(
      document.querySelector<HTMLInputElement>('#invoice-create-hourly-rate')
        ?.placeholder,
    ).toBe('From workspace settings');
    expect(
      document.querySelector<HTMLInputElement>('#invoice-create-currency')
        ?.placeholder,
    ).toBe('Auto');
    expect(
      document.querySelector<HTMLTextAreaElement>('#invoice-create-notes')
        ?.placeholder,
    ).toBe('Add notes...');

    expect(bodyText()).toContain('Cancel');
    expect(bodyText()).toContain('Create invoice');
    expect(
      wrapper.findComponent('[data-testid="invoice-create-cancel"]').exists(),
    ).toBe(true);
    expect(getSubmitButton(wrapper).attributes('type')).toBe('button');
  });

  it('fires the eligible-entries preview when the date range is entered', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(
      createEntriesResponse({
        count: 2,
        totalHours: 5,
        entries: [
          createTimeEntry(),
          createTimeEntry({
            id: '88888888-8888-4888-8888-888888888888',
          }),
        ],
      }),
    );

    const wrapper = await mountDialog();
    expect(testMocks.listEligibleEntries).not.toHaveBeenCalled();

    await enterDateRange(wrapper);

    expect(testMocks.listEligibleEntries).toHaveBeenCalledTimes(1);
    expect(testMocks.listEligibleEntries).toHaveBeenCalledWith({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId: undefined,
    });
    expect(bodyText()).toContain('2 entries');
    expect(bodyText()).toContain('5h');
    expect(bodyText()).toContain('$400.00');

    const rateInput = document.querySelector<HTMLInputElement>(
      '#invoice-create-hourly-rate',
    );
    expect(rateInput?.value).toBe('80');
    const currencyInput = document.querySelector<HTMLInputElement>(
      '#invoice-create-currency',
    );
    expect(currencyInput?.value).toBe('USD');

    // The entries table stays collapsed until the header row is toggled.
    expect(wrapper.findComponent(DataTable).exists()).toBe(false);
  });

  it('expands the preview table with entry date, user, duration, and description', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());

    const wrapper = await mountDialog();
    await enterDateRange(wrapper);

    // The toggle is a raw teleported button, so it is driven from the DOM.
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="invoice-create-preview-toggle"]',
      )
      ?.click();
    await flushPromises();

    const table = wrapper.findComponent(DataTable);
    expect(table.exists()).toBe(true);
    expect(bodyText()).toContain('Apr 15, 2026');
    expect(bodyText()).toContain('Alex Admin');
    expect(bodyText()).toContain('2h 30m');
    expect(bodyText()).toContain('Backend API implementation');
  });

  it('warns and keeps create enabled when the preview has no entries', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(
      createEntriesResponse({
        count: 0,
        defaultCurrency: null,
        defaultHourlyRate: null,
        entries: [],
        totalHours: 0,
      }),
    );

    const wrapper = await mountDialog();
    await enterDateRange(wrapper);

    expect(bodyText()).toContain(
      'No billable entries found for this project and date range',
    );
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeUndefined();
  });

  it('blocks submit for a PM until a project is selected', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({ isAdmin: false, createInvoice });

    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');
    await enterDateRange(wrapper);

    // The preview only fires once the PM's required project is chosen.
    expect(testMocks.listEligibleEntries).not.toHaveBeenCalled();

    await submitInvoice(wrapper);

    expect(createInvoice).not.toHaveBeenCalled();
    expect(wrapper.emitted('created')).toBeUndefined();
    expect(wrapper.emitted('update:visible')).toBeUndefined();
    expect(bodyText()).toContain('Select a project.');
  });

  it('creates a workspace-wide invoice when an admin leaves the project empty', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({ isAdmin: true, createInvoice });

    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');
    await enterDateRange(wrapper);

    await submitInvoice(wrapper);

    expect(createInvoice).toHaveBeenCalledTimes(1);
    expect(createInvoice).toHaveBeenCalledWith({
      title: 'Website redesign',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId: undefined,
      hourlyRate: 80,
      currency: 'USD',
      discountPercent: 0,
      notes: undefined,
    });
    expect(wrapper.emitted('created')).toEqual([[createInvoiceResponse()]]);
    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });

  it('keeps the dialog open with inputs preserved on a 422 domain error', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = createCreateInvoiceSpy('domain-error');
    const wrapper = await mountDialog({ isAdmin: true, createInvoice });

    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');
    await enterDateRange(wrapper);

    await submitInvoice(wrapper);

    expect(createInvoice).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('created')).toBeUndefined();
    expect(wrapper.emitted('update:visible')).toBeUndefined();

    const titleInput = document.querySelector<HTMLInputElement>(
      '#invoice-create-title',
    );
    expect(titleInput?.value).toBe('Website redesign');
  });
});