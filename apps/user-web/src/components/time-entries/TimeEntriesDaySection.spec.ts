// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { describe, expect, it } from 'vitest';

import TimeEntriesDaySection from './TimeEntriesDaySection.vue';
import type { TimeEntriesDayGroup } from '@/composables/useTimeEntriesPage';

const group: TimeEntriesDayGroup = {
  dateKey: '2026-04-21',
  heading: 'Today, Apr 21',
  items: [
    {
      createdAt: '2026-04-21T09:00:00.000Z',
      description: null,
      durationSeconds: null,
      endedAt: null,
      id: 'entry-running',
      isBillable: false,
      project: { id: 'project-1', name: 'Project Orion' },
      projectId: 'project-1',
      source: 'web',
      startedAt: '2026-04-21T09:00:00.000Z',
      task: { id: 'task-1', title: 'Improve reports filters' },
      taskId: 'task-1',
      updatedAt: '2026-04-21T09:00:00.000Z',
      user: {
        avatarUrl: null,
        displayName: 'Alexey Tsukanov',
        email: 'alexey@example.com',
        id: 'user-1',
      },
      userId: 'user-1',
      workspaceId: 'workspace-1',
    },
    {
      createdAt: '2026-04-21T10:30:00.000Z',
      description: 'Updated note',
      durationSeconds: 5400,
      endedAt: '2026-04-21T10:30:00.000Z',
      id: 'entry-completed',
      isBillable: false,
      project: { id: 'project-1', name: 'Project Orion' },
      projectId: 'project-1',
      source: 'manual',
      startedAt: '2026-04-21T09:00:00.000Z',
      task: { id: 'task-1', title: 'Improve reports filters' },
      taskId: 'task-1',
      updatedAt: '2026-04-21T10:30:00.000Z',
      user: {
        avatarUrl: null,
        displayName: 'Alexey Tsukanov',
        email: 'alexey@example.com',
        id: 'user-1',
      },
      userId: 'user-1',
      workspaceId: 'workspace-1',
    },
  ],
};

describe('TimeEntriesDaySection', () => {
  it('renders icon-only completed-row actions with labels and preserves running-row behavior', () => {
    const wrapper = mount(TimeEntriesDaySection, {
      props: {
        formatDuration: () => '1h 30m',
        formatTimeRange: (entry: { endedAt: string | null }) =>
          entry.endedAt === null ? '09:00 - Running' : '09:00 - 10:30',
        group,
        isDeletingEntry: null,
        showHeader: true,
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute('data-tooltip', String(binding.value));
            },
          },
        },
        plugins: [PrimeVue],
      },
    });

    const editButton = wrapper.get('[data-testid="time-entry-edit-entry-completed"]');
    const deleteButton = wrapper.get('[data-testid="time-entry-delete-entry-completed"]');

    expect(editButton.attributes('aria-label')).toBe('Edit');
    expect(editButton.attributes('data-tooltip')).toBe('Edit');
    expect(editButton.text()).toBe('');
    expect(deleteButton.attributes('aria-label')).toBe('Delete');
    expect(deleteButton.attributes('data-tooltip')).toBe('Delete');
    expect(deleteButton.text()).toBe('');
    expect(wrapper.text()).toContain('Stop from the top bar');
    expect(wrapper.find('[data-testid="time-entry-edit-entry-running"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="time-entry-delete-entry-running"]').exists()).toBe(false);
  });

  it('preserves edit and delete emits for completed entries', async () => {
    const wrapper = mount(TimeEntriesDaySection, {
      props: {
        formatDuration: () => '1h 30m',
        formatTimeRange: () => '09:00 - 10:30',
        group,
        isDeletingEntry: null,
        showHeader: true,
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute('data-tooltip', String(binding.value));
            },
          },
        },
        plugins: [PrimeVue],
      },
    });

    await wrapper.get('[data-testid="time-entry-edit-entry-completed"]').trigger('click');
    await wrapper.get('[data-testid="time-entry-delete-entry-completed"]').trigger('click');

    expect(wrapper.emitted('editEntry')?.[0]?.[0]).toMatchObject({ id: 'entry-completed' });
    expect(wrapper.emitted('deleteEntry')?.[0]?.[0]).toMatchObject({ id: 'entry-completed' });
  });

  it('uses a consistent fixed-width contract for non-task columns', () => {
    const wrapper = mount(TimeEntriesDaySection, {
      props: {
        formatDuration: () => '1h 30m',
        formatTimeRange: () => '09:00 - 10:30',
        group,
        isDeletingEntry: null,
        showHeader: true,
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute('data-tooltip', String(binding.value));
            },
          },
        },
        plugins: [PrimeVue],
      },
    });

    const columns = wrapper.findAllComponents({ name: 'Column' });

    expect(columns[0]?.props('style')).toBeNull();
    expect(columns[1]?.props('style')).toEqual({ width: '12rem' });
    expect(columns[2]?.props('style')).toEqual({ width: '10rem' });
    expect(columns[3]?.props('style')).toEqual({ width: '7rem' });
    expect(columns[4]?.props('style')).toEqual({ width: '7rem' });
    expect(wrapper.html()).toContain('table-layout: fixed');
  });

  it('keeps the destructive action in a loading-disabled state during deletion', () => {
    const wrapper = mount(TimeEntriesDaySection, {
      props: {
        formatDuration: () => '1h 30m',
        formatTimeRange: () => '09:00 - 10:30',
        group,
        isDeletingEntry: 'entry-completed',
        showHeader: true,
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute('data-tooltip', String(binding.value));
            },
          },
        },
        plugins: [PrimeVue],
      },
    });

    expect(
      wrapper.get('[data-testid="time-entry-delete-entry-completed"]').attributes(),
    ).toHaveProperty('disabled');
  });
});
