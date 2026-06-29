import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ManagementTableShell from './ManagementTableShell.vue';

describe('ManagementTableShell', () => {
  it('uses the shared table header and hoverable body-row styling by default', () => {
    const wrapper = mount(ManagementTableShell, {
      props: {
        columns: [{ key: 'name', label: 'Name', width: 'fill' }],
        dataKey: 'id',
        loading: false,
        value: [{ id: 'row-1', name: 'Example' }],
      },
      global: {
        stubs: {
          DataTable: {
            props: ['pt'],
            template: `
              <div data-testid="datatable-stub">
                <div data-testid="body-row-class">{{ pt.bodyRow.class }}</div>
              </div>
            `,
          },
        },
      },
    });

    const headerClass = wrapper.get('[data-testid="datatable-stub"]').element
      .previousElementSibling
      ?.getAttribute('class') ?? '';
    const bodyRowClass = wrapper.get('[data-testid="body-row-class"]').text();

    expect(headerClass).toContain('text-text-dark');
    expect(headerClass).toContain('font-medium');
    expect(headerClass).toContain('uppercase');
    expect(headerClass).toContain('tracking-wide');
    expect(headerClass).not.toContain('font-semibold');
    expect(bodyRowClass).toContain('h-12');
    expect(bodyRowClass).toContain('hover:bg-app-bg');
  });

  it('can disable the PrimeVue internal scroll container for single-scroll tables', () => {
    const wrapper = mount(ManagementTableShell, {
      props: {
        columns: [{ key: 'name', label: 'Name', width: 'fill' }],
        dataKey: 'id',
        loading: false,
        singleScroll: true,
        tableContainerClass: 'overflow-visible rounded-none border-none',
        value: [{ id: 'row-1', name: 'Example' }],
      },
      global: {
        stubs: {
          DataTable: {
            props: ['pt'],
            template: `
              <div
                data-testid="table-container"
                :class="pt.tableContainer.class"
                :style="pt.tableContainer.style"
              />
            `,
          },
        },
      },
    });

    const tableContainer = wrapper.get('[data-testid="table-container"]');

    expect(tableContainer.classes()).toContain('overflow-visible');
    expect(tableContainer.attributes('style')).toContain('overflow: visible');
  });
});
