import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type {
  CreateInvoiceInput,
  EligibleEntriesResponse,
  InvoiceResponse,
  InvoiceTimeEntrySummary,
} from '@gitiempo/shared';
import {
  giTiempoAnchorWidthOverlayClass,
  giTiempoPrimeVueOptions,
} from '@gitiempo/web-config/theme';
import { ApiError } from '@gitiempo/web-shared/http';
import { previewInvoiceResponseSchema } from '@gitiempo/shared';
import { ref } from 'vue';

import { createTestQueryPlugin } from '@/test/query-client';

const testMocks = vi.hoisted(() => ({
  listEligibleEntries: vi.fn(),
  getInvoiceDefaults: vi.fn(),
  listGroups: vi.fn(),
  requestJson: vi.fn(),
}));

vi.mock('@/services/admin-invoices-client', () => ({
  adminInvoicesClient: {
    listEligibleEntries: testMocks.listEligibleEntries,
    getInvoiceDefaults: testMocks.getInvoiceDefaults,
    listGroups: testMocks.listGroups,
    previewInvoice: (body: unknown) => testMocks.requestJson({ path: '/invoices/preview', body }),
  },
}));

vi.mock('@/services/api-client', () => ({
  getAuthenticatedAppApiClient: () => ({ requestJson: testMocks.requestJson }),
}));

import InvoiceCreateDialog from './InvoiceCreateDialog.vue';

const workspaceId = '44444444-4444-4444-8444-444444444444';
const projectId = '11111111-1111-4111-8111-111111111111';
const billingProjectId = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';
const invoiceId = '55555555-5555-4555-8555-555555555555';

const PROJECT_OPTIONS = [
  { id: projectId, name: 'Project Orion', timeRoundingStepMinutes: 15 },
  {
    id: billingProjectId,
    name: 'Billing API',
    timeRoundingStepMinutes: 5,
  },
];

function createTimeEntry(
  overrides: Partial<InvoiceTimeEntrySummary> = {},
): InvoiceTimeEntrySummary {
  return {
    description: 'Backend API implementation',
    durationSeconds: 9000,
    roundedDurationSeconds: 9000,
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
    defaultRoundingStepMinutes: 15,
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
    roundingStepMinutes: 15,
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
  source?: InvoiceResponse;
  editing?: boolean;
  initiallyVisible?:boolean;
  isAdmin?: boolean;
  isCreating?: boolean;
  projects?: Array<{
    id: string;
    name: string;
    timeRoundingStepMinutes: number | null;
  }>;
  createInvoice?: (input: CreateInvoiceInput) => Promise<InvoiceResponse>;
  workspaceCurrency?: string | null;
  workspaceHourlyRate?: number | null;
  workspaceRoundingStepMinutes?: number | null;
}

function createCreateInvoiceSpy(
  outcome: 'success' | 'domain-error' = 'success',
): Mock<(input: CreateInvoiceInput) => Promise<InvoiceResponse>> {
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
      visible: options.initiallyVisible ?? false,
      source: options.source,
      editing: options.editing,
      isAdmin,
      projects: options.projects ?? PROJECT_OPTIONS,
      workspaceCurrency: options.workspaceCurrency ?? null,
      workspaceHourlyRate: options.workspaceHourlyRate ?? null,
      workspaceRoundingStepMinutes:
        options.workspaceRoundingStepMinutes ?? null,
      scope: {
        role: isAdmin ? 'admin' : 'pm',
        userId: 'user-1',
        workspaceId,
      },
      createMutation: {
        createInvoice,
        isCreating: ref(options.isCreating ?? false),
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

function getSelectByInputId(wrapper: MountedDialog, inputId: string) {
  // Both selects expose a stable input-id; match by prop instead of document
  // order so reordering the form cannot silently bind to the wrong control.
  const select = wrapper
    .findAllComponents(Select)
    .find((field) => field.props('inputId') === inputId);

  if (!select) {
    throw new Error(`No Select rendered for ${inputId}`);
  }

  return select;
}

// PrimeVue renders a non-editable Select's value and placeholder inside the
// label span that carries the input-id.
function getCurrencyLabelElement(): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    '#invoice-create-currency',
  );

  if (!element) {
    throw new Error('No currency Select label rendered');
  }

  return element;
}

// PrimeVue renders a non-editable Select's value and placeholder inside the
// label span that carries the input-id.
function getRoundingStepLabelElement(): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    '#invoice-create-rounding-step',
  );

  if (!element) {
    throw new Error('No rounding step Select label rendered');
  }

  return element;
}

function getDiscountField(wrapper: MountedDialog) {
  // Select by the stable input-id instead of document order so reordering the
  // rate/currency/discount row cannot silently bind to the wrong control.
  const discountField = wrapper
    .findAllComponents(InputNumber)
    .find((field) => field.props('inputId') === 'invoice-create-discount');

  if (!discountField) {
    throw new Error('No discount InputNumber rendered');
  }

  return discountField;
}

function getRateField(wrapper: MountedDialog) {
  // Select by the stable input-id instead of document order so reordering the
  // rate/currency/discount row cannot silently bind to the wrong control.
  const rateField = wrapper
    .findAllComponents(InputNumber)
    .find((field) => field.props('inputId') === 'invoice-create-hourly-rate');

  if (!rateField) {
    throw new Error('No hourly rate InputNumber rendered');
  }

  return rateField;
}

async function enterDateRange(wrapper: MountedDialog): Promise<void> {
  await wrapper
    .findAllComponents(DatePicker).find(field => field.props('inputId') === 'invoice-create-date-range')!
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

enableAutoUnmount(afterEach);

describe('InvoiceCreateDialog', () => {
  beforeEach(() => {
    testMocks.listEligibleEntries.mockReset();
    testMocks.listGroups.mockReset().mockResolvedValue({ groups: [], allCount: 0, ungroupedCount: 0 });
    testMocks.getInvoiceDefaults.mockReset().mockResolvedValue({ billingProfile: null });
    testMocks.requestJson.mockReset().mockImplementation(async ({ body }) => {
      const hours = body.timeEntryIds.length * 2.5;
      return { currency: body.currency || 'USD', subtotal: hours * (body.hourlyRate ?? 80), discountAmount: hours * (body.hourlyRate ?? 80) * body.discountPercent / 100, totalHours: hours, totalAmount: hours * (body.hourlyRate ?? 80) * (1 - body.discountPercent / 100), timeEntryCount: body.timeEntryIds.length, entries: [] };
    });
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

  it('renders all eight form fields and the create actions when opened', async () => {
    const wrapper = await mountDialog();

    for (const label of [
      'Invoice title',
      'Project',
      'Billing period',
      'Hourly rate',
      'Currency',
      'Discount',
      'Rounding',
      'Notes',
    ]) {
      expect(bodyText()).toContain(label);
    }
    expect(wrapper.findAllComponents(Select)).toHaveLength(5);
    expect(wrapper.findAllComponents(DatePicker).find(field => field.props('inputId') === 'invoice-create-date-range')!.exists()).toBe(true);
    expect(wrapper.findAllComponents(InputNumber)).toHaveLength(2);
    expect(wrapper.findComponent(Textarea).exists()).toBe(true);
    for (const label of ['From', 'Bill to', 'Services', 'Payment', 'Personal group']) expect(bodyText()).toContain(label);

    expect(
      document.querySelector<HTMLInputElement>('#invoice-create-title')
        ?.placeholder,
    ).toBe('Invoice title');
    expect(
      document.querySelector<HTMLInputElement>('#invoice-create-hourly-rate')
        ?.placeholder,
    ).toBe('From settings');
    expect(getCurrencyLabelElement().textContent).toBe('Auto');
    // Rounding is always active, so the field starts on the 1-minute step
    // rather than a placeholder.
    expect(getRoundingStepLabelElement().textContent).toBe('1 min');
    expect(
      document.querySelector<HTMLTextAreaElement>('#invoice-create-notes')
        ?.placeholder,
    ).toBe('Add notes...');

    // Without a workspace currency the dropdown lists the Settings currency
    // options only, and the Auto placeholder keeps the workspace-default
    // fallback visible.
    expect(
      getSelectByInputId(wrapper, 'invoice-create-currency').props('options'),
    ).toEqual([
      { label: 'USD', value: 'USD' },
      { label: 'EUR', value: 'EUR' },
      { label: 'GBP', value: 'GBP' },
      { label: 'CAD', value: 'CAD' },
      { label: 'AUD', value: 'AUD' },
    ]);

    expect(
      getSelectByInputId(wrapper, 'invoice-create-rounding-step').props(
        'options',
      ),
    ).toEqual([
      { label: '1 min', value: 1 },
      { label: '5 min', value: 5 },
      { label: '10 min', value: 10 },
      { label: '15 min', value: 15 },
      { label: '30 min', value: 30 },
      { label: '60 min', value: 60 },
    ]);

    expect(bodyText()).toContain('New Draft · Reference assigned on creation');
    expect(bodyText()).toContain('Create invoice');
    expect(wrapper.getComponent(Dialog).props('closable')).toBe(true);
    expect(document.querySelectorAll('.p-dialog-footer button')).toHaveLength(1);
  });

  it('keeps the dialog and paired field rows responsive on narrow viewports', async () => {
    // jsdom cannot evaluate media queries; this test pins the responsive
    // classes per docs/ui/patterns.md instead of rendered layout.
    const wrapper = await mountDialog();

    for (const inputId of [
      'invoice-create-project',
      'invoice-create-currency',
      'invoice-create-rounding-step',
    ]) {
      expect(getSelectByInputId(wrapper, inputId).props('pt')).toMatchObject({
        overlay: { class: giTiempoAnchorWidthOverlayClass },
      });
    }

    const dialogRoot = document.querySelector('.p-dialog');
    expect(
      dialogRoot?.classList.contains('max-w-[1000px]'),
    ).toBe(true);

    const rowFor = (rowTestId: string) => {
      const row = document.querySelector(`[data-testid="${rowTestId}"]`);

      if (!row) {
        throw new Error(`No paired field row rendered for ${rowTestId}`);
      }

      return row;
    };
    const columnFor = (inputId: string) => {
      const column = document
        .querySelector(`label[for="${inputId}"]`)
        ?.parentElement;

      if (!column) {
        throw new Error(`No paired field column rendered for ${inputId}`);
      }

      return column;
    };

    for (const rowTestId of [
      'invoice-create-row-dates',
      'invoice-create-row-pricing',
    ]) {
      const row = rowFor(rowTestId);
      expect(row.classList.contains('flex-col')).toBe(true);
      expect(row.classList.contains('sm:flex-row')).toBe(true);
      expect(row.classList.contains('sm:gap-3')).toBe(true);
    }

    const hourlyRateColumn = columnFor('invoice-create-hourly-rate');
    expect(hourlyRateColumn.classList.contains('w-full')).toBe(true);
    expect(hourlyRateColumn.classList.contains('sm:flex-1')).toBe(true);

    for (const inputId of [
      'invoice-create-currency',
      'invoice-create-discount',
      'invoice-create-rounding-step',
    ]) {
      const column = columnFor(inputId);
      expect(column.classList.contains('w-full')).toBe(true);
      expect(column.classList.contains('sm:flex-1')).toBe(true);
    }
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
    expect(bodyText()).toContain('400.00 USD');

    const rateInput = document.querySelector<HTMLInputElement>(
      '#invoice-create-hourly-rate',
    );
    expect(rateInput?.value).toBe('80');
    // The preview default fills the currency select when no workspace currency
    // prop is available yet (settings query failure fallback).
    expect(getCurrencyLabelElement().textContent).toBe('USD');

    expect(wrapper.findComponent(DataTable).exists()).toBe(true);
  });

  it('shows the open preview table with date, task, description, user and billed time', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());

    const wrapper = await mountDialog();
    await enterDateRange(wrapper);


    const table = wrapper.findComponent(DataTable);
    expect(table.props('scrollable')).toBe(true);
    expect(table.props('scrollHeight')).toBeTruthy();
    expect(bodyText()).toContain('15 Apr 2026');
    expect(bodyText()).toContain('Alex Admin');
    expect(bodyText()).toContain('2h 30m');
    expect(bodyText()).toContain('Backend API · Backend API implementation');
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
      'Change the project or billing period to look for entries. You can still create an empty draft.',
    );
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeUndefined();
  });

  it('shows an error banner when the eligible-entries request fails', async () => {
    testMocks.listEligibleEntries.mockRejectedValue(
      new Error('Preview request failed'),
    );

    const wrapper = await mountDialog();
    await enterDateRange(wrapper);

    const errorBanner = document.querySelector(
      '[data-testid="invoice-create-preview-error"]',
    );
    expect(errorBanner?.textContent).toContain(
      'Failed to load eligible entries. Please try again.',
    );
  });

  it('blocks submit with field errors when the form is empty', async () => {
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({ isAdmin: true, createInvoice });

    await submitInvoice(wrapper);

    expect(bodyText()).toContain('Title is required.');
    expect(bodyText()).toContain('Date range is required.');
    expect(createInvoice).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only title as empty and keeps the field error', async () => {
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({ isAdmin: true, createInvoice });

    await wrapper.getComponent('#invoice-create-title').setValue('   ');
    await submitInvoice(wrapper);

    expect(bodyText()).toContain('Title is required.');
    expect(createInvoice).not.toHaveBeenCalled();
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

  it('submits the currency selected from the workspace settings dropdown', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({
      isAdmin: true,
      createInvoice,
      workspaceCurrency: 'EUR',
    });

    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');
    await enterDateRange(wrapper);

    const currencySelect = getSelectByInputId(wrapper, 'invoice-create-currency');

    // Selecting an option is the only way to change the currency, so the
    // previous free-text validation error can no longer occur.
    await currencySelect.vm.$emit('update:modelValue', 'GBP');
    await flushPromises();
    expect(getCurrencyLabelElement().textContent).toBe('GBP');

    // The clear affordance returns the field to the workspace-default state
    // and keeps it there even though the workspace currency prop is known.
    await currencySelect.vm.$emit('update:modelValue', undefined);
    await flushPromises();
    expect(getCurrencyLabelElement().textContent).toBe('Auto');

    await currencySelect.vm.$emit('update:modelValue', 'GBP');
    await flushPromises();

    await submitInvoice(wrapper);

    expect(createInvoice).toHaveBeenCalledTimes(1);
    expect(createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'GBP' }),
    );
  });

  it('submits without a currency when the field is cleared to the workspace default', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({
      isAdmin: true,
      createInvoice,
      workspaceCurrency: 'EUR',
    });

    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');
    await enterDateRange(wrapper);
    expect(getCurrencyLabelElement().textContent).toBe('EUR');

    await getSelectByInputId(wrapper, 'invoice-create-currency').vm.$emit(
      'update:modelValue',
      undefined,
    );
    await flushPromises();
    expect(getCurrencyLabelElement().textContent).toBe('Auto');

    await submitInvoice(wrapper);

    // Clearing submits the workspace-default signal (undefined); an empty
    // string would fail the 3-letter currency contract on the API boundary.
    expect(createInvoice).toHaveBeenCalledTimes(1);
    expect(createInvoice.mock.calls[0]?.[0]?.currency).toBeUndefined();
  });

  it('pre-selects the workspace settings currency when the dialog opens', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({
      createInvoice,
      workspaceCurrency: 'EUR',
    });

    // The prefill happens at open, before any date range triggers a preview.
    expect(testMocks.listEligibleEntries).not.toHaveBeenCalled();
    expect(getCurrencyLabelElement().textContent).toBe('EUR');

    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');
    await enterDateRange(wrapper);
    await submitInvoice(wrapper);

    expect(createInvoice).toHaveBeenCalledTimes(1);
    expect(createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'EUR' }),
    );
  });

  it('fills a late-arriving workspace currency while untouched and stops after a user edit', async () => {
    const wrapper = await mountDialog();

    // Workspace settings are still in flight when the dialog opens.
    expect(getCurrencyLabelElement().textContent).toBe('Auto');

    await wrapper.setProps({ workspaceCurrency: 'EUR' });
    await flushPromises();
    expect(getCurrencyLabelElement().textContent).toBe('EUR');

    await getSelectByInputId(wrapper, 'invoice-create-currency').vm.$emit(
      'update:modelValue',
      'GBP',
    );
    await flushPromises();

    // A later settings change must not re-select the field after a user edit.
    await wrapper.setProps({ workspaceCurrency: 'CAD' });
    await flushPromises();
    expect(getCurrencyLabelElement().textContent).toBe('GBP');
  });

  it('keeps a non-standard workspace currency selectable in the dropdown', async () => {
    const wrapper = await mountDialog({ workspaceCurrency: 'CHF' });

    expect(getCurrencyLabelElement().textContent).toBe('CHF');
    expect(
      getSelectByInputId(wrapper, 'invoice-create-currency').props('options'),
    ).toEqual([
      { label: 'CHF', value: 'CHF' },
      { label: 'USD', value: 'USD' },
      { label: 'EUR', value: 'EUR' },
      { label: 'GBP', value: 'GBP' },
      { label: 'CAD', value: 'CAD' },
      { label: 'AUD', value: 'AUD' },
    ]);
  });

  it('clears the stale auto-filled currency when the workspace setting transitions to null', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(
      createEntriesResponse({ defaultCurrency: null }),
    );
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({
      createInvoice,
      workspaceCurrency: 'EUR',
    });

    expect(getCurrencyLabelElement().textContent).toBe('EUR');

    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');
    await enterDateRange(wrapper);
    await flushPromises();

    // The setting is cleared after being known; the auto-filled value must be
    // reset so the create request does not send a currency the user never
    // entered.
    await wrapper.setProps({ workspaceCurrency: null });
    await flushPromises();

    expect(getCurrencyLabelElement().textContent).toBe('Auto');

    await submitInvoice(wrapper);

    expect(createInvoice).toHaveBeenCalledTimes(1);
    expect(createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ currency: undefined }),
    );
  });

  it('does not refill the currency from the preview default after the workspace setting is explicitly cleared', async () => {
    testMocks.listEligibleEntries
      .mockResolvedValueOnce(createEntriesResponse({ defaultCurrency: 'USD' }))
      .mockResolvedValueOnce(createEntriesResponse({ defaultCurrency: 'USD' }));
    const wrapper = await mountDialog({
      workspaceCurrency: 'EUR',
    });

    await enterDateRange(wrapper);
    await flushPromises();

    // The workspace currency is authoritative while known.
    expect(getCurrencyLabelElement().textContent).toBe('EUR');

    // After the setting is cleared, the field stays empty.
    await wrapper.setProps({ workspaceCurrency: null });
    await flushPromises();

    expect(getCurrencyLabelElement().textContent).toBe('Auto');

    // A fresh preview response arrives after the setting was known-then-cleared;
    // the workspaceCurrencyKnown guard must keep the field empty.
    await wrapper.findAllComponents(DatePicker).find(field => field.props('inputId') === 'invoice-create-date-range')!.vm.$emit('update:modelValue', [
      new Date(2026, 4, 1),
      new Date(2026, 4, 31),
    ]);
    await flushPromises();
    await flushPromises();

    expect(testMocks.listEligibleEntries).toHaveBeenCalledTimes(2);
    expect(getCurrencyLabelElement().textContent).toBe('Auto');
  });

  it('pre-fills the workspace settings hourly rate when the dialog opens', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({
      createInvoice,
      workspaceHourlyRate: 50,
    });

    // The prefill happens at open, before any date range triggers a preview.
    expect(testMocks.listEligibleEntries).not.toHaveBeenCalled();
    expect(getRateField(wrapper).props('modelValue')).toBe(50);

    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');
    await enterDateRange(wrapper);
    await submitInvoice(wrapper);

    expect(createInvoice).toHaveBeenCalledTimes(1);
    expect(createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ hourlyRate: 50 }),
    );
  });

  it('fills a late-arriving workspace hourly rate while untouched and stops after a user edit', async () => {
    const wrapper = await mountDialog();

    // Workspace settings are still in flight when the dialog opens.
    expect(getRateField(wrapper).props('modelValue')).toBeNull();

    await wrapper.setProps({ workspaceHourlyRate: 50 });
    await flushPromises();
    expect(getRateField(wrapper).props('modelValue')).toBe(50);

    await getRateField(wrapper).vm.$emit('update:modelValue', 120);
    await flushPromises();

    // A later settings change must not re-fill the field after a user edit.
    await wrapper.setProps({ workspaceHourlyRate: 75 });
    await flushPromises();
    expect(getRateField(wrapper).props('modelValue')).toBe(120);
  });

  it('keeps the workspace hourly rate when the preview refetches with a different default', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(
      createEntriesResponse({ defaultHourlyRate: 80 }),
    );
    const wrapper = await mountDialog({ workspaceHourlyRate: 50 });

    await enterDateRange(wrapper);
    await flushPromises();

    expect(testMocks.listEligibleEntries).toHaveBeenCalledTimes(1);

    // The workspace settings rate is authoritative; the preview default only
    // fills the field while the settings rate is unknown.
    expect(getRateField(wrapper).props('modelValue')).toBe(50);
  });

  it('falls back to the preview default hourly rate when workspace settings are unavailable', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(
      createEntriesResponse({ defaultHourlyRate: 80 }),
    );
    const wrapper = await mountDialog();

    await enterDateRange(wrapper);
    await flushPromises();

    expect(getRateField(wrapper).props('modelValue')).toBe(80);
  });

  it('keeps a zero workspace hourly rate instead of overriding it with the preview default', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(
      createEntriesResponse({ defaultHourlyRate: 80 }),
    );
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({
      createInvoice,
      workspaceHourlyRate: 0,
    });

    expect(getRateField(wrapper).props('modelValue')).toBe(0);

    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');
    await enterDateRange(wrapper);
    await flushPromises();

    // The preview default (80) must not overwrite the explicitly-set zero rate.
    expect(getRateField(wrapper).props('modelValue')).toBe(0);

    await submitInvoice(wrapper);

    expect(createInvoice).toHaveBeenCalledTimes(1);
    expect(createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ hourlyRate: 0 }),
    );
  });

  it('clears the stale auto-filled rate when the workspace setting transitions to null', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(
      createEntriesResponse({ defaultHourlyRate: null }),
    );
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({
      createInvoice,
      workspaceHourlyRate: 50,
    });

    expect(getRateField(wrapper).props('modelValue')).toBe(50);

    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');
    await enterDateRange(wrapper);
    await flushPromises();

    // The setting is cleared after being known; the auto-filled value must be
    // reset so the create request does not send a rate the user never entered.
    await wrapper.setProps({ workspaceHourlyRate: null });
    await flushPromises();

    expect(getRateField(wrapper).props('modelValue')).toBeNull();

    await submitInvoice(wrapper);

    expect(createInvoice).toHaveBeenCalledTimes(1);
    expect(createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ hourlyRate: undefined }),
    );
  });

  it('does not refill the rate from the preview default after the workspace setting is explicitly cleared', async () => {
    testMocks.listEligibleEntries
      .mockResolvedValueOnce(createEntriesResponse({ defaultHourlyRate: 80 }))
      .mockResolvedValueOnce(createEntriesResponse({ defaultHourlyRate: 80 }));
    const wrapper = await mountDialog({
      workspaceHourlyRate: 50,
    });

    await enterDateRange(wrapper);
    await flushPromises();

    // The workspace rate is authoritative while known.
    expect(getRateField(wrapper).props('modelValue')).toBe(50);

    // After the setting is cleared, the field stays empty even though the
    // preview still carries a non-null default.
    await wrapper.setProps({ workspaceHourlyRate: null });
    await flushPromises();

    expect(getRateField(wrapper).props('modelValue')).toBeNull();

    // A fresh preview response arrives after the setting was known-then-cleared;
    // the workspaceRateKnown guard must keep the field empty.
    await wrapper.findAllComponents(DatePicker).find(field => field.props('inputId') === 'invoice-create-date-range')!.vm.$emit('update:modelValue', [
      new Date(2026, 4, 1),
      new Date(2026, 4, 31),
    ]);
    await flushPromises();
    await flushPromises();

    expect(testMocks.listEligibleEntries).toHaveBeenCalledTimes(2);
    expect(getRateField(wrapper).props('modelValue')).toBeNull();
  });

  it('creates a project invoice when a PM selects a project', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({ isAdmin: false, createInvoice });

    await getSelectByInputId(wrapper, 'invoice-create-project').vm.$emit(
      'update:modelValue',
      projectId,
    );
    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');
    await enterDateRange(wrapper);

    await submitInvoice(wrapper);

    expect(createInvoice).toHaveBeenCalledTimes(1);
    expect(createInvoice).toHaveBeenCalledWith({
      issueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), dueDate: null,
      sender: { name: '', address: '', email: '', taxId: '' },
      recipient: { name: '', address: '', email: '', taxId: '' },
      payment: { method: '', terms: '', beneficiary: '', provider: '', account: '', instructions: '' },
      services: '', logo: null, groupId: null, timeEntryIds: [createTimeEntry().id],
      title: 'Website redesign',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId,
      hourlyRate: 80,
      currency: 'USD',
      discountPercent: 0,
      notes: null,
      roundingStepMinutes: undefined,
    });
    expect(wrapper.emitted('created')).toEqual([[createInvoiceResponse()]]);
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
      issueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), dueDate: null,
      sender: { name: '', address: '', email: '', taxId: '' },
      recipient: { name: '', address: '', email: '', taxId: '' },
      payment: { method: '', terms: '', beneficiary: '', provider: '', account: '', instructions: '' },
      services: '', logo: null, groupId: null, timeEntryIds: [createTimeEntry().id],
      title: 'Website redesign',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId: undefined,
      hourlyRate: 80,
      currency: 'USD',
      discountPercent: 0,
      notes: null,
      roundingStepMinutes: undefined,
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

  it('freezes editable fields and entry choices until a pending save settles', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    let rejectSave!: (reason: Error) => void;
    const pendingSave = new Promise<InvoiceResponse>((_, reject) => { rejectSave = reject; });
    const createInvoice = vi.fn(() => pendingSave);
    const wrapper = await mountDialog({ source: createInvoiceResponse(), editing: true, createInvoice });
    await submitInvoice(wrapper);

    const title = document.querySelector('#invoice-create-title')!;
    const checkbox = document.querySelector('#invoice-editor-entries input[type="checkbox"]')!;
    const lockedBody = title.closest('[inert]');
    expect(lockedBody).not.toBeNull();
    expect(lockedBody?.contains(checkbox)).toBe(true);
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeDefined();
    await submitInvoice(wrapper);
    expect(createInvoice).toHaveBeenCalledTimes(1);

    rejectSave(new Error('Save failed'));
    await flushPromises();
    expect(title.closest('[inert]')).toBeNull();
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeUndefined();
  });

  it('preserves line breaks when editing imported addresses and payment account details', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = createCreateInvoiceSpy();
    const source = createInvoiceResponse();
    const party = { name: 'Company', email: '', taxId: '', address: 'Studio Lane\nKyiv' };
    const payment = { method: '', terms: '', beneficiary: '', provider: '', instructions: '', account: 'Bank\nAccount' };
    const wrapper = await mountDialog({ source: { ...source, sender: party, recipient: party, payment }, editing: true, createInvoice });

    for (const caption of ['Address', 'Payment details']) {
      const fields = [...document.querySelectorAll('label')].filter(label => label.textContent?.trim() === caption);
      expect(fields).toHaveLength(caption === 'Address' ? 2 : 1);
      for (const field of fields) {
        const input = (field.querySelector('textarea') ?? document.getElementById(field.htmlFor)) as HTMLTextAreaElement;
        expect(input.value).toContain('\n');
        input.value += '.';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    await submitInvoice(wrapper);
    expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({
      sender: { ...party, address: 'Studio Lane\nKyiv.' },
      recipient: { ...party, address: 'Studio Lane\nKyiv.' },
      payment: { ...payment, account: 'Bank\nAccount.' },
    }));
  });

  it('retries personal groups without losing the title or the chosen entries', async () => {
    const entry = createTimeEntry();
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const groupId = '88888888-8888-4888-8888-888888888888';
    testMocks.listGroups.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({
      allCount: 0, ungroupedCount: 0, groups: [{ id: groupId, name: 'Retainers', count: 0 }],
    });
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({ createInvoice });
    await wrapper.getComponent('#invoice-create-title').setValue('Keep my draft');
    await enterDateRange(wrapper);
    const checkbox = wrapper.findAllComponents(Checkbox).find(field => field.props('value') === entry.id)!;
    checkbox.vm.$emit('update:modelValue', []);
    await flushPromises();
    expect(getSelectByInputId(wrapper, 'invoice-group').props('disabled')).toBe(true);
    await wrapper.findAllComponents(Button).find(button => button.attributes('aria-label') === 'Retry groups')!.trigger('click');
    await flushPromises();
    const groupSelect = getSelectByInputId(wrapper, 'invoice-group');
    expect(groupSelect.props('options')).toContainEqual(expect.objectContaining({ id: groupId, name: 'Retainers' }));
    groupSelect.vm.$emit('update:modelValue', groupId);
    await submitInvoice(wrapper);
    expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({ title: 'Keep my draft', groupId, timeEntryIds: [] }));
  });

  it('shows the in-flight state and disables closing while creating', async () => {
    const wrapper = await mountDialog({ isCreating: true });

    const submitButton = wrapper
      .findAllComponents(Button)
      .find(
        (button) =>
          button.attributes('data-testid') === 'invoice-create-submit',
      );
    expect(submitButton?.props('loading')).toBe(true);
    const dialog = wrapper.getComponent(Dialog);
    expect(dialog.props('closable')).toBe(false);
    expect(dialog.props('dismissableMask')).toBe(false);
  });

  it('binds the discount input and sends the entered percent on create', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({ isAdmin: true, createInvoice });

    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');

    // The discount InputNumber is found by its stable input-id.
    const discountField = getDiscountField(wrapper);
    await discountField.vm.$emit('update:modelValue', 15);
    await flushPromises();

    await enterDateRange(wrapper);

    // The live estimate applies the discount: 2.5h at 80 − 15%.
    expect(bodyText()).toContain('170.00 USD');

    await submitInvoice(wrapper);

    expect(createInvoice).toHaveBeenCalledTimes(1);
    expect(createInvoice).toHaveBeenCalledWith({
      issueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), dueDate: null,
      sender: { name: '', address: '', email: '', taxId: '' },
      recipient: { name: '', address: '', email: '', taxId: '' },
      payment: { method: '', terms: '', beneficiary: '', provider: '', account: '', instructions: '' },
      services: '', logo: null, groupId: null, timeEntryIds: [createTimeEntry().id],
      title: 'Website redesign',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId: undefined,
      hourlyRate: 80,
      currency: 'USD',
      discountPercent: 15,
      notes: null,
      roundingStepMinutes: undefined,
    });
  });

  it('shows the estimate from the preview default currency', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());

    const wrapper = await mountDialog();

    // Before a date range exists there is no preview and no selected currency.
    expect(getCurrencyLabelElement().textContent).toBe('Auto');

    await enterDateRange(wrapper);

    // The dropdown follows the preview's workspace default, so the estimate
    // renders the preview currency instead of an unselected empty value.
    expect(getCurrencyLabelElement().textContent).toBe('USD');
    expect(bodyText()).toContain('200.00 USD');
  });

  it('syncs rate and currency defaults from a fresh preview response after cache returns stale values', async () => {
    // First call seeds the cache with the old workspace defaults; the
    // background refetch after reopening the same date range returns the
    // updated workspace defaults.
    testMocks.listEligibleEntries
      .mockResolvedValueOnce(
        createEntriesResponse({
          defaultCurrency: 'USD',
          defaultHourlyRate: 80,
        }),
      )
      .mockResolvedValueOnce(
        createEntriesResponse({
          defaultCurrency: 'EUR',
          defaultHourlyRate: 100,
        }),
      );

    const wrapper = await mountDialog({ isAdmin: true });
    await enterDateRange(wrapper);
    await flushPromises();

    expect(testMocks.listEligibleEntries).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector<HTMLInputElement>('#invoice-create-hourly-rate')
        ?.value,
    ).toBe('80');
    expect(getCurrencyLabelElement().textContent).toBe('USD');

    // Close and reopen the dialog with the same date range. The query key is
    // unchanged, so vue-query serves the cached response first and refetches.
    await wrapper.setProps({ visible: false });
    await flushPromises();
    await wrapper.setProps({ visible: true });
    await flushPromises();
    await enterDateRange(wrapper);
    await flushPromises();
    await flushPromises();

    expect(testMocks.listEligibleEntries).toHaveBeenCalledTimes(2);
    expect(
      document.querySelector<HTMLInputElement>('#invoice-create-hourly-rate')
        ?.value,
    ).toBe('100');
    expect(getCurrencyLabelElement().textContent).toBe('EUR');
  });

  it('keeps user-entered rate and currency when the preview refetches with new defaults', async () => {
    testMocks.listEligibleEntries
      .mockResolvedValueOnce(
        createEntriesResponse({
          defaultCurrency: 'USD',
          defaultHourlyRate: 80,
        }),
      )
      .mockResolvedValueOnce(
        createEntriesResponse({
          defaultCurrency: 'EUR',
          defaultHourlyRate: 100,
        }),
      );

    const wrapper = await mountDialog({ isAdmin: true });
    await enterDateRange(wrapper);
    await flushPromises();

    // User explicitly overrides both defaults.
    const rateField = wrapper
      .findAllComponents(InputNumber)
      .find((field) => field.props('inputId') === 'invoice-create-hourly-rate');
    await rateField?.vm.$emit('update:modelValue', 120);
    await getSelectByInputId(wrapper, 'invoice-create-currency').vm.$emit(
      'update:modelValue',
      'GBP',
    );
    await flushPromises();

    // Trigger a fresh preview response (different date range → new query key).
    await wrapper
      .findAllComponents(DatePicker).find(field => field.props('inputId') === 'invoice-create-date-range')!
      .vm.$emit('update:modelValue', [
        new Date(2026, 4, 1),
        new Date(2026, 4, 31),
      ]);
    await flushPromises();
    await flushPromises();

    expect(
      document.querySelector<HTMLInputElement>('#invoice-create-hourly-rate')
        ?.value,
    ).toBe('120');
    expect(getCurrencyLabelElement().textContent).toBe('GBP');
  });

  it('pre-fills the rounding step from the preview default', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(
      createEntriesResponse({ defaultRoundingStepMinutes: 5 }),
    );
    const wrapper = await mountDialog();

    // No preview yet, so the field rests on the always-active 1-minute step.
    expect(getRoundingStepLabelElement().textContent).toBe('1 min');

    await enterDateRange(wrapper);
    await flushPromises();

    expect(getRoundingStepLabelElement().textContent).toBe('5 min');
  });

  it('updates the rounding step when the selected project changes', async () => {
    testMocks.listEligibleEntries
      .mockResolvedValueOnce(
        createEntriesResponse({ defaultRoundingStepMinutes: 5 }),
      )
      .mockResolvedValueOnce(
        createEntriesResponse({ defaultRoundingStepMinutes: 15 }),
      );

    const wrapper = await mountDialog({ isAdmin: true });
    await enterDateRange(wrapper);
    await flushPromises();

    expect(getRoundingStepLabelElement().textContent).toBe('5 min');

    await getSelectByInputId(wrapper, 'invoice-create-project').vm.$emit(
      'update:modelValue',
      projectId,
    );
    await flushPromises();
    await flushPromises();

    // The fresh preview carries the new project's effective step and the
    // field follows it because the user has not edited the field.
    expect(getRoundingStepLabelElement().textContent).toBe('15 min');
    expect(testMocks.listEligibleEntries).toHaveBeenNthCalledWith(2, {
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId,
    });
  });

  it('updates the rounding step immediately from the selected project before the preview fires', async () => {
    const wrapper = await mountDialog({
      isAdmin: true,
      workspaceRoundingStepMinutes: 1,
    });

    // No dates entered yet, so no preview has fired. The field rests on the
    // initial 1-minute default.
    expect(getRoundingStepLabelElement().textContent).toBe('1 min');

    // Selecting a project with a configured rounding step updates the field
    // instantly from the project data, without waiting for a preview response.
    await getSelectByInputId(wrapper, 'invoice-create-project').vm.$emit(
      'update:modelValue',
      projectId,
    );
    await flushPromises();

    expect(getRoundingStepLabelElement().textContent).toBe('15 min');
    expect(testMocks.listEligibleEntries).not.toHaveBeenCalled();
  });

  it('falls back to the workspace rounding step when the selected project inherits', async () => {
    const wrapper = await mountDialog({
      isAdmin: true,
      projects: [
        { id: projectId, name: 'Project Orion', timeRoundingStepMinutes: null },
      ],
      workspaceRoundingStepMinutes: 10,
    });

    await getSelectByInputId(wrapper, 'invoice-create-project').vm.$emit(
      'update:modelValue',
      projectId,
    );
    await flushPromises();

    expect(getRoundingStepLabelElement().textContent).toBe('10 min');
  });

  it('keeps the user-entered rounding step when the preview refetches', async () => {
    testMocks.listEligibleEntries
      .mockResolvedValueOnce(
        createEntriesResponse({ defaultRoundingStepMinutes: 5 }),
      )
      .mockResolvedValueOnce(
        createEntriesResponse({ defaultRoundingStepMinutes: 5 }),
      )
      .mockResolvedValueOnce(
        createEntriesResponse({ defaultRoundingStepMinutes: 5 }),
      );

    const wrapper = await mountDialog({ isAdmin: true });
    await enterDateRange(wrapper);
    await flushPromises();

    expect(getRoundingStepLabelElement().textContent).toBe('5 min');

    await getSelectByInputId(wrapper, 'invoice-create-rounding-step').vm.$emit(
      'update:modelValue',
      15,
    );
    await flushPromises();
    await flushPromises();

    // The override refetch returns the same effective default (5), but the
    // touched field must keep the user's value.
    expect(getRoundingStepLabelElement().textContent).toBe('15 min');
    expect(testMocks.listEligibleEntries).toHaveBeenNthCalledWith(2, {
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId: undefined,
      roundingStepMinutes: 15,
    });

    // A later preview refetch brings the default back again; the user value
    // still wins.
    await wrapper.findAllComponents(DatePicker).find(field => field.props('inputId') === 'invoice-create-date-range')!.vm.$emit('update:modelValue', [
      new Date(2026, 4, 1),
      new Date(2026, 4, 31),
    ]);
    await flushPromises();
    await flushPromises();

    expect(getRoundingStepLabelElement().textContent).toBe('15 min');
  });

  it('keeps the user-entered rounding step when the selected project changes', async () => {
    testMocks.listEligibleEntries
      .mockResolvedValueOnce(
        createEntriesResponse({ defaultRoundingStepMinutes: 5 }),
      )
      .mockResolvedValueOnce(
        createEntriesResponse({ defaultRoundingStepMinutes: 5 }),
      )
      .mockResolvedValueOnce(
        createEntriesResponse({ defaultRoundingStepMinutes: 15 }),
      );

    const wrapper = await mountDialog({ isAdmin: true });

    await getSelectByInputId(wrapper, 'invoice-create-project').vm.$emit(
      'update:modelValue',
      billingProjectId,
    );
    await flushPromises();

    await enterDateRange(wrapper);
    await flushPromises();

    expect(getRoundingStepLabelElement().textContent).toBe('5 min');
    expect(testMocks.listEligibleEntries).toHaveBeenNthCalledWith(1, {
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId: billingProjectId,
    });

    await getSelectByInputId(wrapper, 'invoice-create-rounding-step').vm.$emit(
      'update:modelValue',
      30,
    );
    await flushPromises();
    await flushPromises();

    expect(getRoundingStepLabelElement().textContent).toBe('30 min');
    expect(testMocks.listEligibleEntries).toHaveBeenNthCalledWith(2, {
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId: billingProjectId,
      roundingStepMinutes: 30,
    });

    // The touched flag must block both the immediate project watcher (Orion
    // is configured with 15) and the fresh preview default (15), so the
    // user's 30 survives the project switch.
    await getSelectByInputId(wrapper, 'invoice-create-project').vm.$emit(
      'update:modelValue',
      projectId,
    );
    await flushPromises();
    await flushPromises();

    expect(getRoundingStepLabelElement().textContent).toBe('30 min');
    expect(testMocks.listEligibleEntries).toHaveBeenNthCalledWith(3, {
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId,
      roundingStepMinutes: 30,
    });
  });

  it('refetches the preview with the user-selected rounding step', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(
      createEntriesResponse({ defaultRoundingStepMinutes: 5 }),
    );
    const wrapper = await mountDialog({ isAdmin: true });
    await enterDateRange(wrapper);
    await flushPromises();
    await flushPromises();

    expect(testMocks.listEligibleEntries).toHaveBeenCalledTimes(1);
    expect(testMocks.listEligibleEntries).toHaveBeenNthCalledWith(1, {
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId: undefined,
    });

    await getSelectByInputId(wrapper, 'invoice-create-rounding-step').vm.$emit(
      'update:modelValue',
      30,
    );
    await flushPromises();
    await flushPromises();

    expect(testMocks.listEligibleEntries).toHaveBeenCalledTimes(2);
    expect(testMocks.listEligibleEntries).toHaveBeenNthCalledWith(2, {
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId: undefined,
      roundingStepMinutes: 30,
    });
  });

  it('updates the preview Duration column when the rounding step changes', async () => {
    const shortEntry = (
      roundedDurationSeconds: number,
    ): InvoiceTimeEntrySummary =>
      createTimeEntry({
        durationSeconds: 360,
        roundedDurationSeconds,
        description: 'Short task',
      });

    testMocks.listEligibleEntries
      .mockResolvedValueOnce(
        createEntriesResponse({
          defaultRoundingStepMinutes: 5,
          entries: [shortEntry(600)],
          totalHours: 0.17,
        }),
      )
      .mockResolvedValueOnce(
        createEntriesResponse({
          defaultRoundingStepMinutes: 5,
          entries: [shortEntry(1800)],
          totalHours: 0.5,
        }),
      );

    const wrapper = await mountDialog({ isAdmin: true });
    await enterDateRange(wrapper);
    await flushPromises();
    await flushPromises();


    // Step 5: 360s (6 min) rounds up to 600s (10 min).
    expect(bodyText()).toContain('10m');
    expect(bodyText()).not.toContain('6m');

    await getSelectByInputId(
      wrapper,
      'invoice-create-rounding-step',
    ).vm.$emit('update:modelValue', 30);
    await flushPromises();
    await flushPromises();

    // Step 30: 360s rounds up to 1800s (30 min). The Duration column
    // re-renders from the fresh preview response.
    expect(bodyText()).toContain('30m');
    expect(bodyText()).not.toContain('10m');
  });

  it('sends the selected rounding step in the create request', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(
      createEntriesResponse({ defaultRoundingStepMinutes: 5 }),
    );
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({ isAdmin: true, createInvoice });

    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');
    await enterDateRange(wrapper);

    await getSelectByInputId(wrapper, 'invoice-create-rounding-step').vm.$emit(
      'update:modelValue',
      30,
    );
    await flushPromises();
    await flushPromises();

    await submitInvoice(wrapper);

    expect(createInvoice).toHaveBeenCalledWith({
      issueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), dueDate: null,
      sender: { name: '', address: '', email: '', taxId: '' },
      recipient: { name: '', address: '', email: '', taxId: '' },
      payment: { method: '', terms: '', beneficiary: '', provider: '', account: '', instructions: '' },
      services: '', logo: null, groupId: null, timeEntryIds: [createTimeEntry().id],
      title: 'Website redesign',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      projectId: undefined,
      hourlyRate: 80,
      currency: 'USD',
      discountPercent: 0,
      notes: null,
      roundingStepMinutes: 30,
    });
  });

  it('disables Save while recalculating a changed rate and enables it for the new total', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const wrapper = await mountDialog({ source: createInvoiceResponse(), editing: true });
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeUndefined();
    let finish!: (result: unknown) => void;
    testMocks.requestJson.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));

    getRateField(wrapper).vm.$emit('update:modelValue', 100);
    await flushPromises();
    expect(bodyText()).toContain('Calculating totals');
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeDefined();

    finish({ entries: [createTimeEntry()], timeEntryCount: 1, totalHours: 2.5, subtotal: 250, discountAmount: 0, totalAmount: 250, currency: 'USD' });
    await flushPromises();
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeUndefined();
    expect(bodyText()).toContain('250.00 USD');
  });

  it('does not save while the authoritative calculation is unresolved', async () => {
    testMocks.listEligibleEntries.mockReturnValue(
      new Promise(() => {}),
    );
    testMocks.requestJson.mockReturnValue(new Promise(() => {}));
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({
      isAdmin: true,
      createInvoice,
      workspaceRoundingStepMinutes: 15,
      workspaceCurrency: 'USD',
    });

    await wrapper
      .getComponent('#invoice-create-title')
      .setValue('Website redesign');
    await enterDateRange(wrapper);

    // The field still shows the temporary 1-minute default because the
    // preview has not arrived yet.
    expect(getRoundingStepLabelElement().textContent).toBe('1 min');
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeDefined();

    await submitInvoice(wrapper);

    expect(createInvoice).not.toHaveBeenCalled();
  });

  it('resets the rounding step and follows the preview default after reopening', async () => {
    testMocks.listEligibleEntries
      .mockResolvedValueOnce(
        createEntriesResponse({ defaultRoundingStepMinutes: 5 }),
      )
      .mockResolvedValueOnce(
        createEntriesResponse({ defaultRoundingStepMinutes: 5 }),
      )
      .mockResolvedValueOnce(
        createEntriesResponse({ defaultRoundingStepMinutes: 10 }),
      );

    const wrapper = await mountDialog({ isAdmin: true });
    await enterDateRange(wrapper);
    await flushPromises();

    await getSelectByInputId(wrapper, 'invoice-create-rounding-step').vm.$emit(
      'update:modelValue',
      15,
    );
    await flushPromises();
    await flushPromises();
    expect(getRoundingStepLabelElement().textContent).toBe('15 min');

    // Closing resets the override and the touched flag; reopening refetches
    // the same range and the fresh default wins again.
    await wrapper.setProps({ visible: false });
    await flushPromises();
    await wrapper.setProps({ visible: true });
    await flushPromises();
    await enterDateRange(wrapper);
    await flushPromises();
    await flushPromises();

    expect(getRoundingStepLabelElement().textContent).toBe('10 min');
  });
  it('selects every eligible entry when the period changes, including a cached period', async () => {
    const april = createTimeEntry();
    const may = createTimeEntry({ id: '88888888-8888-4888-8888-888888888888' });
    testMocks.listEligibleEntries.mockImplementation(async query => createEntriesResponse({
      entries: query.dateFrom === '2026-05-01' ? [may] : [april],
    }));
    const wrapper = await mountDialog();
    await enterDateRange(wrapper);
    await flushPromises();
    const included = () => wrapper.findAllComponents(Checkbox).filter(field => !field.props('binary'));
    expect(included()[0]!.props('modelValue')).toEqual([april.id]);
    included()[0]!.vm.$emit('update:modelValue', []);
    await flushPromises();
    wrapper.findAllComponents(DatePicker).find(field => field.props('inputId') === 'invoice-create-date-range')!.vm.$emit('update:modelValue', [new Date(2026, 4, 1), new Date(2026, 4, 31)]);
    await flushPromises();
    expect(included()[0]!.props('modelValue')).toEqual([may.id]);
    await enterDateRange(wrapper);
    await flushPromises();
    expect(included()[0]!.props('modelValue')).toEqual([april.id]);
  });

  it('includes newly discovered entries after a cached period refresh without restoring manual exclusions', async () => {
    const first = createTimeEntry();
    const added = createTimeEntry({ id: '88888888-8888-4888-8888-888888888888' });
    let finish!: (value: EligibleEntriesResponse) => void;
    let aprilRequests = 0;
    testMocks.listEligibleEntries.mockImplementation(async query => {
      if (query.dateFrom === '2026-05-01') return createEntriesResponse({ entries: [], count: 0 });
      aprilRequests++;
      if (aprilRequests === 1) return createEntriesResponse();
      return new Promise<EligibleEntriesResponse>(resolve => { finish = resolve; });
    });
    const wrapper = await mountDialog();
    await enterDateRange(wrapper);
    await flushPromises();
    wrapper.findAllComponents(DatePicker).find(field => field.props('inputId') === 'invoice-create-date-range')!.vm.$emit('update:modelValue', [new Date(2026, 4, 1), new Date(2026, 4, 31)]);
    await flushPromises();
    await enterDateRange(wrapper);
    await flushPromises();
    const included = () => wrapper.findAllComponents(Checkbox).filter(field => !field.props('binary'));
    expect(included()[0]!.props('modelValue')).toEqual([first.id]);
    included()[0]!.vm.$emit('update:modelValue', []);
    await flushPromises();
    finish(createEntriesResponse({ entries: [first, added], count: 2 }));
    await flushPromises();
    expect(included()[0]!.props('modelValue')).toEqual([added.id]);
  });

  it('preserves saved exclusions on edit until a different period is chosen', async () => {
    const extra = createTimeEntry({ id: '88888888-8888-4888-8888-888888888888' });
    const entries = [createTimeEntry(), extra];
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse({ entries, count: 2 }));
    const wrapper = await mountDialog({ source: createInvoiceResponse(), editing: true });
    const included = () => wrapper.findAllComponents(Checkbox).filter(field => !field.props('binary'));
    expect(included()[0]!.props('modelValue')).toEqual([entries[0]!.id]);
    wrapper.findAllComponents(DatePicker).find(field => field.props('inputId') === 'invoice-create-date-range')!.vm.$emit('update:modelValue', [new Date(2026, 4, 1), new Date(2026, 4, 31)]);
    await flushPromises();
    expect(included()[0]!.props('modelValue')).toEqual(entries.map(entry => entry.id));
  });

  it('keeps a defaults error visible after successful calculation and lets the server supply untouched defaults', async () => {
    testMocks.getInvoiceDefaults.mockRejectedValue(new Error('Unavailable'));
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({createInvoice});
    await wrapper.getComponent('#invoice-create-title').setValue('Fallback');
    await enterDateRange(wrapper);
    await flushPromises();
    expect(bodyText()).toContain('Could not load billing settings');
    await submitInvoice(wrapper);
    const submitted = createInvoice.mock.calls[0]![0];
    for (const key of ['sender', 'payment', 'logo']) expect(submitted).not.toHaveProperty(key);
  });

  it('rejects unsafe logo content even when the file uses an accepted MIME type', async () => {
    testMocks.getInvoiceDefaults.mockRejectedValue(new Error('Unavailable'));
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({createInvoice});
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Upload invoice logo"]')!;
    const unsafe = new File(['<svg><script>alert(1)</script></svg>'], 'logo.svg', {type:'image/svg+xml'});
    Object.defineProperty(input, 'files', {value:[unsafe]});
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(bodyText()).toContain('Choose a valid PNG or static SVG logo'));
    await wrapper.getComponent('#invoice-create-title').setValue('Preserve saved logo');
    await enterDateRange(wrapper);
    await submitInvoice(wrapper);
    expect(createInvoice.mock.calls[0]![0]).not.toHaveProperty('logo');
  });

  it('shows the settings logo in a new invoice and includes it when saving', async () => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const logo = 'data:image/png;base64,aGVsbG8=';
    testMocks.getInvoiceDefaults.mockResolvedValue({ billingProfile: {
      sender: { name: 'Sender', address: '', email: '', taxId: '' },
      payment: { method: 'Bank transfer', terms: '', beneficiary: '', provider: '', account: '', instructions: '' },
      logo,
    } });
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({ createInvoice });
    expect(document.querySelector('img[alt="Invoice sender logo"]')?.getAttribute('src')).toBe(logo);
    await wrapper.getComponent('#invoice-create-title').setValue('Invoice with logo');
    await enterDateRange(wrapper);
    await flushPromises();
    await submitInvoice(wrapper);
    expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({ logo }));
  });

  describe('logo when creating from a saved invoice', () => {
    const workspaceLogo = 'data:image/png;base64,d29ya3NwYWNl';
    const originalLogo = 'data:image/png;base64,c291cmNl';
    const sender = { name: 'Original sender', email: '', address: '', taxId: '' };
    const payment = { method: 'Original method', terms: '', beneficiary: '', provider: '', account: '', instructions: '' };
    const source = { ...createInvoiceResponse(), logo: null, sender, payment };
    const billingProfile = {
      logo: workspaceLogo,
      sender: { ...sender, name: 'Current sender' },
      payment: { ...payment, method: 'Current method' },
    };

    beforeEach(() => {
      testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
      testMocks.getInvoiceDefaults.mockResolvedValue({ billingProfile });
    });

    it('prefills the workspace logo without replacing the source billing fields', async () => {
      const createInvoice = createCreateInvoiceSpy();
      const wrapper = await mountDialog({ source, createInvoice });
      expect(document.querySelector('img[alt="Invoice sender logo"]')?.getAttribute('src')).toBe(workspaceLogo);
      await submitInvoice(wrapper);
      expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({ logo: workspaceLogo, sender, payment }));
    });

    it('keeps the saved source logo when the workspace has a different logo', async () => {
      const createInvoice = createCreateInvoiceSpy();
      const wrapper = await mountDialog({ source: { ...source, logo: originalLogo }, createInvoice });
      expect(testMocks.getInvoiceDefaults).not.toHaveBeenCalled();
      await submitInvoice(wrapper);
      expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({ logo: originalLogo }));
    });

    it('keeps an uploaded logo preference when workspace defaults arrive after removal', async () => {
      let finish!: (value: { billingProfile: typeof billingProfile }) => void;
      testMocks.getInvoiceDefaults.mockReturnValue(new Promise(resolve => { finish = resolve; }));
      const createInvoice = createCreateInvoiceSpy();
      const wrapper = await mountDialog({ source, createInvoice });
      const upload = document.querySelector<HTMLInputElement>('input[aria-label="Upload invoice logo"]')!;
      const file = new File(['<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect width="12" height="12"/></svg>'], 'custom.svg', { type: 'image/svg+xml' });
      Object.defineProperty(upload, 'files', { value: [file] });
      upload.dispatchEvent(new Event('change'));
      await vi.waitFor(() => expect(document.querySelector('img[alt="Invoice sender logo"]')).not.toBeNull());
      document.querySelector<HTMLButtonElement>('button[aria-label="Invoice logo options"]')!.click();
      await flushPromises();
      const remove = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'))
        .find(item => item.textContent?.includes('Remove logo'))!;
      remove.querySelector<HTMLElement>('a')!.click();
      await flushPromises();
      finish({ billingProfile });
      await flushPromises();
      expect(document.querySelector('img[alt="Invoice sender logo"]')).toBeNull();
      await submitInvoice(wrapper);
      expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({ logo: null }));
    });

    it('lets the server resolve only the missing logo when the defaults request fails', async () => {
      testMocks.getInvoiceDefaults.mockRejectedValue(new Error('Unavailable'));
      const createInvoice = createCreateInvoiceSpy();
      const wrapper = await mountDialog({ source, createInvoice });
      await submitInvoice(wrapper);
      const submitted = createInvoice.mock.calls[0]![0];
      expect(submitted).not.toHaveProperty('logo');
      expect(submitted).toMatchObject({ sender, payment });
    });
  });

  it('saves only checked entries and supports explicitly excluding every entry', async () => {
    const entries = [createTimeEntry(), createTimeEntry({ id: '88888888-8888-4888-8888-888888888888' })];
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse({ entries, count: 2 }));
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({ createInvoice });
    await wrapper.getComponent('#invoice-create-title').setValue('Reviewed invoice');
    await enterDateRange(wrapper);
    await flushPromises();
    const checkboxes = wrapper.findAllComponents(Checkbox).filter(field => !field.props('binary'));
    expect(checkboxes).toHaveLength(2);
    await checkboxes[0]!.vm.$emit('update:modelValue', [entries[1]!.id]);
    await flushPromises();
    await submitInvoice(wrapper);
    expect(createInvoice).toHaveBeenLastCalledWith(expect.objectContaining({ timeEntryIds: [entries[1]!.id] }));
    await checkboxes[1]!.vm.$emit('update:modelValue', []);
    await flushPromises();
    await submitInvoice(wrapper);
    expect(createInvoice).toHaveBeenLastCalledWith(expect.objectContaining({ timeEntryIds: [] }));
  });

  it('renders authoritative totals from the real calculation response without eligibility defaults',async()=>{
    const entry=createTimeEntry();
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    testMocks.requestJson.mockImplementation(async()=>previewInvoiceResponseSchema.parse({entries:[entry],count:1,totalHours:2.5,subtotal:200,discountAmount:20,totalAmount:180,currency:'USD'}));
    const createInvoice=createCreateInvoiceSpy();
    const wrapper=await mountDialog({createInvoice});
    await wrapper.getComponent('#invoice-create-title').setValue('Reviewed invoice');
    await enterDateRange(wrapper);await flushPromises();
    expect(bodyText()).toContain('Subtotal');
    expect(bodyText()).toContain('200.00 USD');
    expect(bodyText()).toContain('180.00 USD');
    expect(bodyText()).not.toContain('defaultHourlyRate');
    expect(wrapper.findAllComponents(Checkbox).filter(field => !field.props('binary'))).toHaveLength(1);
    await submitInvoice(wrapper);
    expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({timeEntryIds:[entry.id]}));
  });

  it('clears saved notes explicitly when editing',async()=>{
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice=createCreateInvoiceSpy();
    const wrapper=await mountDialog({source:{...createInvoiceResponse(),notes:'Old note'},editing:true,createInvoice});
    await wrapper.getComponent('#invoice-create-notes').setValue('');
    await submitInvoice(wrapper);
    expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({notes:null}));
  });

  it('prefills a saved invoice when the editor mounts already visible',async()=>{
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const source=createInvoiceResponse();
    const wrapper=await mountDialog({source,editing:true,initiallyVisible:true});
    expect(wrapper.findAllComponents(InputText)[0]!.props('modelValue')).toBe(source.title);
    expect(getSelectByInputId(wrapper,'invoice-create-project').props('modelValue')).toBe(source.projectId);
  });
  it('uses the reviewed workspace defaults for cleared edit billing fields',async()=>{
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse({defaultHourlyRate:200,defaultCurrency:'EUR'}));
    const createInvoice=createCreateInvoiceSpy();
    const wrapper=await mountDialog({source:{...createInvoiceResponse(),hourlyRate:100,currency:'USD'},editing:true,createInvoice});
    wrapper.findAllComponents(InputNumber).find(field=>field.props('inputId')==='invoice-create-hourly-rate')!.vm.$emit('update:modelValue',null);
    getSelectByInputId(wrapper,'invoice-create-currency').vm.$emit('update:modelValue',null);await flushPromises();
    await submitInvoice(wrapper);
    expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({hourlyRate:200,currency:'EUR'}));
  });
  it.each(['resolve','reject'] as const)('ignores a delayed save %s after another scope opens',async(outcome)=>{
    let resolveSave!:(value:InvoiceResponse)=>void;
    let rejectSave!:(reason:Error)=>void;
    const createInvoice=vi.fn(()=>new Promise<InvoiceResponse>((resolve,reject)=>{resolveSave=resolve;rejectSave=reject;}));
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const wrapper=await mountDialog({createInvoice});
    await wrapper.getComponent('#invoice-create-title').setValue('Old draft');await enterDateRange(wrapper);
    await getSubmitButton(wrapper).trigger('click');await flushPromises();
    await wrapper.setProps({scope:{role:'admin',userId:'other',workspaceId:'99999999-9999-4999-8999-999999999999'}});await flushPromises();
    await wrapper.getComponent('#invoice-create-title').setValue('New draft');
    if(outcome==='resolve')resolveSave(createInvoiceResponse());else rejectSave(new Error('Old failure'));
    await flushPromises();
    expect(wrapper.emitted('created')).toBeUndefined();
    expect(wrapper.emitted('update:visible')).toBeUndefined();
    expect(wrapper.findAllComponents(InputText)[0]!.props('modelValue')).toBe('New draft');
    expect(bodyText()).not.toContain('Old failure');
  });

  it('loads an existing invoice independently of defaults and keeps its owned entries', async () => {
    const source = { ...createInvoiceResponse(), sender: { name: 'Saved sender', address: '', email: '', taxId: '' } };
    testMocks.getInvoiceDefaults.mockRejectedValue(new Error('Settings unavailable'));
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const wrapper = await mountDialog({ source, editing: true });
    expect(document.querySelector<HTMLInputElement>('#invoice-create-title')?.value).toBe(source.title);
    expect(wrapper.findAllComponents(InputText).some(field => field.props('modelValue') === 'Saved sender')).toBe(true);
    expect(testMocks.listEligibleEntries).toHaveBeenCalledWith(expect.objectContaining({ invoiceId }));
    expect(testMocks.getInvoiceDefaults).not.toHaveBeenCalled();
    expect(testMocks.requestJson).toHaveBeenCalledWith(expect.objectContaining({ path: '/invoices/preview', body: expect.objectContaining({ timeEntryIds: [source.timeEntries[0]!.id] }) }));
  });

  it('retains edited fields and exclusions when a save conflicts and eligibility refreshes', async () => {
    const entry = createTimeEntry();
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = vi.fn().mockRejectedValue(new ApiError('Entry was claimed. Review selection.', { code: 'invoice_entries_conflict', status: 409 }));
    const wrapper = await mountDialog({ createInvoice });
    await wrapper.getComponent('#invoice-create-title').setValue('Keep my draft');
    await enterDateRange(wrapper);
    await flushPromises();
    await wrapper.findAllComponents(Checkbox).find(field=>!field.props('binary'))!.vm.$emit('update:modelValue', []);
    await flushPromises();
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse({ entries: [entry], count: 1 }));
    await submitInvoice(wrapper);
    expect(document.querySelector<HTMLInputElement>('#invoice-create-title')?.value).toBe('Keep my draft');
    expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({ timeEntryIds: [] }));
    expect(wrapper.findAllComponents(Checkbox).find(field=>!field.props('binary'))!.props('modelValue')).toEqual([]);
    expect(bodyText()).toContain('Entry was claimed. Review selection.');
    expect(wrapper.emitted('update:visible')).toBeUndefined();
  });

  it('opens mobile entry cards with a selectable task and billed duration', async () => {
    vi.mocked(window.matchMedia).mockImplementation(query => ({
      matches: query === '(max-width: 639px)', media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(), onchange: null,
    }));
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const wrapper = await mountDialog();
    await enterDateRange(wrapper);
    expect(wrapper.findComponent(DataTable).exists()).toBe(false);
    const card = document.querySelector('#invoice-editor-entries article');
    expect(card?.textContent).toContain('Backend API');
    expect(card?.textContent).toContain('Backend API implementation');
    expect(card?.textContent).toContain('Included · 2h 30m');
    await wrapper.getComponent(Checkbox).vm.$emit('update:modelValue', []);
    await flushPromises();
    expect(card?.textContent).toContain('Excluded · 2h 30m');
  });

  it('names unavailable selected entries and allows reviewing and excluding them before retry', async () => {
    testMocks.listEligibleEntries.mockResolvedValueOnce(createEntriesResponse()).mockResolvedValue(createEntriesResponse({count: 0, entries: [], totalHours: 0}));
    const createInvoice = vi.fn().mockRejectedValueOnce(new ApiError('Review unavailable entries', {code: 'invoice_entry_conflict', status: 409})).mockResolvedValue(createInvoiceResponse());
    const wrapper = await mountDialog({createInvoice});
    await wrapper.getComponent('#invoice-create-title').setValue('Reviewed draft');
    await enterDateRange(wrapper);
    await submitInvoice(wrapper);
    expect(bodyText()).toContain('Changes were not saved');
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeDefined();
    expect(bodyText()).toContain('Backend API · Backend API implementation · Unavailable');
    await wrapper.findAllComponents(Button).find(button => button.props('label') === 'Review entries')!.trigger('click');
    expect(document.activeElement?.id).toBe('invoice-editor-entries');
    await wrapper.findAllComponents(Button).find(button => button.props('label') === 'Exclude entry')!.trigger('click');
    await flushPromises();
    await submitInvoice(wrapper);
    expect(createInvoice).toHaveBeenLastCalledWith(expect.objectContaining({timeEntryIds: [], title: 'Reviewed draft'}));
  });

  it('keeps sender edits made after explicitly requesting current settings', async () => {
    const wrapper = await mountDialog();
    let finish!: (value: unknown) => void;
    testMocks.getInvoiceDefaults.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const useSettings = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Use settings')!;
    useSettings.click();
    await flushPromises();
    const field = wrapper.findAllComponents(InputText).find(input => input.element.closest('label')?.textContent?.includes('Sender / legal name'))!;
    await field.setValue('New local edit');
    finish({ billingProfile: { sender: { name: 'Remote', address: 'Saved address', email:'', taxId:'' }, payment: {method:'',terms:'',beneficiary:'',provider:'',account:'',instructions:''}, logo:null } });
    await flushPromises();
    expect(field.props('modelValue')).toBe('New local edit');
  });

  it('keeps the reviewed entry subset when reloading eligibility for the merged period', async () => {
    const entries = [createTimeEntry(), createTimeEntry({id:'88888888-8888-4888-8888-888888888888'})];
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse({entries,count:2}));
    const wrapper = await mountDialog({source:createInvoiceResponse(), editing:true});
    const savedLogo = 'data:image/svg+xml;base64,' + btoa('<svg width="20" height="20"></svg>');
    await wrapper.setProps({
      revisionConflict:true,
      reviewRevision: async getDraft => ({
        draft: {...getDraft(), dateFrom:'2026-06-01', dateTo:'2026-06-30', timeEntryIds:[entries[1]!.id]},
        conflicts:[], savedLogo,
      }),
    });
    const review = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Refresh latest revision')!;
    review.click();
    await flushPromises();
    const checkbox = wrapper.findAllComponents(Checkbox).find(field => !field.props('binary'))!;
    expect(checkbox.props('modelValue')).toEqual([entries[1]!.id]);
    expect(document.querySelector('img[alt="Latest saved invoice logo"]')?.getAttribute('src')).toBe(savedLogo);
    const chooseLogo = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Use saved logo')!;
    chooseLogo.click();
    await flushPromises();
    expect(document.querySelector('img[alt="Invoice sender logo"]')?.getAttribute('src')).toBe(savedLogo);
  });

  it('preserves sender and payment typed while initial defaults are loading',async()=>{
    let resolveDefaults!:(value:unknown)=>void;
    testMocks.getInvoiceDefaults.mockReturnValueOnce(new Promise(resolve=>{resolveDefaults=resolve;}));
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const createInvoice = createCreateInvoiceSpy();
    const wrapper=await mountDialog({ createInvoice });
    await wrapper.getComponent('#invoice-create-title').setValue('Pending defaults');
    await enterDateRange(wrapper);
    await submitInvoice(wrapper);
    expect(createInvoice).not.toHaveBeenCalled();
    const senderField=wrapper.findAllComponents(InputText).find(field=>field.element.closest('label')?.textContent?.includes('Sender / legal name'))!;
    const paymentField=getSelectByInputId(wrapper,'invoice-payment-method');
    await senderField.setValue('Typed sender');await paymentField.vm.$emit('update:modelValue','Typed payment');await flushPromises();
    resolveDefaults({billingProfile:{sender:{name:'Settings sender',address:'Address',email:'',taxId:''},payment:{method:'Settings payment',terms:'',beneficiary:'',provider:'',account:'',instructions:''},logo:null}});await flushPromises();
    expect(senderField.props('modelValue')).toBe('Typed sender');
    expect(paymentField.props('modelValue')).toBe('Typed payment');
    await submitInvoice(wrapper);
    expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({sender: expect.objectContaining({name:'Typed sender', address:'Address'})}));
  });
  it('refreshes eligibility and retries a failed calculation without losing the draft',async()=>{
    let fail=true;
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    testMocks.requestJson.mockImplementation(async()=>{
      if(fail)throw new Error('Entry was claimed. Review selection.');
      return previewInvoiceResponseSchema.parse({entries:[createTimeEntry()],count:1,totalHours:2.5,subtotal:200,discountAmount:0,totalAmount:200,currency:'USD'});
    });
    const wrapper=await mountDialog();
    await wrapper.getComponent('#invoice-create-title').setValue('Keep typed title');
    await enterDateRange(wrapper);await flushPromises();
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeDefined();
    const calls=testMocks.listEligibleEntries.mock.calls.length;
    fail=false;
    await wrapper.findAllComponents(Button).find(button=>button.props('label')==='Refresh entries and retry')!.trigger('click');await flushPromises();
    expect(testMocks.listEligibleEntries.mock.calls.length).toBeGreaterThan(calls);
    expect(document.querySelector<HTMLInputElement>('#invoice-create-title')?.value).toBe('Keep typed title');
    expect(bodyText()).toContain('200.00 USD');
    expect(bodyText()).not.toContain('Entry was claimed');
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeUndefined();
  });

  it('ignores defaults from a closed dialog when another workspace opens', async () => {
    let resolveDefaults!: (value: unknown) => void;
    testMocks.getInvoiceDefaults.mockReturnValueOnce(new Promise(resolve => { resolveDefaults = resolve; }));
    const wrapper = await mountDialog();
    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ scope: { role: 'admin', userId: 'user-1', workspaceId: '99999999-9999-4999-8999-999999999999' }, visible: true });
    await flushPromises();
    resolveDefaults({ billingProfile: { sender: { name: 'Stale workspace', address: '', email: '', taxId: '' }, payment: { method: '', terms: '', beneficiary: '', provider: '', account: '', instructions: '' }, logo: null, invoicePrefix: 'OLD' } });
    await flushPromises();
    expect(wrapper.findAllComponents(InputText).some(field => field.props('modelValue') === 'Stale workspace')).toBe(false);
  });

  it.each([false, true])('resets dates for copies and preserves them while editing (%s)', async editing => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    const source = { ...createInvoiceResponse(), issueDate: '2025-03-01', dueDate: '2025-03-31' };
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({ source, editing, createInvoice });
    const pickers = wrapper.findAllComponents(DatePicker);
    const issue = pickers.find(field => field.props('inputId') === 'invoice-issue-date')!;
    const due = pickers.find(field => field.props('inputId') === 'invoice-due-date')!;
    if (editing) {
      expect(issue.props('modelValue')).toEqual(new Date('2025-03-01T12:00:00'));
      expect(due.props('modelValue')).toEqual(new Date('2025-03-31T12:00:00'));
    } else {
      expect(issue.props('modelValue')).not.toEqual(new Date('2025-03-01T12:00:00'));
      expect(due.props('modelValue')).toBeNull();
    }
    issue.vm.$emit('update:modelValue',new Date('2026-03-10T12:00:00'));
    due.vm.$emit('update:modelValue',new Date('2026-03-09T12:00:00'));
    await flushPromises();
    expect(getSubmitButton(wrapper).attributes('disabled')).toBeDefined();
    expect(bodyText()).toContain('Due date must be on or after the issue date.');
    due.vm.$emit('update:modelValue',new Date('2026-03-10T12:00:00'));
    await flushPromises();
    await submitInvoice(wrapper);
    expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({issueDate:'2026-03-10',dueDate:'2026-03-10'}));
  });

  it.each([
    ['Bank transfer', 'swift', 'DEMO1234'],
    ['Card', 'paymentUrl', 'https://pay.example.test/invoice'],
  ])('loads optional %s defaults when settings arrive late', async (method, key, value) => {
    testMocks.listEligibleEntries.mockResolvedValue(createEntriesResponse());
    let resolveDefaults!: (value: unknown) => void;
    testMocks.getInvoiceDefaults.mockReturnValueOnce(new Promise(resolve => { resolveDefaults = resolve; }));
    const createInvoice = createCreateInvoiceSpy();
    const wrapper = await mountDialog({createInvoice});
    await wrapper.getComponent('#invoice-create-title').setValue('Optional defaults');
    await enterDateRange(wrapper);
    resolveDefaults({billingProfile:{sender:{name:'Studio',address:'',email:'',taxId:''},payment:{method,terms:'',beneficiary:'',provider:'',account:'',instructions:'',[key]:value},logo:null}});
    await flushPromises();
    expect(document.querySelector<HTMLInputElement>('#invoice-payment-' + key)?.value).toBe(value);
    await submitInvoice(wrapper);
    expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({payment:expect.objectContaining({[key]:value})}));
  });

});
