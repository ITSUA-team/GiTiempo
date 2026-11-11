import PdfPrinter from 'pdfmake';
import fonts from 'pdfmake/build/vfs_fonts';
import type { InvoiceResponse } from '@gitiempo/shared';
import { HttpException } from '@nestjs/common';

export async function renderInvoicePdf(
  invoice: InvoiceResponse,
): Promise<Buffer> {
  if (
    !invoice.sender?.name ||
    !invoice.recipient?.name ||
    !invoice.services ||
    !invoice.payment?.method
  ) {
    const missingFields = [
      ...(!invoice.sender?.name ? ['sender'] : []),
      ...(!invoice.recipient?.name ? ['recipient'] : []),
      ...(!invoice.services ? ['services'] : []),
      ...(!invoice.payment?.method ? ['payment'] : []),
    ];
    throw new HttpException(
      {
        code: 'invoice_document_incomplete',
        message: 'Complete the missing billing sections before export',
        details: { missingFields },
      },
      422,
    );
  }
  // pdfmake ships its Unicode-capable Roboto fonts as a virtual file system.
  const font = Buffer.from(fonts['Roboto-Regular.ttf'], 'base64');
  const bold = Buffer.from(fonts['Roboto-Medium.ttf'], 'base64');
  const printer = new PdfPrinter({
    Roboto: { normal: font, bold, italics: font, bolditalics: bold },
  });
  const party = (value: NonNullable<InvoiceResponse['sender']>) =>
    [value.name, value.address, value.email, value.taxId]
      .filter(Boolean)
      .join('\n');
  const payment = invoice.payment;
  const subtotal =
    Number(
      (BigInt(Math.round(invoice.totalHours * 100)) *
        BigInt(Math.round(invoice.hourlyRate * 100)) +
        99n) /
        100n,
    ) / 100;
  const seconds = invoice.timeEntries.reduce(
    (sum, e) => sum + e.roundedDurationSeconds,
    0,
  );
  let allocated = 0;
  let cumulative = 0;
  const amounts = invoice.timeEntries.map((e) => {
    cumulative += e.roundedDurationSeconds;
    const next = seconds
      ? Math.round((subtotal * 100 * cumulative) / seconds)
      : 0;
    const amount = next - allocated;
    allocated = next;
    return (amount / 100).toFixed(2);
  });
  const content: Record<string, unknown>[] = [
    { text: 'INVOICE', fontSize: 22, bold: true, margin: [0, 0, 0, 12] },
    {
      text: `${invoice.reference}\nIssued ${invoice.createdAt.slice(0, 10)}\n${invoice.dateFrom} – ${invoice.dateTo}`,
      margin: [0, 0, 0, 16],
    },
    {
      columns: [
        { text: 'FROM\n' + party(invoice.sender) },
        { text: 'BILL TO\n' + party(invoice.recipient) },
      ],
      margin: [0, 0, 0, 20],
    },
    { text: invoice.services, bold: true, margin: [0, 0, 0, 12] },
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: [
          ['Service / work description', 'Hours', 'Rate', 'Amount'],
          ...invoice.timeEntries.map((e, index) => [
            [e.taskName, e.description].filter(Boolean).join(' — '),
            (e.roundedDurationSeconds / 3600).toFixed(2),
            invoice.hourlyRate.toFixed(2),
            amounts[index],
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 16],
    },
    {
      unbreakable:
        [
          payment.method,
          payment.terms,
          payment.beneficiary,
          payment.provider,
          payment.account,
          payment.instructions,
        ].join('').length < 1500,
      stack: [
        {
          text: `Billed hours ${invoice.totalHours}\nSubtotal ${subtotal.toFixed(2)} ${invoice.currency}\nDiscount ${invoice.discountPercent}% · ${(subtotal - invoice.totalAmount).toFixed(2)} ${invoice.currency}\nTOTAL ${invoice.totalAmount.toFixed(2)} ${invoice.currency}`,
          alignment: 'right',
          bold: true,
          margin: [0, 0, 0, 20],
        },
        { text: 'HOW TO PAY', bold: true },
        {
          text: [
            payment.method,
            payment.terms,
            payment.beneficiary,
            payment.provider,
            payment.account,
            payment.instructions,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    },
    { text: invoice.notes ?? '', margin: [0, 16, 0, 0] },
  ];
  if (invoice.logo?.startsWith('data:image/png;base64,'))
    content.unshift({
      image: invoice.logo,
      fit: [80, 48],
      margin: [0, 0, 0, 12],
    });
  if (invoice.logo?.startsWith('data:image/svg+xml;base64,'))
    content.unshift({
      svg: Buffer.from(invoice.logo.split(',')[1], 'base64').toString(),
      fit: [80, 48],
      margin: [0, 0, 0, 12],
    });
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument({
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 50],
      defaultStyle: { font: 'Roboto', fontSize: 10 },
      content,
      footer: (page: number, pages: number) => ({
        text: `Page ${page} of ${pages}`,
        alignment: 'right',
        margin: [40, 10, 40, 0],
      }),
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.end();
  });
}
