import { mount } from '@vue/test-utils';
import type { DirectiveBinding } from 'vue';
import { describe, expect, it } from 'vitest';

import type { TimeEntryResponse } from '@gitiempo/shared';

import TimeEntriesDaySection from './TimeEntriesDaySection.vue';

function setMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      matches,
      media: '(max-width: 639px)',
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    }),
  });
}

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  return {
    id: 'entry-1',
    workspaceId: 'workspace-1',
    taskId: 'task-1',
    projectId: 'project-1',
    userId: 'user-1',
    startedAt: '2026-04-21T09:00:00.000Z',
    endedAt: '2026-04-21T10:00:00.000Z',
    durationSeconds: 3600,
    description: null,
    isBillable: true,
    source: 'manual',
    createdAt: '2026-04-21T09:00:00.000Z',
    updatedAt: '2026-04-21T10:00:00.000Z',
    project: {
      id: 'project-1',
      name: 'Admin Web',
    },
    task: {
      id: 'task-1',
      title: 'Improve reports filters',
    },
    user: {
      id: 'user-1',
      email: 'member@example.test',
      displayName: 'Member',
      avatarUrl: null,
    },
    githubIssue: null,
    ...overrides,
  };
}

const tooltipDirective = {
  beforeMount(element: HTMLElement, binding: DirectiveBinding<string>) {
    element.setAttribute('data-tooltip', binding.value);
  },
};

describe('TimeEntriesDaySection', () => {
  it('renders day create as a primary icon-only accessible action', async () => {
    setMatchMedia(false);

    const wrapper = mount(TimeEntriesDaySection, {
      props: {
        formatDuration: () => '1h',
        formatTimeRange: () => '09:00-10:00',
        group: {
          dateKey: '2026-04-21',
          heading: 'Today, Apr 21',
          items: [createEntry()],
        },
        isDeletingEntry: null,
        showHeader: true,
      },
      global: {
        directives: {
          tooltip: tooltipDirective,
        },
        stubs: {
          ManagementTableShell: {
            template: '<div data-testid="desktop-time-table"><slot /></div>',
          },
          Column: true,
        },
      },
    });

    const action = wrapper.get('[data-testid="time-entries-day-create-2026-04-21"]');

    expect(action.attributes('aria-label')).toBe('New time entry');
    expect(action.attributes('data-tooltip')).toBe('New time entry');
    expect(action.text()).toBe('');

    await action.trigger('click');

    expect(wrapper.emitted('createForDay')).toEqual([['2026-04-21']]);
  });
});
