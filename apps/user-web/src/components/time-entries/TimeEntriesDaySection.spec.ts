// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it } from 'vitest';

import TimeEntriesDaySection from './TimeEntriesDaySection.vue';
import type { TimeEntriesDayGroup } from '@/composables/useTimeEntriesPage';
import { mockMatchMedia } from '@/test/mockMatchMedia';

const group: TimeEntriesDayGroup = {
  dateKey: '2026-04-21',
  heading: 'Today, Apr 21',
  items: [
    {
      createdAt: '2026-04-21T09:00:00.000Z',
      description: null,
      durationSeconds: null,
      endedAt: null,
      githubIssue: null,
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
      githubIssue: null,
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
  const formatDuration = (entry: { id: string }) =>
    entry.id === 'entry-running' ? '00:45:00' : '1h 30m';
  const formatTimeRange = (entry: { endedAt: string | null }) =>
    entry.endedAt === null ? '09:00 - Running' : '09:00 - 10:30';

  beforeEach(() => {
    mockMatchMedia();
  });

  it('renders icon-only completed-row actions with labels and preserves running-row behavior', () => {
    const wrapper = mount(TimeEntriesDaySection, {
      props: {
        formatDuration,
        formatTimeRange,
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
    expect(wrapper.findAll('[data-testid="time-entry-mobile-card"]')).toHaveLength(0);
    expect(wrapper.find('[data-testid="time-entry-edit-entry-running"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="time-entry-delete-entry-running"]').exists()).toBe(false);
  });

  it('renders mobile cards and preserves running/completed behavior on small viewports', async () => {
    mockMatchMedia(true);

    const wrapper = mount(TimeEntriesDaySection, {
      props: {
        formatDuration,
        formatTimeRange,
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

    const mobileCards = wrapper.findAll('[data-testid="time-entry-mobile-card"]');

    expect(mobileCards).toHaveLength(2);
    expect(mobileCards[0]?.classes()).toContain('bg-accent-tint');
    expect(mobileCards[0]?.text()).toContain('Improve reports filters');
    expect(mobileCards[0]?.text()).toContain('Project Orion');
    expect(mobileCards[0]?.text()).toContain('09:00 - Running');
    expect(mobileCards[0]?.text()).toContain('00:45:00');
    expect(mobileCards[0]?.text()).toContain('Stop from the top bar');
    expect(mobileCards[1]?.text()).toContain('Improve reports filters');
    expect(mobileCards[1]?.text()).toContain('Updated note');
    expect(mobileCards[1]?.text()).toContain('Project Orion');
    expect(mobileCards[1]?.text()).toContain('09:00 - 10:30');
    expect(mobileCards[1]?.text()).toContain('1h 30m');
    expect(wrapper.find('[data-testid="time-entry-mobile-edit-entry-running"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="time-entry-mobile-delete-entry-running"]').exists()).toBe(false);

    await wrapper.get('[data-testid="time-entry-mobile-edit-entry-completed"]').trigger('click');
    await wrapper.get('[data-testid="time-entry-mobile-delete-entry-completed"]').trigger('click');

    expect(wrapper.emitted('editEntry')?.[0]?.[0]).toMatchObject({ id: 'entry-completed' });
    expect(wrapper.emitted('deleteEntry')?.[0]?.[0]).toMatchObject({ id: 'entry-completed' });
  });

  it('preserves edit and delete emits for completed entries', async () => {
    const wrapper = mount(TimeEntriesDaySection, {
      props: {
        formatDuration,
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

  it('renders the desktop entry table branch with the expected column labels', () => {
    const wrapper = mount(TimeEntriesDaySection, {
      props: {
        formatDuration,
        formatTimeRange,
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

    expect(wrapper.findAll('[data-testid="time-entry-mobile-card"]')).toHaveLength(0);
    expect(wrapper.text()).toContain('Task');
    expect(wrapper.text()).toContain('Project');
    expect(wrapper.text()).toContain('Time');
    expect(wrapper.text()).toContain('Duration');
    expect(wrapper.text()).toContain('Stop from the top bar');
  });

  it('keeps the destructive action in a loading-disabled state during deletion', () => {
    const wrapper = mount(TimeEntriesDaySection, {
      props: {
        formatDuration,
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
