export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

const invoiceNumberFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatInvoiceAmount(amount: number, currency: string): string {
  return `${invoiceNumberFormat.format(amount)} ${currency}`;
}
