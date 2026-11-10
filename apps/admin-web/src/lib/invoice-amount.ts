/**
 * Computes the invoice total amount (in dollars) from rounded total hours, an
 * hourly rate, and a discount percent, mirroring the backend
 * `computeInvoiceTotals` integer fixed-point arithmetic.
 *
 * The amount is always rounded UP to the next whole cent (ceiling) so a
 * fractional cent is never discarded (e.g. 3.3333 -> 3.34). BigInt keeps the
 * triple product exact for large but allowed invoice totals, matching the
 * authoritative server-side value.
 */
export function computeInvoiceAmount(
  totalHours: number,
  hourlyRate: number,
  discountPercent: number,
): number {
  const totalHoursCents = Math.round(totalHours * 100);
  const rateCents = Math.round(hourlyRate * 100);
  const discountBps = Math.round(discountPercent * 100);
  const discountFactor = 10_000 - discountBps;
  const amountCents = Number(
    (BigInt(totalHoursCents) * BigInt(rateCents) * BigInt(discountFactor) +
      999_999n) /
      1_000_000n,
  );
  return amountCents / 100;
}