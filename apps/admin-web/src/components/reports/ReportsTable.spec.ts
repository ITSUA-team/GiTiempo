import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import AutoComplete from 'primevue/autocomplete';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import {
  createDefaultReportTableFilters,
  type ReportTableRow,
} from '@/lib/report-view-model';
import ReportsTable from './ReportsTable.vue';

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
    expect(filterControls).toHaveLength(2);
    expect(wrapper.findAll('[data-testid="report-mobile-card"]')).toHaveLength(0);

    const autoCompleteControls = wrapper.findAllComponents(AutoComplete);
    const search = autoCompleteControls[0]!;
    const projectFilter = autoCompleteControls[1]!;
    const memberFilter = autoCompleteControls[2]!;

    expect(autoCompleteControls).toHaveLength(3);
    expect(search.props('dropdown')).toBe(true);
    expect(projectFilter.props('forceSelection')).toBe(true);
    expect(memberFilter.props('forceSelection')).toBe(true);
    expect(projectFilter.props('modelValue')).toBeNull();
    expect(projectFilter.props('placeholder')).toBe('All projects');
    expect(memberFilter.props('modelValue')).toBeNull();
    expect(memberFilter.props('placeholder')).toBe('All members');

    search.vm.$emit('complete', { query: 'orion' });
    await nextTick();

    expect(wrapper.findAllComponents(AutoComplete)[0]?.props('suggestions')).toEqual([
      'Project Orion',
    ]);

    await search.vm.$emit('update:modelValue', 'orion');

    projectFilter.vm.$emit('complete', { query: 'orion' });
    await nextTick();

    expect(wrapper.findAllComponents(AutoComplete)[1]?.props('suggestions')).toEqual([
      { label: 'Project Orion', value: 'project-1' },
    ]);

    await projectFilter.vm.$emit('update:modelValue', {
      label: 'Project Orion',
      value: 'project-1',
    });

    memberFilter.vm.$emit('complete', { query: 'alex' });
    await nextTick();

    expect(wrapper.findAllComponents(AutoComplete)[2]?.props('suggestions')).toEqual([
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

  it('renders mobile filters and loading cards without desktop table controls', () => {
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

    expect(wrapper.findAll('[data-testid="select-stub"]')).toHaveLength(2);
    expect(wrapper.findAllComponents(AutoComplete)).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="reports-mobile-loading-card"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="report-mobile-card"]')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('2h 00m');
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
    expect(wrapper.findAll('[data-testid="select-stub"]')).toHaveLength(2);
    expect(wrapper.findAllComponents(AutoComplete)).toHaveLength(3);
  });

  it('shows selected filter labels in the table filter row', () => {
    const filters = createDefaultReportTableFilters();
    filters.projectId = 'project-1';
    filters.memberId = 'member-1';
    filters.hours = 'gt0';
    filters.billable = 'withBillable';

    const wrapper = mount(ReportsTable, {
      props: {
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
    expect(wrapper.findAllComponents(AutoComplete)[1]?.props('modelValue')).toEqual({
      label: 'Selected Project',
      value: 'project-1',
    });
    expect(wrapper.findAllComponents(AutoComplete)[2]?.props('modelValue')).toEqual({
      label: 'Selected Member',
      value: 'member-1',
    });
  });

  it('keeps billable hours stable when the non-billable filter is selected', () => {
    const filters = createDefaultReportTableFilters();
    filters.billable = 'withoutBillable';

    const wrapper = mount(ReportsTable, {
      props: {
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

  it('renders mapped API row variants with the existing report columns', () => {
    const filters = createDefaultReportTableFilters();

    const wrapper = mount(ReportsTable, {
      props: {
        filters,
        loading: false,
        memberOptions: [{ label: 'Nina PM', value: 'member-2' }],
        projectOptions: [{ label: 'Billing API', value: 'project-2' }],
        rows: [
          {
            billableSeconds: 1800,
            billableShare: 0.5,
            entryCount: 2,
            groupBy: 'user',
            id: 'user-1',
            memberIds: ['member-2'],
            memberName: 'Nina PM',
            nonBillableSeconds: 1800,
            projectIds: [],
            projectName: 'Project scope',
            totalSeconds: 3600,
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

    expect(wrapper.text()).toContain('Project scope');
    expect(wrapper.text()).toContain('Nina PM');
  });
});
