import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { describe, expect, it } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import type { AdminDashboardActivityRow } from '@/lib/admin-dashboard-view-model';
import DashboardRecentActivityFeed from './DashboardRecentActivityFeed.vue';

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
  return mount(DashboardRecentActivityFeed, {
    props: { rows: activityRows },
    global: {
      directives: {
        tooltip: {
          mounted(el, binding) {
            el.setAttribute('data-tooltip', String(binding.value));
            el.setAttribute(
              'data-tooltip-position',
              Object.keys(binding.modifiers)[0] ?? '',
            );
          },
        },
      },
      plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
    },
  });
}

describe('DashboardRecentActivityFeed', () => {
  it('renders recent activity through design feed rows with circle indicators', () => {
    const wrapper = mountActivityTable();

    expect(wrapper.findComponent({ name: 'DataTable' }).exists()).toBe(false);
    expect(wrapper.findAllComponents({ name: 'Column' })).toHaveLength(0);
    expect(wrapper.findAllComponents({ name: 'Tag' })).toHaveLength(0);
    expect(wrapper.text()).toContain('Recent Activity');
    expect(wrapper.text()).toContain('Alex Admin was active in the workspace');
    expect(wrapper.text()).toContain('2 min ago');
    expect(wrapper.text()).toContain('2h tracked on Project Orion');
    expect(wrapper.text()).not.toContain('View all activity');
    expect(wrapper.find('[data-tooltip="Member activity"]').exists()).toBe(true);
    expect(wrapper.find('[data-tooltip-position="top"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Time activity"]').exists()).toBe(true);
  });

  it('shows a PrimeVue view-all activity button when more rows are available', async () => {
    const wrapper = mount(DashboardRecentActivityFeed, {
      props: {
        canViewAll: true,
        rows,
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

    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
    expect(wrapper.text()).toContain('View all activity');

    await wrapper.get('button').trigger('click');

    expect(wrapper.emitted('toggleViewAll')).toHaveLength(1);

    await wrapper.setProps({ expanded: true });

    expect(wrapper.text()).toContain('Show less');
  });

  it('renders a distinct empty state after a successful load with no rows', () => {
    const wrapper = mountActivityTable([]);

    expect(wrapper.text()).toContain('No recent activity');
    expect(wrapper.text()).toContain(
      'Workspace events will appear here after members, projects, invites, or tracked time update.',
    );
  });
});
