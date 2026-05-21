// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ManagementTableShell from './ManagementTableShell.vue';

describe('ManagementTableShell', () => {
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
