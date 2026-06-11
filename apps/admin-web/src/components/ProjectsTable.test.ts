import { mount } from '@vue/test-utils';
import type { DirectiveBinding } from 'vue';
import { describe, expect, it } from 'vitest';

import ProjectsTable from './ProjectsTable.vue';

const tooltipDirective = {
  beforeMount(element: HTMLElement, binding: DirectiveBinding<string>) {
    element.setAttribute('data-tooltip', binding.value);
  },
};

const passthroughStub = {
  template: '<div><slot /></div>',
};

describe('ProjectsTable', () => {
  it('renders new project as a table-header primary icon-only accessible action', async () => {
    const wrapper = mount(ProjectsTable, {
      props: {
        emptyDescription: 'No projects match this view.',
        expandedRows: {},
        filters: {
          global: '',
          hours: 'any',
          memberIds: [],
          projectQuery: '',
          source: null,
          visibility: null,
        },
        hoursFilterOptions: [{ label: 'Any', value: 'any' }],
        isMobileViewport: true,
        loading: false,
        memberFilterOptions: [],
        rows: [],
        sourceFilterOptions: [],
        visibilityFilterOptions: [],
      },
      global: {
        directives: {
          tooltip: tooltipDirective,
        },
        stubs: {
          AutoComplete: true,
          EmptyStateBlock: true,
          IconField: passthroughStub,
          InputIcon: true,
          InputText: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />',
          },
          MobileRecordMetadataList: true,
          SectionHeader: {
            props: ['title'],
            template: '<header><h2>{{ title }}</h2><slot name="actions" /></header>',
          },
          Select: true,
          Skeleton: true,
          Tag: true,
        },
      },
    });

    const action = wrapper.get('[data-testid="projects-table-new-project"]');

    expect(action.attributes('aria-label')).toBe('New project');
    expect(action.attributes('data-tooltip')).toBe('New project');
    expect(action.text()).toBe('');

    await action.trigger('click');

    expect(wrapper.emitted('new-project')).toEqual([[]]);
  });
});
