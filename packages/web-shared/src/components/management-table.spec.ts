import { describe, expect, it } from 'vitest';

import {
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
