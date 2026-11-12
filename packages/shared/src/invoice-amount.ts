/** Invoice hours and rates have two decimals. Round any fractional cent up once, after discount. */
export function computeInvoiceAmount(
  totalHours: number,
  hourlyRate: number,
  discountPercent = 0,
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
