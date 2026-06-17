import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it } from 'vitest';

import TimeEntriesDaySection from './TimeEntriesDaySection.vue';
import type { TimeEntriesDayGroup } from '@/lib/time-entry-display';
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
      id: 'entry-running',
      isBillable: false,
      project: { id: 'project-1', name: 'Project Orion' },
      projectId: 'project-1',
      source: 'web',
      startedAt: '2026-04-21T09:00:00.000Z',
      githubIssue: {
        githubRepo: 'octo/repo',
        issueNumber: 42,
      },
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
      githubIssue: {
        githubRepo: 'octo/repo',
        issueNumber: 43,
      },
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

function mountSection(props: Partial<InstanceType<typeof TimeEntriesDaySection>['$props']> = {}) {
  return mount(TimeEntriesDaySection, {
    props: {
      formatDuration: (entry: { id: string }) =>
        entry.id === 'entry-running' ? '00:45:00' : '1h 30m',
      formatTimeRange: (entry: { endedAt: string | null }) =>
        entry.endedAt === null ? '09:00 - Running' : '09:00 - 10:30',
      group,
      showHeader: true,
      ...props,
    },
    global: {
      plugins: [PrimeVue],
    },
  });
}

describe('TimeEntriesDaySection', () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  it('routes task-name clicks to the correct popup intent', async () => {
    const wrapper = mountSection();
    const runningTimerButton = wrapper.get('[data-testid="time-entry-open-timer-entry-running"]');
    const editButton = wrapper.get('[data-testid="time-entry-edit-entry-completed"]');

    expect(editButton.attributes('aria-label')).toBe('Edit time entry for Improve reports filters');
    expect(editButton.text()).toContain('Improve reports filters');
    expect(editButton.classes()).toContain('text-brand');
    expect(editButton.find('svg').exists()).toBe(false);
    expect(wrapper.text()).toContain('Stop from the top bar');
    expect(wrapper.findAll('[data-testid="time-entry-mobile-card"]')).toHaveLength(0);
    expect(runningTimerButton.element.tagName).toBe('BUTTON');
    expect(runningTimerButton.attributes('aria-label')).toBe('Update active timer for Improve reports filters');
    expect(wrapper.find('[data-testid="time-entry-start-timer-entry-running"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="time-entry-github-entry-running"]').attributes()).toMatchObject({
      href: 'https://github.com/octo/repo/issues/42',
      target: '_blank',
    });
    expect(wrapper.get('[data-testid="time-entry-github-entry-completed"]').attributes('href')).toBe(
      'https://github.com/octo/repo/issues/43',
    );
    expect(wrapper.find('[data-testid="time-entry-delete-entry-completed"]').exists()).toBe(false);

    await runningTimerButton.trigger('click');
    await wrapper.get('[data-testid="time-entry-edit-entry-completed"]').trigger('click');

    expect(wrapper.emitted('startTimer')).toBeUndefined();
    expect(wrapper.emitted('openActiveTimer')).toHaveLength(1);
    expect(wrapper.emitted('editEntry')?.[0]?.[0]).toMatchObject({ id: 'entry-completed' });
    expect(wrapper.emitted('deleteEntry')).toBeUndefined();
  });

  it('starts a fresh timer from completed desktop rows', async () => {
    const wrapper = mountSection();
    const startTimerButton = wrapper.get('[data-testid="time-entry-start-timer-entry-completed"]');

    expect(startTimerButton.attributes('aria-label')).toBe('Start timer for Improve reports filters');
    expect(startTimerButton.text()).toBe('');
    expect(startTimerButton.find('svg').exists()).toBe(true);
    expect(wrapper.find('[data-testid="time-entry-start-timer-entry-running"]').exists()).toBe(false);

    await startTimerButton.trigger('click');

    expect(wrapper.emitted('startTimer')?.[0]?.[0]).toMatchObject({ id: 'entry-completed' });
    expect(wrapper.emitted('openActiveTimer')).toBeUndefined();
    expect(wrapper.emitted('editEntry')).toBeUndefined();
  });

  it('renders mobile cards with task name openers and separate github links', async () => {
    mockMatchMedia(true);

    const wrapper = mountSection();
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
    expect(wrapper.get('[data-testid="time-entry-mobile-open-timer-entry-running"]').element.tagName).toBe('BUTTON');
    expect(wrapper.find('[data-testid="time-entry-mobile-start-timer-entry-running"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="time-entry-mobile-start-timer-entry-completed"]').attributes('aria-label')).toBe(
      'Start timer for Improve reports filters',
    );
    expect(wrapper.get('[data-testid="time-entry-mobile-github-entry-running"]').attributes('href')).toBe(
      'https://github.com/octo/repo/issues/42',
    );
    expect(wrapper.get('[data-testid="time-entry-mobile-github-entry-completed"]').attributes('href')).toBe(
      'https://github.com/octo/repo/issues/43',
    );
    expect(wrapper.find('[data-testid="time-entry-mobile-delete-entry-completed"]').exists()).toBe(false);

    await wrapper.get('[data-testid="time-entry-mobile-start-timer-entry-completed"]').trigger('click');
    await wrapper.get('[data-testid="time-entry-mobile-open-timer-entry-running"]').trigger('click');
    await wrapper.get('[data-testid="time-entry-mobile-edit-entry-completed"]').trigger('click');

    expect(wrapper.emitted('startTimer')?.[0]?.[0]).toMatchObject({ id: 'entry-completed' });
    expect(wrapper.emitted('openActiveTimer')).toHaveLength(1);
    expect(wrapper.emitted('editEntry')?.[0]?.[0]).toMatchObject({ id: 'entry-completed' });
    expect(wrapper.emitted('deleteEntry')).toBeUndefined();
  });

  it('disables direct timer starts while a start request is pending', () => {
    const wrapper = mountSection({ startingTimerEntryId: 'entry-completed' });
    const startTimerButton = wrapper.get('[data-testid="time-entry-start-timer-entry-completed"]');

    expect(startTimerButton.attributes('disabled')).toBeDefined();
  });

  it('renders the desktop entry table branch without an actions column', () => {
    const wrapper = mountSection();

    expect(wrapper.findAll('[data-testid="time-entry-mobile-card"]')).toHaveLength(0);
    expect(wrapper.text()).toContain('Task');
    expect(wrapper.text()).toContain('Project');
    expect(wrapper.text()).toContain('Time');
    expect(wrapper.text()).toContain('Duration');
    expect(wrapper.text()).not.toContain('Actions');
    expect(wrapper.text()).toContain('Stop from the top bar');
  });
});
