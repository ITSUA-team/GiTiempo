import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { describe, expect, it } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import type { AdminDashboardActivityRow } from '@/lib/admin-dashboard-view-model';
import DashboardRecentActivityTable from './DashboardRecentActivityTable.vue';

const rows: AdminDashboardActivityRow[] = [
  {
    activity: 'Alex Admin was active in the workspace',
    id: 'member:1:last-active',
    occurredAt: '2026-05-13T11:58:00.000Z',
    timeLabel: '2 min ago',
    timestamp: new Date('2026-05-13T11:58:00.000Z').getTime(),
    type: 'member',
    typeLabel: 'Member',
  },
  {
    activity: '2h tracked on Project Orion',
    id: 'time:project:1',
    occurredAt: '2026-05-13T11:42:00.000Z',
    timeLabel: '18 min ago',
    timestamp: new Date('2026-05-13T11:42:00.000Z').getTime(),
    type: 'time',
    typeLabel: 'Time',
  },
];

function mountActivityTable(activityRows = rows) {
  return mount(DashboardRecentActivityTable, {
    props: { rows: activityRows },
    global: {
      plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
    },
  });
}

describe('DashboardRecentActivityTable', () => {
  it('renders recent activity through a PrimeVue DataTable', () => {
    const wrapper = mountActivityTable();

    expect(wrapper.findComponent({ name: 'DataTable' }).exists()).toBe(true);
    expect(wrapper.findAllComponents({ name: 'Column' })).toHaveLength(3);
    expect(wrapper.text()).toContain('Recent Activity');
    expect(wrapper.text()).toContain('Alex Admin was active in the workspace');
    expect(wrapper.text()).toContain('Member');
    expect(wrapper.text()).toContain('2 min ago');
    expect(wrapper.text()).toContain('2h tracked on Project Orion');
    expect(wrapper.text()).toContain('Time');
  });

  it('renders a distinct empty state after a successful load with no rows', () => {
    const wrapper = mountActivityTable([]);

    expect(wrapper.text()).toContain('No recent activity');
    expect(wrapper.text()).toContain(
      'Workspace events will appear here after members, projects, invites, or tracked time update.',
    );
  });
});
