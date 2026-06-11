import { mount } from '@vue/test-utils';
import type { DirectiveBinding } from 'vue';
import { describe, expect, it } from 'vitest';

import MembersTable from './MembersTable.vue';

const tooltipDirective = {
  beforeMount(element: HTMLElement, binding: DirectiveBinding<string>) {
    element.setAttribute('data-tooltip', binding.value);
  },
};

const passthroughStub = {
  template: '<div><slot /></div>',
};

describe('MembersTable', () => {
  it('renders invite as a table-header primary icon-only accessible action', async () => {
    const wrapper = mount(MembersTable, {
      props: {
        emptyDescription: 'No members match this view.',
        expandedRows: {},
        filters: {
          global: '',
          lastActive: 'any',
          memberQuery: '',
          projectIds: [],
          role: null,
        },
        isMobileViewport: true,
        lastActiveFilterOptions: [{ label: 'Any activity', value: 'any' }],
        loading: false,
        projectFilterOptions: [],
        roleFilterOptions: [],
        rows: [],
      },
      global: {
        directives: {
          tooltip: tooltipDirective,
        },
        stubs: {
          AutoComplete: true,
          Avatar: true,
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
        },
      },
    });

    const action = wrapper.get('[data-testid="members-table-invite"]');

    expect(action.attributes('aria-label')).toBe('Invite member');
    expect(action.attributes('data-tooltip')).toBe('Invite member');
    expect(action.text()).toBe('');

    await action.trigger('click');

    expect(wrapper.emitted('invite-member')).toEqual([[]]);
  });
});
