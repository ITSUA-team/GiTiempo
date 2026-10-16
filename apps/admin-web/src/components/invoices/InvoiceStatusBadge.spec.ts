import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import InvoiceStatusBadge from './InvoiceStatusBadge.vue';

vi.mock('primevue/tag', () => ({
  default: {
    name: 'Tag',
    props: ['pt', 'severity', 'value'],
    template: '<span>{{ value }}</span>',
  },
}));

function mountBadge(status: 'draft' | 'paid' | 'sent') {
  return mount(InvoiceStatusBadge, {
    props: { status },
  });
}

describe('InvoiceStatusBadge', () => {
  it('renders a draft invoice with warn severity and warn token colors', async () => {
    const wrapper = mountBadge('draft');

    const tag = wrapper.findComponent({ name: 'Tag' });

    expect(tag.exists()).toBe(true);
    expect(tag.props('value')).toBe('Draft');
    expect(tag.props('severity')).toBe('warn');
    expect(tag.props('pt').root).toContain('bg-status-warn-bg');
    expect(tag.props('pt').root).toContain('text-status-warn-text');
  });

  it('renders a sent invoice with the accent-tint default style and no severity', () => {
    const wrapper = mountBadge('sent');

    const tag = wrapper.findComponent({ name: 'Tag' });

    expect(tag.exists()).toBe(true);
    expect(tag.props('value')).toBe('Sent');
    expect(tag.props('severity')).toBeUndefined();
    expect(tag.props('pt').root).toContain('bg-accent-tint');
    expect(tag.props('pt').root).toContain('text-brand');
  });

  it('renders a paid invoice with success severity and active token colors', () => {
    const wrapper = mountBadge('paid');

    const tag = wrapper.findComponent({ name: 'Tag' });

    expect(tag.exists()).toBe(true);
    expect(tag.props('value')).toBe('Paid');
    expect(tag.props('severity')).toBe('success');
    expect(tag.props('pt').root).toContain('bg-status-active-bg');
    expect(tag.props('pt').root).toContain('text-status-active-text');
  });
});