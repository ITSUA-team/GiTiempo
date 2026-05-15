import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import Select from 'primevue/select';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import {
  createDefaultReportTableFilters,
  type ReportTableRow,
} from '@/lib/report-view-model';
import ReportsTable from './ReportsTable.vue';

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
      },
    });

    expect(wrapper.text()).toContain('Results');
    expect(wrapper.text()).toContain('Project');
    expect(wrapper.text()).toContain('Member');
    expect(wrapper.text()).toContain('Hours');
    expect(wrapper.text()).toContain('Billable');
    expect(wrapper.text()).toContain('Project Orion');
    expect(wrapper.text()).toContain('Alex Admin');
    expect(wrapper.text()).toContain('All projects');
    expect(wrapper.text()).toContain('All members');
    expect(wrapper.text()).toContain('Any');
    expect(wrapper.text()).toContain('2h 00m');
    expect(wrapper.text()).toContain('1h 00m');
    const columnFilters = wrapper.findAllComponents(Select);
    expect(columnFilters).toHaveLength(4);
    expect(columnFilters.every((filter) => filter.props('disabled') !== true)).toBe(
      true,
    );

    const search = wrapper.get('input[aria-label="Search report rows"]');
    await search.setValue('orion');

    expect(filters.global).toBe('orion');
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
      },
    });

    expect(wrapper.text()).toContain('Selected Project');
    expect(wrapper.text()).toContain('Selected Member');
    expect(wrapper.text()).toContain('Tracked');
    expect(wrapper.text()).toContain('Billable');
    expect(wrapper.text()).not.toContain('All projects');
    expect(wrapper.text()).not.toContain('All members');
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
      },
    });

    expect(wrapper.text()).toContain('Project scope');
    expect(wrapper.text()).toContain('Nina PM');
  });
});
