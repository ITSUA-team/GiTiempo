import { defineComponent, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import type * as VueRouter from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateInvoiceInput,
  InvoiceListItem,
  InvoiceListQuery,
  InvoiceListResponse,
  InvoiceResponse,
  InvoiceStatsResponse,
} from '@gitiempo/shared';
import type * as WebShared from '@gitiempo/web-shared';
import { getErrorMessage } from '@gitiempo/web-shared';
import { ApiError } from '@gitiempo/web-shared/http';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import { routeNames } from '@/constants/routes';
import { createTestQueryPlugin } from '@/test/query-client';
import { useAuthStore } from '@/stores/auth';

import InvoicesView from './InvoicesView.vue';

const mobileViewportMock = vi.hoisted(() => ({
  ref: null as { value: boolean } | null,
}));

const testMocks = vi.hoisted(() => ({
  createInvoice: vi.fn(),
  errorToast: vi.fn(),
  refetch: vi.fn(),
  routerPush: vi.fn(),
  successToast: vi.fn(),
  useInvoicesData: vi.fn(),
  useInvoiceCreate: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof VueRouter>();

  return {
    ...actual,
    useRouter: () => ({ push: testMocks.routerPush }),
  };
});

vi.mock('@gitiempo/web-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof WebShared>();
  const { ref } = await import('vue');

  mobileViewportMock.ref = ref(false);

  return {
    ...actual,
    useIsMobileViewport: () => mobileViewportMock.ref,
  };
});

vi.mock('@/services/admin-projects-client', () => ({
  adminProjectsClient: {
    listProjects: vi.fn().mockResolvedValue([
      { id: '11111111-1111-4111-8111-111111111111', name: 'Project Orion' },
    ]),
  },
}));

vi.mock('@/composables/feedback/useToasts', () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
    successToast: testMocks.successToast,
  }),
}));

vi.mock('@/composables/invoices/useInvoicesData', () => ({
  useInvoicesData: testMocks.useInvoicesData,
}));

vi.mock('@/composables/invoices/useInvoiceCreate', () => ({
  useInvoiceCreate: testMocks.useInvoiceCreate,
}));

const workspaceId = '44444444-4444-4444-8444-444444444444';
const projectId = '11111111-1111-4111-8111-111111111111';
const invoiceId = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';

type WorkspaceRoleFixture = 'admin' | 'pm';

interface InvoicesDataComposableOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  onError?: (message: string, error: unknown, action: string) => void;
  query?: MaybeRefOrGetter<Partial<InvoiceListQuery>>;
  scope?: unknown;
}

interface InvoiceCreateComposableOptions {
  onError?: (message: string, error: unknown, action: string) => void;
  onSuccess?: () => void;
}

interface InvoiceCreateMutationState {
  createInvoice: (input: CreateInvoiceInput) => Promise<InvoiceResponse>;
  isCreating: Ref<boolean>;
}

interface StubbedInvoicesData {
  initialLoaded: boolean;
  invoices: InvoiceListResponse | undefined;
  loadError: Error | null;
  stats: InvoiceStatsResponse | undefined;
}

let invoicesDataRefs!: {
  initialLoaded: Ref<boolean>;
  invoices: Ref<InvoiceListResponse | undefined>;
  loadError: Ref<Error | null>;
  stats: Ref<InvoiceStatsResponse | undefined>;
};

let lastInvoicesDataOptions: InvoicesDataComposableOptions | null = null;
let createMutationState: InvoiceCreateMutationState | null = null;

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

function createInvoiceItem(
  overrides: Partial<InvoiceListItem> = {},
): InvoiceListItem {
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
    status: 'draft',
    timeEntryCount: 2,
    title: 'April 2026 — Backend',
    totalAmount: 1000,
    totalHours: 12.5,
    updatedAt: '2026-05-01T10:00:00.000Z',
    workspaceId,
    ...overrides,
  };
}

function createInvoiceResponse(
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
    status: 'draft',
    timeEntries: [],
    timeEntryCount: 0,
    title: 'April 2026 — Backend',
    totalAmount: 1000,
    totalHours: 12.5,
    updatedAt: '2026-05-01T10:00:00.000Z',
    workspaceId,
    ...overrides,
  };
}

function createListResponse(items: InvoiceListItem[]): InvoiceListResponse {
  return {
    items,
    meta: {
      limit: 20,
      page: 1,
      total: items.length,
      totalPages: items.length > 0 ? 1 : 0,
    },
  };
}

function createStatsResponse(
  overrides: Partial<InvoiceStatsResponse> = {},
): InvoiceStatsResponse {
  return {
    byStatus: { draft: 2, sent: 1, paid: 3 },
    thisMonth: {
      currency: 'USD',
      invoiceCount: 2,
      projectCount: 2,
      totalAmount: 2500,
    },
    ...overrides,
  };
}

function stubInvoicesData(data: StubbedInvoicesData): void {
  invoicesDataRefs.initialLoaded.value = data.initialLoaded;
  invoicesDataRefs.invoices.value = data.invoices;
  invoicesDataRefs.loadError.value = data.loadError;
  invoicesDataRefs.stats.value = data.stats;
}

function createLoadedInvoicesData(
  items: InvoiceListItem[] = [createInvoiceItem()],
): StubbedInvoicesData {
  return {
    initialLoaded: true,
    invoices: createListResponse(items),
    loadError: null,
    stats: createStatsResponse(),
  };
}

function setMobileViewport(value: boolean): void {
  if (!mobileViewportMock.ref) throw new Error('ref not set');

  mobileViewportMock.ref.value = value;
}

function getCapturedQueryValue(): Partial<InvoiceListQuery> {
  const query = lastInvoicesDataOptions?.query;

  if (!query) throw new Error('query not defined');

  return toValue(query);
}

const ManagementPageSkeletonStub = {
  name: 'ManagementPageSkeleton',
  template: '<div data-testid="invoices-page-skeleton" />',
};

const InvoicesTableStub = {
  name: 'InvoicesTable',
  emits: [
    'create-invoice',
    'row-click',
    'update:filters',
    'update:page',
  ],
  props: {
    emptyDescription: { type: String, required: true },
    filterOptions: { type: Object, required: true },
    filters: { type: Object, required: true },
    isMobileViewport: { type: Boolean, required: true },
    loading: { type: Boolean, required: true },
    page: { type: Number, required: true },
    rows: { type: Array, required: true },
    rowsPerPage: { type: Number, required: true },
    totalRecords: { type: Number, required: true },
  },
  template: `
    <div data-testid="invoices-table">
      {{ rows.length }} rows | page={{ page }} | loading={{ loading }} | search={{ filters.search }}
      <span
        v-if="isMobileViewport"
        data-testid="invoices-table-mobile-branch"
      />
      <span
        v-else
        data-testid="invoices-table-desktop-branch"
      />
      <button
        v-if="rows[0]"
        data-testid="invoices-row-open"
        @click="$emit('row-click', rows[0].id)"
      >
        {{ rows[0].title }}
      </button>
      <button
        data-testid="invoices-search-intent"
        @click="$emit('update:filters', { search: 'orion' })"
      />
      <button
        data-testid="invoices-project-filter-intent"
        @click="$emit('update:filters', { projectId: 'project-1' })"
      />
      <button
        data-testid="invoices-project-clear-intent"
        @click="$emit('update:filters', { projectId: null })"
      />
      <button
        data-testid="invoices-status-filter-intent"
        @click="$emit('update:filters', { status: 'paid' })"
      />
      <button
        data-testid="invoices-status-clear-intent"
        @click="$emit('update:filters', { status: null })"
      />
      <button
        data-testid="invoices-date-filter-intent"
        @click="$emit('update:filters', { dateFrom: '2026-04-01', dateTo: '2026-04-30' })"
      />
      <button
        data-testid="invoices-date-clear-intent"
        @click="$emit('update:filters', { dateFrom: null, dateTo: null })"
      />
      <button
        data-testid="invoices-page-2-intent"
        @click="$emit('update:page', 2)"
      />
      <button
        data-testid="invoices-create-intent"
        @click="$emit('create-invoice')"
      />
    </div>
  `,
};

// Mirrors the real dialog contract: submits through the injected mutation,
// emits `created` + closes on success, and keeps the form open on failure.
const InvoiceCreateDialogStub = defineComponent({
  name: 'InvoiceCreateDialog',
  props: {
    createMutation: { type: Object, required: true },
    isAdmin: { type: Boolean, required: true },
    projects: { type: Array, required: true },
    scope: { type: Object, required: true },
    visible: { type: Boolean, required: true },
  },
  emits: ['created', 'update:visible'],
  methods: {
    async submit(): Promise<void> {
      let invoice: InvoiceResponse;

      try {
        invoice = await this.createMutation.createInvoice({
          dateFrom: '2026-04-01',
          dateTo: '2026-04-30',
          title: 'Stub invoice',
        });
      } catch {
        return;
      }

      this.$emit('created', invoice);
      this.$emit('update:visible', false);
    },
  },
  template: `
    <div data-testid="invoice-create-dialog">
      visible={{ visible }}
      <button
        data-testid="invoice-create-submit"
        @click="submit"
      />
    </div>
  `,
});

function mountInvoicesView(
  options: { role?: WorkspaceRoleFixture } = {},
) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const authStore = useAuthStore(pinia);
  authStore.accessToken = 'access-token';
  authStore.profile = createProfile(options.role ?? 'admin');

  return mount(InvoicesView, {
    global: {
      plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions], createTestQueryPlugin()],
      stubs: {
        InvoiceCreateDialog: InvoiceCreateDialogStub,
        InvoicesTable: InvoicesTableStub,
        ManagementPageSkeleton: ManagementPageSkeletonStub,
      },
    },
  });
}

describe('InvoicesView', () => {
  beforeEach(() => {
    testMocks.createInvoice.mockReset();
    testMocks.errorToast.mockReset();
    testMocks.refetch.mockReset();
    testMocks.routerPush.mockReset();
    testMocks.successToast.mockReset();
    testMocks.useInvoicesData.mockReset();
    testMocks.useInvoiceCreate.mockReset();

    invoicesDataRefs = {
      initialLoaded: ref(false),
      invoices: ref<InvoiceListResponse | undefined>(undefined),
      loadError: ref<Error | null>(null),
      stats: ref<InvoiceStatsResponse | undefined>(undefined),
    };
    lastInvoicesDataOptions = null;
    createMutationState = null;
    setMobileViewport(false);

    testMocks.refetch.mockResolvedValue(undefined);

    testMocks.useInvoicesData.mockImplementation(
      (options: InvoicesDataComposableOptions) => {
        lastInvoicesDataOptions = options;

        return {
          initialLoaded: invoicesDataRefs.initialLoaded,
          invoices: invoicesDataRefs.invoices,
          invoicesLoading: ref(false),
          loadError: invoicesDataRefs.loadError,
          refetch: testMocks.refetch,
          stats: invoicesDataRefs.stats,
          statsLoading: ref(false),
        };
      },
    );

    testMocks.useInvoiceCreate.mockImplementation(
      (options: InvoiceCreateComposableOptions): InvoiceCreateMutationState => {
        const mutationState = {
          createInvoice: async (
            input: CreateInvoiceInput,
          ): Promise<InvoiceResponse> => {
            try {
              const invoice = await testMocks.createInvoice(input);
              options.onSuccess?.();
              return invoice;
            } catch (error) {
              options.onError?.(
                getErrorMessage(error),
                error,
                'create-invoice',
              );
              throw error;
            }
          },
          isCreating: ref(false),
        };
        createMutationState = mutationState;

        return mutationState;
      },
    );

    testMocks.createInvoice.mockResolvedValue(createInvoiceResponse());

    stubInvoicesData(createLoadedInvoicesData());
  });

  it('renders the page skeleton until the first invoices load settles, then the list content', async () => {
    stubInvoicesData({
      initialLoaded: false,
      invoices: undefined,
      loadError: null,
      stats: undefined,
    });

    const wrapper = mountInvoicesView();

    expect(
      wrapper.find('[data-testid="invoices-page-skeleton"]').exists(),
    ).toBe(true);
    expect(wrapper.findComponent({ name: 'InvoicesTable' }).exists()).toBe(
      false,
    );

    stubInvoicesData(createLoadedInvoicesData());
    await flushPromises();

    expect(
      wrapper.find('[data-testid="invoices-page-skeleton"]').exists(),
    ).toBe(false);
    expect(wrapper.findComponent({ name: 'InvoicesTable' }).exists()).toBe(
      true,
    );
  });

  it('renders a retryable error card when the invoices request fails', async () => {
    stubInvoicesData({
      initialLoaded: false,
      invoices: undefined,
      loadError: new ApiError('Invoice api unreachable', { status: 502 }),
      stats: undefined,
    });

    const wrapper = mountInvoicesView();

    expect(
      wrapper.find('[data-testid="invoices-page-skeleton"]').exists(),
    ).toBe(false);
    const errorCard = wrapper.get('[data-testid="invoices-load-error"]');
    expect(errorCard.text()).toContain('Failed to load invoices');
    expect(errorCard.text()).toContain('Invoice api unreachable');
    expect(wrapper.findComponent({ name: 'InvoicesTable' }).exists()).toBe(
      false,
    );

    await errorCard.get('button').trigger('click');

    expect(testMocks.refetch).toHaveBeenCalledTimes(1);

    stubInvoicesData(createLoadedInvoicesData());
    await flushPromises();

    expect(
      wrapper.find('[data-testid="invoices-load-error"]').exists(),
    ).toBe(false);
    expect(wrapper.find('[data-testid="invoices-table"]').exists()).toBe(true);
  });

  it('shows a clear-filters action on the error card when filters are active', async () => {
    stubInvoicesData(createLoadedInvoicesData());
    const wrapper = mountInvoicesView();
    await flushPromises();

    expect(
      wrapper.find('[data-testid="invoices-clear-filters"]').exists(),
    ).toBe(false);

    await wrapper
      .get('[data-testid="invoices-search-intent"]')
      .trigger('click');

    stubInvoicesData({
      initialLoaded: false,
      invoices: undefined,
      loadError: new ApiError('Search query too long', { status: 400 }),
      stats: undefined,
    });
    await flushPromises();

    const clearButton = wrapper.get('[data-testid="invoices-clear-filters"]');
    expect(clearButton.text()).toBe('Clear filters');

    await clearButton.trigger('click');

    stubInvoicesData(createLoadedInvoicesData());
    await flushPromises();

    const table = wrapper.findComponent({ name: 'InvoicesTable' });
    expect(table.props('filters').search).toBe('');
    expect(table.props('filters').projectId).toBeNull();
    expect(table.props('filters').status).toBeNull();
    expect(table.props('filters').dateFrom).toBeNull();
    expect(table.props('filters').dateTo).toBeNull();
    expect(table.props('page')).toBe(1);
  });

  it('does not show a clear-filters action on the error card when no filters are active', async () => {
    stubInvoicesData({
      initialLoaded: false,
      invoices: undefined,
      loadError: new ApiError('Server error', { status: 500 }),
      stats: undefined,
    });
    const wrapper = mountInvoicesView();
    await flushPromises();

    expect(
      wrapper.find('[data-testid="invoices-clear-filters"]').exists(),
    ).toBe(false);
  });

  it('shows the empty state description when no invoices are returned', async () => {
    stubInvoicesData(createLoadedInvoicesData([]));

    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent({ name: 'InvoicesTable' });
    expect(table.props('rows')).toHaveLength(0);
    expect(table.props('emptyDescription')).toBe(
      'No invoices found. Create your first invoice to get started.',
    );
  });

  it('shows the filtered empty-state copy when filters are active on an empty list', async () => {
    stubInvoicesData(createLoadedInvoicesData([]));

    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent({ name: 'InvoicesTable' });
    expect(table.props('rows')).toHaveLength(0);
    expect(table.props('emptyDescription')).toBe(
      'No invoices found. Create your first invoice to get started.',
    );

    await wrapper.get('[data-testid="invoices-search-intent"]').trigger('click');

    expect(table.props('emptyDescription')).toBe(
      'No invoices match the current filters.',
    );
  });

  it('renders only the PM-scoped invoices supplied by the data layer', async () => {
    const pmInvoice = createInvoiceItem({
      id: invoiceId,
      project: { id: projectId, name: 'Project Falcon' },
      title: 'PM scoped invoice',
    });
    stubInvoicesData(createLoadedInvoicesData([pmInvoice]));

    const wrapper = mountInvoicesView({ role: 'pm' });
    await flushPromises();

    const table = wrapper.findComponent({ name: 'InvoicesTable' });
    expect(table.props('rows')).toHaveLength(1);
    expect(table.props('rows')[0]).toMatchObject({
      id: invoiceId,
      title: 'PM scoped invoice',
    });

    const dialog = wrapper.findComponent({ name: 'InvoiceCreateDialog' });
    expect(dialog.props('isAdmin')).toBe(false);
  });

  it('renders three stat cards with the loaded invoice stats', async () => {
    const wrapper = mountInvoicesView();
    await flushPromises();

    const statsGrid = wrapper.get('[data-testid="invoices-stats"]');
    const statCards = statsGrid.findAllComponents({ name: 'StatCard' });

    expect(statCards).toHaveLength(3);

    const openCard = statCards[0];
    const billedCard = statCards[1];
    const draftsCard = statCards[2];

    expect(openCard.props('label')).toBe('Open Invoices');
    expect(openCard.props('value')).toBe('3');
    expect(openCard.props('description')).toBe('2 ready to send');

    expect(billedCard.props('label')).toBe('Billed This Month');
    expect(billedCard.props('value')).toBe('$2,500.00');
    expect(billedCard.props('description')).toBe(
      '2 invoices · 2 projects',
    );

    expect(draftsCard.props('label')).toBe('Drafts');
    expect(draftsCard.props('value')).toBe('2');
    expect(draftsCard.props('description')).toBe('Ready for review');
  });

  it('resets pagination and forwards filter updates when filters change', async () => {
    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent({ name: 'InvoicesTable' });
    expect(table.props('page')).toBe(1);

    await wrapper.get('[data-testid="invoices-page-2-intent"]').trigger('click');

    expect(table.props('page')).toBe(2);
    expect(getCapturedQueryValue()).toMatchObject({ page: 2 });

    await wrapper.get('[data-testid="invoices-search-intent"]').trigger('click');

    expect(table.props('page')).toBe(1);
    expect(table.props('filters')).toMatchObject({ search: 'orion' });

    expect(getCapturedQueryValue()).toMatchObject({
      limit: 20,
      page: 1,
      search: 'orion',
    });
    expect(getCapturedQueryValue().status).toBeUndefined();
    expect(getCapturedQueryValue().dateFrom).toBeUndefined();
  });

  it('resets pagination and forwards the project filter to the data query, then undefined on clear', async () => {
    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent({ name: 'InvoicesTable' });

    await wrapper.get('[data-testid="invoices-page-2-intent"]').trigger('click');
    expect(table.props('page')).toBe(2);

    await wrapper
      .get('[data-testid="invoices-project-filter-intent"]')
      .trigger('click');

    expect(table.props('page')).toBe(1);
    expect(table.props('filters')).toMatchObject({ projectId: 'project-1' });
    expect(getCapturedQueryValue()).toMatchObject({
      page: 1,
      projectId: 'project-1',
    });

    await wrapper
      .get('[data-testid="invoices-project-clear-intent"]')
      .trigger('click');

    expect(table.props('page')).toBe(1);
    expect(table.props('filters')).toMatchObject({ projectId: null });
    expect(getCapturedQueryValue().projectId).toBeUndefined();
  });

  it('resets pagination and forwards the status filter to the data query, then undefined on clear', async () => {
    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent({ name: 'InvoicesTable' });

    await wrapper.get('[data-testid="invoices-page-2-intent"]').trigger('click');
    expect(table.props('page')).toBe(2);

    await wrapper
      .get('[data-testid="invoices-status-filter-intent"]')
      .trigger('click');

    expect(table.props('page')).toBe(1);
    expect(table.props('filters')).toMatchObject({ status: 'paid' });
    expect(getCapturedQueryValue()).toMatchObject({
      page: 1,
      status: 'paid',
    });

    await wrapper
      .get('[data-testid="invoices-status-clear-intent"]')
      .trigger('click');

    expect(table.props('page')).toBe(1);
    expect(table.props('filters')).toMatchObject({ status: null });
    expect(getCapturedQueryValue().status).toBeUndefined();
  });

  it('resets pagination and forwards the date range filter to the data query, then undefined on clear', async () => {
    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent({ name: 'InvoicesTable' });

    await wrapper.get('[data-testid="invoices-page-2-intent"]').trigger('click');
    expect(table.props('page')).toBe(2);

    await wrapper
      .get('[data-testid="invoices-date-filter-intent"]')
      .trigger('click');

    expect(table.props('page')).toBe(1);
    expect(table.props('filters')).toMatchObject({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
    });
    expect(getCapturedQueryValue()).toMatchObject({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      page: 1,
    });

    await wrapper
      .get('[data-testid="invoices-date-clear-intent"]')
      .trigger('click');

    expect(table.props('page')).toBe(1);
    expect(table.props('filters')).toMatchObject({
      dateFrom: null,
      dateTo: null,
    });
    expect(getCapturedQueryValue().dateFrom).toBeUndefined();
    expect(getCapturedQueryValue().dateTo).toBeUndefined();
  });

  it('navigates to the invoice detail route on row click', async () => {
    const wrapper = mountInvoicesView();
    await flushPromises();

    await wrapper.get('[data-testid="invoices-row-open"]').trigger('click');

    expect(testMocks.routerPush).toHaveBeenCalledTimes(1);
    expect(testMocks.routerPush).toHaveBeenCalledWith({
      name: routeNames.invoiceDetail,
      params: { id: invoiceId },
    });
  });

  it('opens the create dialog from the table header action with list wiring', async () => {
    const wrapper = mountInvoicesView();
    await flushPromises();

    const dialog = wrapper.findComponent({ name: 'InvoiceCreateDialog' });
    expect(dialog.props('visible')).toBe(false);
    expect(dialog.props('isAdmin')).toBe(true);
    expect(dialog.props('projects')).toEqual([
      { id: projectId, name: 'Project Orion' },
    ]);
    expect(dialog.props('createMutation')).toBe(createMutationState);

    await wrapper.get('[data-testid="invoices-create-intent"]').trigger('click');

    expect(dialog.props('visible')).toBe(true);
  });

  it('closes the dialog and toasts success without an explicit refetch after a successful create', async () => {
    const wrapper = mountInvoicesView();
    await flushPromises();

    await wrapper.get('[data-testid="invoices-create-intent"]').trigger('click');
    expect(testMocks.createInvoice).not.toHaveBeenCalled();

    const dialog = wrapper.findComponent({ name: 'InvoiceCreateDialog' });
    await dialog.get('[data-testid="invoice-create-submit"]').trigger('click');
    await flushPromises();

    expect(testMocks.createInvoice).toHaveBeenCalledTimes(1);
    expect(dialog.props('visible')).toBe(false);
    expect(testMocks.successToast).toHaveBeenCalledWith('Invoice created');
    expect(testMocks.errorToast).not.toHaveBeenCalled();
    // The list refresh belongs to the mutation's onSuccess key invalidation,
    // so the view must not trigger an additional refetch.
    expect(testMocks.refetch).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and toasts an error after a failed create', async () => {
    const domainError = new ApiError('Hourly rate is required', {
      code: 'invoice_rate_required',
      status: 422,
    });
    testMocks.createInvoice.mockRejectedValue(domainError);

    const wrapper = mountInvoicesView();
    await flushPromises();

    await wrapper.get('[data-testid="invoices-create-intent"]').trigger('click');

    const dialog = wrapper.findComponent({ name: 'InvoiceCreateDialog' });
    expect(dialog.props('visible')).toBe(true);

    await dialog.get('[data-testid="invoice-create-submit"]').trigger('click');
    await flushPromises();

    expect(testMocks.createInvoice).toHaveBeenCalledTimes(1);
    expect(dialog.props('visible')).toBe(true);
    expect(testMocks.errorToast).toHaveBeenCalledTimes(1);
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Hourly rate is required',
      {
        error: domainError,
        logContext: { action: 'create-invoice', feature: 'invoices' },
      },
    );
    expect(testMocks.successToast).not.toHaveBeenCalled();
    expect(testMocks.refetch).not.toHaveBeenCalled();
  });

  it('renders the mobile table branch on mobile viewports', async () => {
    setMobileViewport(true);

    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent({ name: 'InvoicesTable' });
    expect(table.props('isMobileViewport')).toBe(true);
    expect(
      wrapper.find('[data-testid="invoices-table-mobile-branch"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="invoices-table-desktop-branch"]').exists(),
    ).toBe(false);
  });

  it('renders the desktop table branch on desktop viewports', async () => {
    const wrapper = mountInvoicesView();
    await flushPromises();

    const table = wrapper.findComponent({ name: 'InvoicesTable' });
    expect(table.props('isMobileViewport')).toBe(false);
    expect(
      wrapper.find('[data-testid="invoices-table-desktop-branch"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="invoices-table-mobile-branch"]').exists(),
    ).toBe(false);
  });
});