import { describe, expect, it } from 'vitest';

import {
  getManagementTableColumnStyle,
  managementTableBodyRowClass,
  managementTableColumnPt,
  managementTableFilterAutoCompletePt,
  managementTableFilterInputClass,
  managementTableFilterMultiSelectPt,
  managementTableFilterSelectPt,
  managementTableResolvedFilterAutoCompletePt,
  managementTableHeaderCellClass,
  managementTableSelfAppendedFilterAutoCompletePt,
} from './management-table';

describe('management table filter styles', () => {
  it('keeps autocomplete text inputs square where the dropdown button attaches', () => {
    expect(managementTableFilterInputClass).toContain('rounded-[6px]');
    expect(managementTableFilterInputClass).toContain('h-[38px]');
    expect(managementTableFilterInputClass).toContain('border-divider');
    expect(managementTableFilterInputClass).toContain('text-[14px]');
    expect(managementTableFilterAutoCompletePt.root?.class).toContain('h-[38px]');
    expect(managementTableFilterAutoCompletePt.root?.class).toContain('border-divider');
    expect(managementTableFilterAutoCompletePt.pcInputText?.root).toEqual({
      class: expect.stringContaining('border-0'),
    });
    expect(managementTableFilterAutoCompletePt.pcInputText?.root).toEqual({
      class: expect.stringContaining('bg-transparent'),
    });
    expect(managementTableFilterAutoCompletePt.inputMultiple?.class).toContain(
      'min-h-[38px]',
    );
    expect(managementTableFilterAutoCompletePt.pcChip?.root?.class).toContain(
      'bg-accent-tint',
    );
    expect(managementTableFilterAutoCompletePt.dropdown?.class).toContain('h-[38px]');
    expect(managementTableFilterAutoCompletePt.dropdown?.class).toContain('w-9');
    expect(managementTableFilterAutoCompletePt.dropdown?.class).toContain('bg-transparent');
    expect('overlay' in managementTableFilterAutoCompletePt).toBe(false);
    expect(managementTableResolvedFilterAutoCompletePt.overlay?.class).toBe(
      'overflow-hidden',
    );
    expect(managementTableSelfAppendedFilterAutoCompletePt.overlay?.class).toBe(
      'overflow-hidden w-full max-w-full',
    );
    // Self-appended overlays render inside the root; overflow-hidden there
    // would clip the dropdown panel into invisibility.
    expect(
      managementTableSelfAppendedFilterAutoCompletePt.root?.class,
    ).not.toContain('overflow-hidden');
    expect(managementTableFilterAutoCompletePt.option?.class).toBe('font-sans text-[14px]');
  });

  it('keeps select and multiselect filters aligned with the shared filter height', () => {
    expect(managementTableFilterSelectPt.root?.class).toContain('h-[38px]');
    expect(managementTableFilterSelectPt.root?.class).toContain('border-divider');
    expect(managementTableFilterSelectPt.label?.class).toContain('text-[14px]');
    expect(managementTableFilterSelectPt.dropdown?.class).toContain('w-9');
    expect(managementTableFilterMultiSelectPt.root?.class).toContain('h-[38px]');
    expect(managementTableFilterMultiSelectPt.labelContainer?.class).toContain('h-full');
    expect(managementTableFilterMultiSelectPt.label?.class).toContain('text-[14px]');
    expect(managementTableFilterMultiSelectPt.dropdown?.class).toContain('w-9');
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
