import { describe, expect, it } from 'vitest';

import { formatCurrency } from './format-currency';

describe('formatCurrency', () => {
  it('formats USD amounts with two fraction digits', () => {
    expect(formatCurrency(12800, 'USD')).toBe('$12,800.00');
  });

  it('formats EUR amounts with the euro symbol', () => {
    expect(formatCurrency(8500, 'EUR')).toMatch(/(€|EUR\s*)8,500\.00/);
  });

  it('formats zero amounts', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('includes thousands separators for large numbers', () => {
    const formatted = formatCurrency(9999999.99, 'USD');

    expect(formatted).toContain(',');
    expect(formatted).toBe('$9,999,999.99');
  });

  it('does not throw for valid ISO 4217 currency codes', () => {
    const currencyCodes = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'PLN'];

    for (const currency of currencyCodes) {
      expect(() => formatCurrency(123.45, currency)).not.toThrow();
      expect(formatCurrency(123.45, currency).length).toBeGreaterThan(0);
    }
  });
});