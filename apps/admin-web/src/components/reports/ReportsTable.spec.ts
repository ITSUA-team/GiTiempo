import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import AutoComplete from 'primevue/autocomplete';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  giTiempoPrimeVueOptions,
  giTiempoSelfAppendedAutoCompleteOverlayStyle,
} from '@gitiempo/web-config/theme';

import {
  createDefaultReportTableFilters,
  type ReportGrouping,
  type ReportTableRow,
} from '@/lib/report-view-model';
import ReportsTable from './ReportsTable.vue';

type AutoCompletePt = {
  overlay?: {
    class?: string;
    style?: unknown;
  };
};

const SelectStub = defineComponent({
  props: {
    modelValue: {
      default: undefined,
      type: [String, Number, Boolean, null],
    },
    optionLabel: {
      default: 'label',
      type: String,
    },
    optionValue: {
      default: 'value',
      type: String,
    },
    options: {
      default: () => [],
      type: Array,
    },
    placeholder: {
      default: undefined,
      type: String,
    },
  },
  computed: {
    resolvedLabel(): string | undefined {
      const options = this.options as Record<string, unknown>[];
      const match = options.find(
        (option) => option?.[this.optionValue] === this.modelValue,
      );

      return (match?.[this.optionLabel] as string | undefined) ?? this.placeholder;
    },
  },
  template: '<div data-testid="select-stub">{{ resolvedLabel }}</div>',
});

function findFilter(
  wrapper: ReturnType<typeof mount>,
  key: 'project' | 'member',
) {
  const control = wrapper
    .findAllComponents(AutoComplete)
    .find(
      (candidate) =>
        candidate.props('ariaLabel') === `Filter report rows by ${key}`,
    );

  if (!control) {
    throw new Error(`No ${key} filter rendered`);
  }

  return control;
}

const rows: ReportTableRow[] = [
  {
    billableSeconds: 3600,
    billableShare: 0.5,
    entryCount: 2,
    groupBy: 'project',
    id: 'project-1',
    memberIds: ['member-1'],
    memberName: 'Alex Admin',
    nonBillableSeconds: 3600,
    projectIds: ['project-1'],
    projectName: 'Project Orion',
    totalSeconds: 7200,
  },
];

describe('ReportsTable', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
  });

  it('renders report rows and exposes the global report-row search control', async () => {
    const filters = createDefaultReportTableFilters();
    const wrapper = mount(ReportsTable, {
      props: {
        dateRange: null,
        grouping: 'member' as const,
        filters,
        loading: false,
        memberOptions: [
          { label: 'Alex Admin', value: 'member-1' },
          { label: 'Pat PM', value: 'member-2' },
        ],
        projectOptions: [
          { label: 'Project Orion', value: 'project-1' },
          { label: 'Billing API', value: 'project-2' },
        ],
        rows,
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          Select: SelectStub,
        },
      },
    });

    expect(wrapper.text()).toContain('Results');
    expect(wrapper.text()).toContain('Project');
    expect(wrapper.text()).toContain('Member');
    expect(wrapper.text()).toContain('Hours');
    expect(wrapper.text()).toContain('Billable');
    expect(wrapper.text()).toContain('Project Orion');
    expect(wrapper.text()).toContain('Alex Admin');
    expect(wrapper.text()).toContain('Any');
    expect(wrapper.text()).toContain('2h 00m');
    expect(wrapper.text()).toContain('1h 00m');
    const filterControls = wrapper.findAll('[data-testid="select-stub"]');
    expect(filterControls).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="report-mobile-card"]')).toHaveLength(0);

    const search = wrapper.get('input[aria-label="Search report rows"]');
    const autoCompleteControls = wrapper.findAllComponents(AutoComplete);
    const projectFilter = findFilter(wrapper, 'project');
    const memberFilter = findFilter(wrapper, 'member');

    expect(autoCompleteControls).toHaveLength(2);
    for (const autoCompleteControl of autoCompleteControls) {
      expect(autoCompleteControl.props('appendTo')).not.toBe('self');
      expect((autoCompleteControl.props('pt') as AutoCompletePt).overlay).toEqual({
        class: 'overflow-hidden box-content max-w-0 pr-9',
      });
    }
    expect(search.attributes('placeholder')).toBe('Search report rows');
    expect(projectFilter.props('forceSelection')).toBe(true);
    expect(memberFilter.props('forceSelection')).toBe(true);
    expect(projectFilter.props('dropdownMode')).toBe('blank');
    expect(memberFilter.props('dropdownMode')).toBe('blank');
    expect(projectFilter.props('modelValue')).toBeNull();
    expect(projectFilter.props('placeholder')).toBe('All projects');
    expect(memberFilter.props('modelValue')).toBeNull();
    expect(memberFilter.props('placeholder')).toBe('All members');

    projectFilter.vm.$emit('complete', { query: '' });
    memberFilter.vm.$emit('complete', { query: '' });
    await nextTick();

    expect(findFilter(wrapper, 'project').props('suggestions')).toEqual([
      { label: 'Project Orion', value: 'project-1' },
      { label: 'Billing API', value: 'project-2' },
    ]);
    expect(findFilter(wrapper, 'member').props('suggestions')).toEqual([
      { label: 'Alex Admin', value: 'member-1' },
      { label: 'Pat PM', value: 'member-2' },
    ]);

    await search.setValue('orion');

    projectFilter.vm.$emit('complete', { query: 'orion' });
    await nextTick();

    expect(findFilter(wrapper, 'project').props('suggestions')).toEqual([
      { label: 'Project Orion', value: 'project-1' },
    ]);

    await projectFilter.vm.$emit('update:modelValue', {
      label: 'Project Orion',
      value: 'project-1',
    });

    memberFilter.vm.$emit('complete', { query: 'alex' });
    await nextTick();

    expect(findFilter(wrapper, 'member').props('suggestions')).toEqual([
      { label: 'Alex Admin', value: 'member-1' },
    ]);

    await memberFilter.vm.$emit('update:modelValue', {
      label: 'Alex Admin',
      value: 'member-1',
    });

    expect(filters.global).toBe('orion');
    expect(filters.projectId).toBe('project-1');
    expect(filters.memberId).toBe('member-1');
  });

  it('renders mobile filters and keeps loaded report cards during refresh loading', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: true,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });

    const filters = createDefaultReportTableFilters();
    const wrapper = mount(ReportsTable, {
      props: {
        dateRange: null,
        grouping: 'member' as const,
        filters,
        loading: true,
        memberOptions: [{ label: 'Alex Admin', value: 'member-1' }],
        projectOptions: [{ label: 'Project Orion', value: 'project-1' }],
        rows,
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          Select: SelectStub,
        },
      },
    });

    const autoCompleteControls = wrapper.findAllComponents(AutoComplete);

    expect(wrapper.findAll('[data-testid="select-stub"]')).toHaveLength(3);
    expect(autoCompleteControls).toHaveLength(2);
    for (const autoCompleteControl of autoCompleteControls) {
      expect(autoCompleteControl.props('appendTo')).toBe('self');
      expect((autoCompleteControl.props('pt') as AutoCompletePt).overlay?.style).toEqual(
        giTiempoSelfAppendedAutoCompleteOverlayStyle,
      );
    }
    expect(wrapper.findAll('[data-testid="reports-mobile-loading-card"]')).toHaveLength(0);
    expect(wrapper.findAll('[data-testid="report-mobile-card"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('2h 00m');
  });

  it('renders mobile loading cards when loading has no report rows yet', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: true,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });

    const wrapper = mount(ReportsTable, {
      props: {
        dateRange: null,
        grouping: 'project' as const,
        filters: createDefaultReportTableFilters(),
        loading: true,
        memberOptions: [{ label: 'Alex Admin', value: 'member-1' }],
        projectOptions: [{ label: 'Project Orion', value: 'project-1' }],
        rows: [],
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          Select: SelectStub,
        },
      },
    });

    expect(wrapper.findAll('[data-testid="reports-mobile-loading-card"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="report-mobile-card"]')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('No report rows found');
  });

  it('renders desktop skeleton rows instead of a spinner when loading has no report rows yet', () => {
    const wrapper = mount(ReportsTable, {
      props: {
        dateRange: null,
        grouping: 'member' as const,
        filters: createDefaultReportTableFilters(),
        loading: true,
        memberOptions: [{ label: 'Alex Admin', value: 'member-1' }],
        projectOptions: [{ label: 'Project Orion', value: 'project-1' }],
        rows: [],
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          Select: SelectStub,
        },
      },
    });

    expect(wrapper.findAll('[data-testid="reports-desktop-loading-row"]')).toHaveLength(6);
    expect(wrapper.find('.p-datatable-mask').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('No report rows found');
  });

  it('keeps loaded desktop report rows without a spinner overlay during refresh loading', () => {
    const wrapper = mount(ReportsTable, {
      props: {
        dateRange: null,
        grouping: 'member' as const,
        filters: createDefaultReportTableFilters(),
        loading: true,
        memberOptions: [{ label: 'Alex Admin', value: 'member-1' }],
        projectOptions: [{ label: 'Project Orion', value: 'project-1' }],
        rows,
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          Select: SelectStub,
        },
      },
    });

    expect(wrapper.text()).toContain('Project Orion');
    expect(wrapper.findAll('[data-testid="reports-desktop-loading-row"]')).toHaveLength(0);
    expect(wrapper.find('.p-datatable-mask').exists()).toBe(false);
  });

  it('renders non-loading mobile report cards with row values on small viewports', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: true,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });

    const filters = createDefaultReportTableFilters();
    const wrapper = mount(ReportsTable, {
      props: {
        dateRange: null,
        grouping: 'member' as const,
        filters,
        loading: false,
        memberOptions: [{ label: 'Alex Admin', value: 'member-1' }],
        projectOptions: [{ label: 'Project Orion', value: 'project-1' }],
        rows,
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          Select: SelectStub,
        },
      },
    });

    const mobileCards = wrapper.findAll('[data-testid="report-mobile-card"]');

    expect(mobileCards).toHaveLength(1);
    expect(mobileCards[0]?.text()).toContain('Project Orion');
    expect(mobileCards[0]?.text()).toContain('Alex Admin');
    expect(mobileCards[0]?.text()).toContain('2h 00m');
    expect(mobileCards[0]?.text()).toContain('1h 00m');
    expect(wrapper.findAll('[data-testid="select-stub"]')).toHaveLength(3);
    expect(wrapper.findAllComponents(AutoComplete)).toHaveLength(2);
  });

  it('shows selected filter labels in the table filter row', () => {
    const filters = createDefaultReportTableFilters();
    filters.projectId = 'project-1';
    filters.memberId = 'member-1';
    filters.hours = 'gt0';
    filters.billable = 'withBillable';

    const wrapper = mount(ReportsTable, {
      props: {
        dateRange: null,
        grouping: 'project' as const,
        filters,
        loading: false,
        memberOptions: [{ label: 'Selected Member', value: 'member-1' }],
        projectOptions: [{ label: 'Selected Project', value: 'project-1' }],
        rows: [],
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          Select: SelectStub,
        },
      },
    });

    expect(wrapper.text()).toContain('Tracked');
    expect(wrapper.text()).toContain('Billable');
    expect(findFilter(wrapper, 'project').props('modelValue')).toEqual({
      label: 'Selected Project',
      value: 'project-1',
    });
    expect(findFilter(wrapper, 'member').props('modelValue')).toEqual({
      label: 'Selected Member',
      value: 'member-1',
    });
  });

  it('keeps billable hours stable when the non-billable filter is selected', () => {
    const filters = createDefaultReportTableFilters();
    filters.billable = 'withoutBillable';

    const wrapper = mount(ReportsTable, {
      props: {
        dateRange: null,
        grouping: 'project' as const,
        filters,
        loading: false,
        memberOptions: [{ label: 'Alex Admin', value: 'member-1' }],
        projectOptions: [{ label: 'Project Orion', value: 'project-1' }],
        rows: [
          {
            ...rows[0]!,
            billableSeconds: 2700,
            totalSeconds: 7200,
          },
        ],
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          Select: SelectStub,
        },
      },
    });

    expect(wrapper.text()).toContain('2h 00m');
    expect(wrapper.text()).toContain('45m');
    expect(wrapper.text()).not.toContain('1h 15m');
  });

  function mountWithGrouping(grouping: ReportGrouping, rows: ReportTableRow[]) {
    return mount(ReportsTable, {
      props: {
        dateRange: null,
        grouping,
        filters: createDefaultReportTableFilters(),
        loading: false,
        memberOptions: [{ label: 'Nina PM', value: 'member-2' }],
        projectOptions: [{ label: 'Billing API', value: 'project-2' }],
        rows,
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: { Select: SelectStub },
      },
    });
  }

  const memberRow: ReportTableRow = {
    billableSeconds: 1800,
    billableShare: 0.5,
    entryCount: 2,
    groupBy: 'user',
    id: 'user-1',
    memberIds: ['member-2'],
    memberName: 'Nina PM',
    nonBillableSeconds: 1800,
    projectIds: ['project-2'],
    projectName: 'Billing API',
    totalSeconds: 3600,
  };

  function headerKeys(wrapper: ReturnType<typeof mount>) {
    return wrapper
      .findAll('[data-testid^="management-table-header-"]')
      .map((header) => header.attributes('data-testid'));
  }

  it('counts contributors instead of naming a member under project grouping', () => {
    const wrapper = mountWithGrouping('project', [
      {
        ...memberRow,
        groupBy: 'project',
        id: 'project:project-2',
        memberIds: ['member-2', 'member-3'],
        memberName: null,
      },
    ]);

    expect(headerKeys(wrapper)).toEqual([
      'management-table-header-project',
      'management-table-header-members',
      'management-table-header-hours',
      'management-table-header-billable',
    ]);
    expect(wrapper.text()).toContain('Billing API');
    expect(wrapper.text()).toContain('2 members');
  });

  it('singularises a one-contributor project row', () => {
    const wrapper = mountWithGrouping('project', [
      { ...memberRow, groupBy: 'project', memberName: null },
    ]);

    expect(wrapper.text()).toContain('1 member');
    expect(wrapper.text()).not.toContain('1 members');
  });

  it('keeps both filters under project grouping so members can be filtered', () => {
    const wrapper = mountWithGrouping('project', [
      { ...memberRow, groupBy: 'project', memberName: null },
    ]);

    // Filtering by a member answers which projects they contributed to, which
    // no other control answers in place.
    expect(
      wrapper.find('[aria-label="Filter report rows by member"]').exists(),
    ).toBe(true);
    expect(wrapper.findAllComponents(AutoComplete)).toHaveLength(2);
  });

  it('leads with member and keeps the project breakdown under member grouping', () => {
    const wrapper = mountWithGrouping('member', [memberRow]);

    expect(headerKeys(wrapper)).toEqual([
      'management-table-header-member',
      'management-table-header-project',
      'management-table-header-hours',
      'management-table-header-billable',
    ]);
    expect(wrapper.text()).toContain('Nina PM');
    expect(wrapper.text()).toContain('Billing API');
    expect(wrapper.findAllComponents(AutoComplete)).toHaveLength(2);
  });
});
