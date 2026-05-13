import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import {
  createDefaultReportTableFilters,
  type ReportRow,
} from '@/composables/useReportsData';
import ReportsTable from './ReportsTable.vue';

const rows: ReportRow[] = [
  {
    billableSeconds: 3600,
    billableShare: 0.5,
    entryCount: 2,
    id: 'project-1',
    memberIds: ['member-1'],
    memberName: 'Alex Admin',
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
    expect(wrapper.text()).toContain('Project Orion');
    expect(wrapper.text()).toContain('Alex Admin');
    expect(wrapper.text()).toContain('2h 00m');
    expect(wrapper.text()).toContain('1h 00m');

    const search = wrapper.get('input[aria-label="Search report rows"]');
    await search.setValue('orion');

    expect(filters.global).toBe('orion');
  });
});
