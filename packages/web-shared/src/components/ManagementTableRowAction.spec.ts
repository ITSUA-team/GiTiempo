import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it } from 'vitest';

import ManagementTableRowAction from './ManagementTableRowAction.vue';

const TestIcon = defineComponent({
  name: 'TestIcon',
  render() {
    return h('svg', { viewBox: '0 0 16 16' }, [h('path', { d: 'M0 0h16v16H0z' })]);
  },
});

describe('ManagementTableRowAction', () => {
  it('renders an icon-only button with tooltip, accessible label, and passthrough attrs', () => {
    const wrapper = mount(ManagementTableRowAction, {
      props: {
        icon: TestIcon,
        label: 'Edit',
        tone: 'brand',
      },
      attrs: {
        'data-testid': 'row-action-edit',
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute('data-tooltip', String(binding.value));
            },
          },
        },
      },
    });

    const button = wrapper.get('button[data-testid="row-action-edit"]');

    expect(button.attributes('aria-label')).toBe('Edit');
    expect(button.attributes('data-tooltip')).toBe('Edit');
    expect(button.text()).toBe('');
    expect(button.classes()).toContain('h-11');
    expect(button.classes()).toContain('w-11');
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('re-emits click through an explicit component contract', async () => {
    const wrapper = mount(ManagementTableRowAction, {
      props: {
        icon: TestIcon,
        label: 'Edit',
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute('data-tooltip', String(binding.value));
            },
          },
        },
      },
    });

    await wrapper.get('button').trigger('click');

    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('preserves destructive styling and disables the button while loading', () => {
    const wrapper = mount(ManagementTableRowAction, {
      props: {
        icon: TestIcon,
        label: 'Remove',
        loading: true,
        tone: 'destructive',
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute('data-tooltip', String(binding.value));
            },
          },
        },
      },
    });

    const button = wrapper.get('button');

    expect(button.attributes('aria-label')).toBe('Remove');
    expect(button.attributes('data-tooltip')).toBe('Remove');
    expect(button.attributes()).toHaveProperty('disabled');
    expect(button.classes()).toContain('text-destructive');
  });
});
