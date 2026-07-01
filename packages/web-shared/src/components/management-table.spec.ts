import { describe, expect, it } from 'vitest';

import {
  managementTableBodyRowClass,
  managementTableColumnPt,
  managementTableFilterAutoCompletePt,
  managementTableFilterInputClass,
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
