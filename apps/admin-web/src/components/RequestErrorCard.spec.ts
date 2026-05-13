import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { describe, expect, it } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import RequestErrorCard from './RequestErrorCard.vue';

describe('RequestErrorCard', () => {
  it('renders request-error copy and emits retry', async () => {
    const wrapper = mount(RequestErrorCard, {
      props: {
        message: 'No scope',
        title: 'Failed to load reports',
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      },
    });

    expect(wrapper.text()).toContain('Failed to load reports');
    expect(wrapper.text()).toContain('No scope');
    expect(wrapper.text()).toContain('Try again');

    await wrapper.get('button').trigger('click');

    expect(wrapper.emitted('retry')).toHaveLength(1);
  });
});
