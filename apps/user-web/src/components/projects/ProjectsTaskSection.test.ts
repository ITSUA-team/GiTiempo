import { mount } from '@vue/test-utils';
import type { DirectiveBinding } from 'vue';
import { describe, expect, it } from 'vitest';

import type { ProjectResponse, TaskResponse } from '@gitiempo/shared';

import ProjectsTaskSection from './ProjectsTaskSection.vue';

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

function createProject(): ProjectResponse {
  return {
    id: 'project-1',
    workspaceId: 'workspace-1',
    name: 'Project Orion',
    description: null,
    color: null,
    visibility: 'public',
    source: 'manual',
    totalSeconds: 0,
    members: [],
    isActive: true,
    createdAt: '2026-04-21T09:00:00.000Z',
    updatedAt: '2026-04-21T10:00:00.000Z',
  };
}

function createTask(): TaskResponse {
  return {
    assignees: [],
    id: 'task-1',
    githubIssue: null,
    workspaceId: 'workspace-1',
    projectId: 'project-1',
    title: 'Improve reports filters',
    description: null,
    priority: 'medium',
    status: 'open',
    isActive: true,
    createdAt: '2026-04-21T09:00:00.000Z',
    updatedAt: '2026-04-21T10:00:00.000Z',
  };
}

const tooltipDirective = {
  beforeMount(element: HTMLElement, binding: DirectiveBinding<string>) {
    element.setAttribute('data-tooltip', binding.value);
  },
};

function mountSection(matchesMobileViewport: boolean) {
  setMatchMedia(matchesMobileViewport);

  return mount(ProjectsTaskSection, {
    props: {
      formatUpdatedLabel: () => 'Today 10:00',
      isDeletingTaskId: null,
      project: createProject(),
      tasks: [createTask()],
    },
    global: {
      directives: {
        tooltip: tooltipDirective,
      },
      stubs: {
        ManagementTableShell: {
          template: '<div data-testid="desktop-task-table"><slot /></div>',
        },
        MobileRecordCard: {
          template:
            '<article v-bind="$attrs"><slot /><slot name="actions" /></article>',
        },
        ManagementTableRowAction: true,
        Column: true,
      },
    },
  });
}

describe('ProjectsTaskSection', () => {
  it('renders desktop project add as a primary icon-only accessible action', async () => {
    const wrapper = mountSection(false);
    const action = wrapper.get('[data-testid="project-section-add-task"]');

    expect(wrapper.find('[data-testid="desktop-task-table"]').exists()).toBe(true);
    expect(action.attributes('aria-label')).toBe('Add task');
    expect(action.attributes('data-tooltip')).toBe('Add task');
    expect(action.text()).toBe('');

    await action.trigger('click');

    expect(wrapper.emitted('addTask')).toEqual([['project-1']]);
  });

  it('keeps the same project add action in the mobile card branch', async () => {
    const wrapper = mountSection(true);
    const action = wrapper.get('[data-testid="project-section-add-task"]');

    expect(wrapper.find('[data-testid="project-task-mobile-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="desktop-task-table"]').exists()).toBe(false);
    expect(action.attributes('aria-label')).toBe('Add task');
    expect(action.attributes('data-tooltip')).toBe('Add task');

    await action.trigger('click');

    expect(wrapper.emitted('addTask')).toEqual([['project-1']]);
  });
});
