import { describe, expect, it } from 'vitest';

import { computeInvoiceAmount } from './invoice-amount';

describe('computeInvoiceAmount', () => {
  it('computes exact-cent amounts without extra rounding', () => {
    // 2.5h x $80 minus 15% = $170.00
    expect(computeInvoiceAmount(2.5, 80, 15)).toBe(170);
    // 3h x $75, no discount = $225.00
    expect(computeInvoiceAmount(3, 75, 0)).toBe(225);
  });

  it('rounds a fractional cent up to the next whole cent (ceiling)', () => {
    // 3.33h x $10.01 minus 90% = $3.3333 -> $3.34 (not $3.33)
    expect(computeInvoiceAmount(3.33, 10.01, 90)).toBe(3.34);
  });

  it('rounds half-cent boundaries up', () => {
    // 0.5h x $75.21 = $37.605 -> $37.61
    expect(computeInvoiceAmount(0.5, 75.21, 0)).toBe(37.61);
  });

  it('returns 0 for a zero rate, zero hours, or 100% discount', () => {
    expect(computeInvoiceAmount(2, 0, 0)).toBe(0);
    expect(computeInvoiceAmount(0, 100, 0)).toBe(0);
    expect(computeInvoiceAmount(2, 100, 100)).toBe(0);
  });
});