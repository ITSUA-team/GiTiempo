// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import type { InvoiceListItem } from '@gitiempo/shared';
import {
  ManagementTableShell,
  MobileRecordCard,
} from '@gitiempo/web-shared';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';
import PrimeVue from 'primevue/config';
import DatePicker from 'primevue/datepicker';
import Paginator from 'primevue/paginator';
import Select from 'primevue/select';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InvoicesTable from './InvoicesTable.vue';
import InvoiceStatusBadge from './InvoiceStatusBadge.vue';
import {
  INVOICE_STATUS_OPTIONS,
  type InvoicesTableFilterOptions,
  type InvoicesTableFilters,
  type InvoicesTableRow,
} from '@/lib/invoices-table';

const emptyDescription = 'No invoices match the current filters.';

const defaultFilters: InvoicesTableFilters = {
  dateFrom: null,
  dateTo: null,
  projectId: null,
  search: '',
  status: null,
};

const defaultFilterOptions: InvoicesTableFilterOptions = {
  projects: [
    { id: 'project-1', name: 'Project Orion' },
    { id: 'project-2', name: 'Billing API' },
  ],
  statuses: INVOICE_STATUS_OPTIONS,
};

function makeInvoice(overrides: Partial<InvoiceListItem> = {}): InvoiceListItem {
  return {
    createdAt: '2026-04-01T10:00:00.000Z',
    createdBy: 'user-1',
    createdByName: 'Alex Admin',
    currency: 'USD',
    dateFrom: '2026-03-01',
    dateTo: '2026-03-31',
    discountPercent: 0,
    hourlyRate: 100,
    id: 'invoice-1',
    notes: null,
    project: null,
    projectId: null,
    status: 'draft',
    timeEntryCount: 85,
    title: 'March Infrastructure',
    totalAmount: 5240,
    totalHours: 85.5,
    updatedAt: '2026-04-01T10:00:00.000Z',
    workspaceId: 'workspace-1',
    ...overrides,
  };
}

const rows: InvoicesTableRow[] = [
  makeInvoice({
    dateFrom: '2026-04-01',
    dateTo: '2026-04-21',
    id: 'invoice-1',
    project: { id: 'project-1', name: 'Project Orion' },
    projectId: 'project-1',
    status: 'draft',
    title: 'April 2026 Billing Run',
    totalAmount: 12800,
    totalHours: 128,
  }),
  makeInvoice({
    currency: 'EUR',
    dateFrom: '2026-01-01',
    dateTo: '2026-03-31',
    id: 'invoice-2',
    status: 'sent',
    title: 'Q1 Development Services',
    totalAmount: 8500,
    totalHours: 480,
  }),
  makeInvoice({
    id: 'invoice-3',
    status: 'paid',
    title: 'March Infrastructure',
  }),
];

function mountInvoicesTable(options: {
  filters?: InvoicesTableFilters;
  filterOptions?: InvoicesTableFilterOptions;
  isMobileViewport?: boolean;
  loading?: boolean;
  page?: number;
  rows?: InvoicesTableRow[];
  rowsPerPage?: number;
  totalRecords?: number;
} = {}) {
  const tableRows = options.rows ?? rows;

  return mount(InvoicesTable, {
    props: {
      emptyDescription,
      filterOptions: options.filterOptions ?? defaultFilterOptions,
      filters: options.filters ?? defaultFilters,
      isMobileViewport: options.isMobileViewport ?? false,
      loading: options.loading ?? false,
      page: options.page ?? 1,
      rows: tableRows,
      rowsPerPage: options.rowsPerPage ?? 20,
      totalRecords: options.totalRecords ?? tableRows.length,
    },
    global: {
      directives: {
        tooltip: {
          mounted(el, binding) {
            el.setAttribute('data-tooltip', String(binding.value));
          },
        },
      },
      plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
    },
  });
}

type InvoicesTableWrapper = ReturnType<typeof mountInvoicesTable>;

function mockMatchMedia(matches = false): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

function getFilterSelect(
  wrapper: InvoicesTableWrapper,
  optionValue: string,
) {
  const filter = wrapper
    .findAllComponents(Select)
    .find((candidate) => candidate.props('optionValue') === optionValue);

  if (!filter) {
    throw new Error(`No ${optionValue}-valued invoice filter select rendered`);
  }

  return filter;
}

describe('InvoicesTable', () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  it('renders all six invoice columns with docs headers', () => {
    const wrapper = mountInvoicesTable();

    const headerLabels = wrapper
      .findAll('[data-testid^="management-table-header-"]')
      .map((header) => header.text());

    expect(headerLabels).toEqual([
      'Title',
      'Project',
      'Period',
      'Hours',
      'Amount',
      'Status',
    ]);
    expect(
      wrapper.get('[data-testid="management-table-header-amount"]').classes(),
    ).toContain('text-right');
  });

  it('renders row content with API currency formatting and the workspace-wide fallback', () => {
    const wrapper = mountInvoicesTable();

    expect(wrapper.text()).toContain('April 2026 Billing Run');
    expect(wrapper.text()).toContain('$12,800.00');
    expect(wrapper.text()).toContain('€8,500.00');
    expect(wrapper.text()).toContain('Apr 1 – Apr 21');
    expect(wrapper.text()).toContain('Mar 1 – Mar 31');
    expect(wrapper.text()).toContain('480h');
    expect(wrapper.text()).toContain('Workspace-wide');

    // The Amount column cells are the 120px body tds of the shared table;
    // each holds exactly one right-aligned formatted span.
    const amountCells = wrapper.findAll('td[style*="120px"]');
    expect(amountCells.map((cell) => cell.text())).toEqual([
      '$12,800.00',
      '€8,500.00',
      '$5,240.00',
    ]);
    expect(amountCells[0]!.find('span').classes()).toContain('text-right');
  });

  it('renders a status badge for every row in row order', () => {
    const wrapper = mountInvoicesTable();

    const badges = wrapper.findAllComponents(InvoiceStatusBadge);

    expect(badges).toHaveLength(3);
    expect(badges.map((badge) => badge.props('status'))).toEqual([
      'draft',
      'sent',
      'paid',
    ]);
  });

  it('emits row-click with the invoice id from the desktop title link', async () => {
    const wrapper = mountInvoicesTable();

    const titleLink = wrapper.get('[data-testid="invoice-title-invoice-1"]');
    expect(titleLink.attributes('aria-label')).toBe(
      'Open invoice April 2026 Billing Run',
    );
    await titleLink.trigger('click');

    expect(wrapper.emitted('row-click')).toEqual([['invoice-1']]);
  });

  it('emits search filter updates from the header search control', async () => {
    const wrapper = mountInvoicesTable();
    const search = wrapper.get('input[aria-label="Search invoices"]');

    expect(search.attributes('placeholder')).toBe('Search invoices');
    await search.setValue('billing');

    expect(wrapper.emitted('update:filters')).toEqual([
      [{ search: 'billing' }],
    ]);
  });

  it('emits project filter updates from the filter row select', async () => {
    const wrapper = mountInvoicesTable();
    const projectFilter = getFilterSelect(wrapper, 'id');

    await projectFilter.vm.$emit('update:modelValue', 'project-2');
    expect(wrapper.emitted('update:filters')).toEqual([
      [{ projectId: 'project-2' }],
    ]);

    await projectFilter.vm.$emit('update:modelValue', null);
    expect(wrapper.emitted('update:filters')?.at(-1)).toEqual([
      { projectId: null },
    ]);
  });

  it('emits status filter updates from the filter row select', async () => {
    const wrapper = mountInvoicesTable();
    const statusFilter = getFilterSelect(wrapper, 'value');

    await statusFilter.vm.$emit('update:modelValue', 'paid');
    expect(wrapper.emitted('update:filters')).toEqual([[{ status: 'paid' }]]);
  });

  it('emits a cleared status filter update from the filter row select', async () => {
    const wrapper = mountInvoicesTable();
    const statusFilter = getFilterSelect(wrapper, 'value');

    await statusFilter.vm.$emit('update:modelValue', null);
    expect(wrapper.emitted('update:filters')).toEqual([[{ status: null }]]);
  });

  it('emits project filter updates from the mobile filter row select', async () => {
    const wrapper = mountInvoicesTable({ isMobileViewport: true });
    const projectFilter = wrapper
      .findAllComponents(Select)
      .find(
        (select) =>
          select.attributes('data-testid') ===
          'invoices-table-project-filter',
      );

    if (!projectFilter) {
      throw new Error('No mobile project filter select rendered');
    }

    await projectFilter.vm.$emit('update:modelValue', 'project-2');
    expect(wrapper.emitted('update:filters')).toEqual([
      [{ projectId: 'project-2' }],
    ]);
  });

  it('emits date range filter updates from the period picker only for complete ranges', async () => {
    const wrapper = mountInvoicesTable();
    const periodFilter = wrapper.getComponent(DatePicker);

    await periodFilter.vm.$emit('update:modelValue', [
      new Date('2026-04-01T00:00:00'),
      new Date('2026-04-21T00:00:00'),
    ]);
    expect(wrapper.emitted('update:filters')).toEqual([
      [{ dateFrom: '2026-04-01', dateTo: '2026-04-21' }],
    ]);

    // Mid-selection never sends a filter update — the partial range stays
    // local until the user completes or clears it.
    await periodFilter.vm.$emit('update:modelValue', [
      new Date('2026-04-01T00:00:00'),
      null,
    ]);
    expect(wrapper.emitted('update:filters')).toHaveLength(1);

    await periodFilter.vm.$emit('update:modelValue', null);
    expect(wrapper.emitted('update:filters')?.at(-1)).toEqual([
      { dateFrom: null, dateTo: null },
    ]);
  });

  it('keeps the partial date selection in the picker without emitting a filter update', async () => {
    const wrapper = mountInvoicesTable();
    const periodFilter = wrapper.getComponent(DatePicker);

    await periodFilter.vm.$emit('update:modelValue', [
      new Date('2026-04-01T00:00:00'),
      null,
    ]);

    expect(wrapper.emitted('update:filters')).toBeUndefined();

    const modelValue = periodFilter.props('modelValue') as
      | Array<Date | null>
      | null;
    expect(modelValue?.[0]).toEqual(new Date('2026-04-01T00:00:00'));
    expect(modelValue?.[1]).toBeNull();
  });

  it('completes the range in two clicks without losing the first selected date', async () => {
    const wrapper = mountInvoicesTable();
    const periodFilter = wrapper.getComponent(DatePicker);

    await periodFilter.vm.$emit('update:modelValue', [
      new Date('2026-04-01T00:00:00'),
      null,
    ]);
    expect(wrapper.emitted('update:filters')).toBeUndefined();

    await periodFilter.vm.$emit('update:modelValue', [
      new Date('2026-04-01T00:00:00'),
      new Date('2026-04-21T00:00:00'),
    ]);
    expect(wrapper.emitted('update:filters')).toEqual([
      [{ dateFrom: '2026-04-01', dateTo: '2026-04-21' }],
    ]);
  });

  it('syncs the local picker state when the parent filter is reset externally', async () => {
    const wrapper = mountInvoicesTable({
      filters: {
        dateFrom: '2026-04-01',
        dateTo: '2026-04-21',
        projectId: null,
        search: '',
        status: null,
      },
    });

    let modelValue = wrapper.getComponent(DatePicker).props('modelValue') as
      | Array<Date | null>
      | null;
    expect(modelValue?.[0]).toEqual(new Date('2026-04-01T00:00:00'));
    expect(modelValue?.[1]).toEqual(new Date('2026-04-21T00:00:00'));

    await wrapper.setProps({
      filters: { ...defaultFilters },
    });

    modelValue = wrapper.getComponent(DatePicker).props('modelValue') as
      | Array<Date | null>
      | null;
    expect(modelValue).toBeNull();
  });

  it('emits create-invoice from the header action', async () => {
    const wrapper = mountInvoicesTable();
    const createButton = wrapper.get('[data-testid="invoices-table-create"]');

    expect(createButton.attributes('aria-label')).toBe('Create invoice');
    await createButton.trigger('click');

    expect(wrapper.emitted('create-invoice')).toEqual([[]]);
  });

  it('renders the paginator with the docs template and emits update:page', async () => {
    const wrapper = mountInvoicesTable({
      page: 1,
      rowsPerPage: 20,
      totalRecords: 45,
    });

    const paginator = wrapper.getComponent(Paginator);
    expect(paginator.props('first')).toBe(0);
    expect(paginator.props('rows')).toBe(20);
    expect(paginator.props('totalRecords')).toBe(45);
    expect(paginator.props('template')).toBe(
      'PrevPageLink PageLinks NextPageLink CurrentPageReport',
    );
    expect(paginator.props('currentPageReportTemplate')).toBe(
      'Showing {first} to {last} of {totalRecords} invoices',
    );

    await paginator.vm.$emit('page', { page: 1, first: 20, rows: 20 });

    expect(wrapper.emitted('update:page')).toEqual([[2]]);
  });

  it('renders stacked mobile cards with the same fields instead of the desktop table', async () => {
    const wrapper = mountInvoicesTable({ isMobileViewport: true });

    expect(wrapper.findComponent(ManagementTableShell).exists()).toBe(false);
    const cards = wrapper.findAll('[data-testid="invoice-mobile-card"]');
    expect(cards).toHaveLength(3);

    const firstCard = cards[0]!;
    expect(firstCard.text()).toContain('April 2026 Billing Run');
    expect(firstCard.text()).toContain('Project Orion');
    expect(firstCard.text()).toContain('Apr 1 – Apr 21');
    expect(firstCard.text()).toContain('128h');
    expect(firstCard.text()).toContain('$12,800.00');
    expect(
      firstCard.findAllComponents(InvoiceStatusBadge),
    ).toHaveLength(1);

    await firstCard
      .get('[data-testid="invoice-mobile-title-invoice-1"]')
      .trigger('click');

    expect(wrapper.emitted('row-click')).toEqual([['invoice-1']]);
  });

  it('keeps the desktop table branch when the viewport is not mobile', () => {
    const wrapper = mountInvoicesTable();

    expect(wrapper.findComponent(ManagementTableShell).exists()).toBe(true);
    expect(wrapper.findComponent(MobileRecordCard).exists()).toBe(false);
  });

  it('renders mobile loading cards while the initial load is pending', () => {
    const wrapper = mountInvoicesTable({
      isMobileViewport: true,
      loading: true,
      rows: [],
    });

    expect(
      wrapper.findAll('[data-testid="invoices-mobile-loading-card"]'),
    ).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="invoice-mobile-card"]')).toHaveLength(
      0,
    );
    expect(wrapper.text()).not.toContain('No invoices found');
  });

  it('renders desktop skeleton rows while the initial load is pending', () => {
    const wrapper = mountInvoicesTable({ loading: true, rows: [] });

    expect(
      wrapper.findAll('[data-testid="invoices-desktop-loading-row"]'),
    ).toHaveLength(6);
    expect(wrapper.text()).not.toContain('No invoices found');
  });

  it('renders the empty description and hides the paginator when no rows exist', () => {
    const desktop = mountInvoicesTable({ rows: [], totalRecords: 0 });
    expect(desktop.text()).toContain(emptyDescription);
    expect(desktop.findComponent(MobileRecordCard).exists()).toBe(false);
    expect(
      desktop
        .find('[data-testid="invoices-table-paginator"]')
        .exists(),
    ).toBe(false);

    const mobile = mountInvoicesTable({
      isMobileViewport: true,
      rows: [],
      totalRecords: 0,
    });
    expect(mobile.text()).toContain(emptyDescription);
    expect(mobile.findComponent(ManagementTableShell).exists()).toBe(false);
  });

  it('keeps the period picker and both selects bound to the supplied filter model', () => {
    const wrapper = mountInvoicesTable({
      filters: {
        dateFrom: '2026-02-01',
        dateTo: '2026-02-28',
        projectId: 'project-1',
        search: '',
        status: 'sent',
      },
    });

    expect(getFilterSelect(wrapper, 'id').props('modelValue')).toBe(
      'project-1',
    );
    expect(getFilterSelect(wrapper, 'value').props('modelValue')).toBe('sent');

    const range = wrapper.getComponent(DatePicker).props('modelValue') as Date[];
    expect(range[0]).toEqual(new Date('2026-02-01T00:00:00'));
    expect(range[1]).toEqual(new Date('2026-02-28T00:00:00'));
  });
});