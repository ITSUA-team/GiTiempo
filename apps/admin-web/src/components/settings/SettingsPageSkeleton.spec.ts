import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SettingsPageSkeleton from './SettingsPageSkeleton.vue';

describe('SettingsPageSkeleton', () => {
  it('mirrors the Settings form action layout on mobile', () => {
    const wrapper = mount(SettingsPageSkeleton, {
      global: {
        stubs: {
          Skeleton: { template: '<div data-testid="skeleton" />' },
          SurfaceCard: { template: '<section><slot /></section>' },
        },
      },
    });

    const actionRow = wrapper.get('[data-testid="settings-skeleton-actions"]');
    const actionPlaceholders = actionRow.findAll('.w-full');

    expect(actionRow.classes()).toEqual(
      expect.arrayContaining(['flex-col-reverse', 'sm:flex-row', 'sm:justify-end']),
    );
    expect(actionPlaceholders).toHaveLength(2);
    expect(actionPlaceholders[0]?.classes()).toContain('sm:w-[5.5rem]');
    expect(actionPlaceholders[1]?.classes()).toContain('sm:w-[8.5rem]');
  });
});
