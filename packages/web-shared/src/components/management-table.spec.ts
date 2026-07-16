import { describe, expect, it } from 'vitest';

import {
  getManagementTableColumnStyle,
  managementTableBodyRowClass,
  managementTableColumnPt,
  managementTableFilterMultiSelectPt,
  managementTableHeaderCellClass,
} from './management-table';

describe('management table filter styles', () => {
  it('keeps the assignment multiselect aligned with the shared filter height', () => {
    expect(managementTableFilterMultiSelectPt.root?.class).toContain('h-[38px]');
    expect(managementTableFilterMultiSelectPt.root?.class).toContain('border-divider');
    // The trigger is clipped inside the box so the control matches the height
    // of the Select and AutoComplete filters beside it.
    expect(managementTableFilterMultiSelectPt.root?.class).toContain('flex');
    expect(managementTableFilterMultiSelectPt.root?.class).toContain('overflow-hidden');
    expect(managementTableFilterMultiSelectPt.labelContainer?.class).toContain('h-full');
    expect(managementTableFilterMultiSelectPt.label?.class).toContain('text-[14px]');
    expect(managementTableFilterMultiSelectPt.dropdown?.class).toContain('w-9');
  });

  it('clamps the multiselect overlay to the anchor field width', () => {
    // PrimeVue sets the body-appended overlay's min-width to the field, so
    // capping max-width keeps the panel from growing with option labels.
    expect(managementTableFilterMultiSelectPt.overlay?.class).toBe(
      'max-w-0 overflow-hidden',
    );
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
