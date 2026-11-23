import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ManagementPageSkeleton from './ManagementPageSkeleton.vue';

function mountSkeleton(
  variant: 'members' | 'projects' | 'reports' | 'invoices',
) {
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

  it('uses mobile card skeletons for projects loading state', () => {
    const wrapper = mountSkeleton('projects');

    expect(wrapper.findAll('article')).toHaveLength(4);
    expect(wrapper.find('.hidden.sm\\:block').exists()).toBe(true);
  });

  it.each([
    ['members', ['152px', '220px', '184px']],
    ['projects', ['172px', '220px', '136px', '144px']],
  ] as const)('aligns the %s loading columns across the desktop table', (variant, widths) => {
    const wrapper = mountSkeleton(variant);
    const table = wrapper.get<HTMLElement>('.hidden.sm\\:block').element;

    expect(table.classList.contains('overflow-x-auto')).toBe(true);
    expect(table.children).toHaveLength(8);

    for (const row of table.children) {
      const cells = Array.from(row.children) as HTMLElement[];

      expect(row.classList.contains('min-w-[860px]')).toBe(true);
      expect(cells.map((cell) => cell.style.width)).toEqual(['', ...widths]);
      expect(cells[0]?.style.flexGrow).toBe('1');
      expect(cells.slice(1).map((cell) => cell.style.flexShrink)).toEqual(widths.map(() => '0'));
    }
  });

  it('renders three stat card skeletons for invoices loading state', () => {
    const wrapper = mountSkeleton('invoices');

    expect(wrapper.get('.grid.gap-4').findAll('.skeleton-stub')).toHaveLength(3);
  });

  it('uses mobile card skeletons and a desktop table for invoices loading state', () => {
    const wrapper = mountSkeleton('invoices');
    const mobileCards = wrapper.get('.sm\\:hidden').findAll('article');

    expect(mobileCards).toHaveLength(4);
    expect(wrapper.find('.hidden.sm\\:block').exists()).toBe(true);
  });
});
