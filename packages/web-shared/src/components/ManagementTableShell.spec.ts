import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ManagementTableShell from './ManagementTableShell.vue';

describe('ManagementTableShell', () => {
  it('uses the shared table header and body-row styling by default', () => {
    const wrapper = mount(ManagementTableShell, {
      props: {
        columns: [
          { key: 'name', label: 'Name', width: 'fill' },
          { key: 'hours', label: 'Hours', width: 120, align: 'end' },
        ],
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
    const nameHeader = wrapper.get('[data-testid="management-table-header-name"]');
    const hoursHeader = wrapper.get('[data-testid="management-table-header-hours"]');
    const bodyRowClass = wrapper.get('[data-testid="body-row-class"]').text();

    expect(headerClass).toContain('text-text-dark');
    expect(headerClass).toContain('font-semibold');
    expect(headerClass).toContain('h-[44px]');
    expect(headerClass).toContain('w-full');
    expect(headerClass).not.toContain('uppercase');
    expect(headerClass).not.toContain('tracking-wide');
    expect(headerClass).not.toContain('font-medium');
    expect(nameHeader.classes()).toEqual(
      expect.arrayContaining(['flex', 'h-full', 'items-center', 'px-3', 'justify-start']),
    );
    expect(nameHeader.attributes('style')).toContain('flex: 1 1 0px');
    expect(nameHeader.attributes('style')).toContain('min-width: 0');
    expect(hoursHeader.classes()).toEqual(
      expect.arrayContaining(['flex', 'h-full', 'items-center', 'px-3', 'justify-end']),
    );
    expect(hoursHeader.attributes('style')).toContain('flex: 0 0 120px');
    expect(hoursHeader.attributes('style')).toContain('min-width: 120px');
    expect(hoursHeader.attributes('style')).toContain('width: 120px');
    expect(bodyRowClass).toContain('h-12');
    expect(bodyRowClass).toContain('border-b');
    expect(bodyRowClass).toContain('last:border-b-0');
    expect(bodyRowClass).toContain('hover:bg-app-bg');
  });

  it('separates filter rows from table headers with the design divider', () => {
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
            template: '<div data-testid="datatable-stub" />',
          },
        },
      },
      slots: {
        filters: '<div data-testid="filters-slot" />',
      },
    });

    const filterRowClass = wrapper.get('[data-testid="filters-slot"]').element
      .parentElement
      ?.getAttribute('class') ?? '';

    expect(filterRowClass).toContain('border-t');
    expect(filterRowClass).toContain('border-divider');
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
