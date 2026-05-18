import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ManagementPageSkeleton from './ManagementPageSkeleton.vue';

function mountSkeleton(variant: 'members' | 'projects' | 'reports') {
  return mount(ManagementPageSkeleton, {
    props: { variant },
    global: {
      stubs: {
        Skeleton: { template: '<div class="skeleton-stub" />' },
        SurfaceCard: { template: '<section><slot /></section>' },
      },
    },
  });
}

describe('ManagementPageSkeleton', () => {
  it('announces the loading state without an aria-title-style name', () => {
    const wrapper = mountSkeleton('members');
    const status = wrapper.get('[role="status"]');

    expect(status.attributes('aria-busy')).toBe('true');
    expect(status.attributes('aria-label')).toBeUndefined();
    expect(status.text()).toContain('Loading page content');
  });

  it('uses mobile card skeletons for members loading state', () => {
    const wrapper = mountSkeleton('members');

    expect(wrapper.findAll('article')).toHaveLength(4);
    expect(wrapper.find('.hidden.sm\\:block').exists()).toBe(true);
  });

  it('uses mobile card skeletons for reports loading state', () => {
    const wrapper = mountSkeleton('reports');

    expect(wrapper.findAll('article')).toHaveLength(4);
    expect(wrapper.find('.hidden.sm\\:block').exists()).toBe(true);
  });
});
