import { describe, expect, it } from 'vitest';

import {
  getManagementTableColumnStyle,
  managementTableBodyRowClass,
  managementTableColumnPt,
  managementTableFilterAutoCompletePt,
  managementTableFilterInputClass,
  managementTableHeaderCellClass,
} from './management-table';

describe('management table filter styles', () => {
  it('keeps autocomplete text inputs square where the dropdown button attaches', () => {
    expect(managementTableFilterInputClass).toContain('rounded-[6px]');
    expect(managementTableFilterAutoCompletePt.root?.class).toContain('h-[34px]');
    expect(managementTableFilterAutoCompletePt.pcInputText?.root).toEqual({
      class: expect.stringContaining('rounded-r-none'),
    });
    expect(managementTableFilterAutoCompletePt.pcInputText?.root).toEqual({
      class: expect.stringContaining('rounded-l-[6px]'),
    });
    expect('overlay' in managementTableFilterAutoCompletePt).toBe(false);
    expect(managementTableFilterAutoCompletePt.option?.class).toBe('text-[12px]');
  });
});

describe('management table row styles', () => {
  it('puts row dividers on rows instead of duplicating borders per cell', () => {
    expect(managementTableBodyRowClass).toContain('border-b');
    expect(managementTableBodyRowClass).toContain('last:border-b-0');
    expect(managementTableColumnPt.bodyCell.class).not.toContain('border-t');
  });
});

describe('management table header styles', () => {
  it('matches the design header-cell layout', () => {
    expect(managementTableHeaderCellClass).toContain('flex');
    expect(managementTableHeaderCellClass).toContain('h-full');
    expect(managementTableHeaderCellClass).toContain('items-center');
    expect(managementTableHeaderCellClass).toContain('px-3');
    expect(managementTableHeaderCellClass).toContain('text-[13px]');
    expect(managementTableHeaderCellClass).toContain('font-semibold');
    expect(managementTableHeaderCellClass).toContain('text-text-dark');
  });

  it('maps design fill and fixed column widths to non-shrinking flex cells', () => {
    expect(getManagementTableColumnStyle({ key: 'member', label: 'Member' })).toEqual({
      flex: '1 1 0px',
      minWidth: '0',
    });
    expect(getManagementTableColumnStyle({ key: 'role', label: 'Role', width: 120 })).toEqual({
      flex: '0 0 120px',
      minWidth: '120px',
      width: '120px',
    });
  });
});
