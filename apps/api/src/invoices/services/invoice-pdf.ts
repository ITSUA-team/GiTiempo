import PdfPrinter from 'pdfmake';
import fonts from 'pdfmake/build/vfs_fonts';
import { computeInvoiceAmount, type InvoiceResponse } from '@gitiempo/shared';
import { HttpException } from '@nestjs/common';
import { COLOR } from '../../reports/services/report-pdf-theme';

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
  const sender = invoice.sender;
  const services = invoice.services;
  const recipient = invoice.recipient;
  const payment = invoice.payment;
  const subtotal = computeInvoiceAmount(invoice.totalHours, invoice.hourlyRate);
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
  const rule = () => ({
    canvas: [
      {
        type: 'line',
        x1: 0,
        x2: 523,
        y1: 0,
        y2: 0,
        lineWidth: 0.75,
        lineColor: COLOR.divider,
      },
    ],
  });
  const amountFormat = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const money = (value: number) =>
    amountFormat.format(value) + ' ' + invoice.currency;
  const dateFormat = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const firstDate = new Date(invoice.dateFrom);
  const lastDate = new Date(invoice.dateTo);
  const period = dateFormat.formatRange(firstDate, lastDate);
  const periodLabel =
    invoice.dateFrom.endsWith('-01') &&
    invoice.dateFrom.slice(0, 7) === invoice.dateTo.slice(0, 7) &&
    new Date(lastDate.getTime() + 86_400_000).getUTCDate() === 1
      ? new Intl.DateTimeFormat('en-GB', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(firstDate)
      : period;
  const identification = (label: string, value: string, fontSize = 10.5) => ({
    stack: [
      { text: label, style: 'caption' },
      { text: value, bold: true, fontSize, margin: [0, 9, 0, 0] },
    ],
  });
  const party = (heading: string, value: typeof sender) => ({
    stack: [
      { text: heading, style: 'section' },
      { text: value.name, fontSize: 12, bold: true },
      ...[value.address, value.email, value.taxId && 'Tax ID ' + value.taxId]
        .filter(Boolean)
        .map((text) => ({ text, margin: [0, 5, 0, 0] })),
    ],
  });
  let logo;
  if (invoice.logo?.startsWith('data:image/png;base64,')) {
    logo = { image: invoice.logo, fit: [36, 36], width: 36 };
  } else if (invoice.logo?.startsWith('data:image/svg+xml;base64,')) {
    logo = {
      svg: Buffer.from(invoice.logo.split(',')[1], 'base64').toString(),
      fit: [36, 36],
      width: 36,
    };
  }
  const discount = Math.round((subtotal - invoice.totalAmount) * 100) / 100;
  const paymentLines = [
    [payment.method, payment.terms].filter(Boolean).join(' · '),
    [payment.beneficiary, payment.provider].filter(Boolean).join(' · '),
    payment.account && 'Account: ' + payment.account,
    payment.instructions,
  ].filter(Boolean);
  function render(totalsLast: boolean): Promise<Buffer> {
    const content = [
      {
        columns: [
          ...(logo ? [{ ...logo }] : []),
          { text: sender.name, bold: true, fontSize: 15, width: '*' },
          {
            text: 'INVOICE',
            color: COLOR.brand,
            bold: true,
            fontSize: 21,
            width: 'auto',
          },
        ],
        columnGap: 9,
        margin: [0, 0, 0, 18],
      },
      rule(),
      {
        columns: [
          identification('Invoice number', invoice.reference ?? invoice.id, 12),
          identification(
            'Issued',
            dateFormat.format(new Date(invoice.createdAt)),
          ),
          identification('Billing period', period),
        ],
        columnGap: 9,
        margin: [0, 18, 0, 18],
      },
      {
        columns: [party('FROM', sender), party('BILL TO', recipient)],
        columnGap: 24,
      },
      {
        text: services,
        bold: true,
        fontSize: 13.5,
        margin: [0, 18, 0, 4],
      },
      {
        text: [invoice.project?.name, periodLabel].filter(Boolean).join(' · '),
        color: COLOR.textMuted,
        margin: [0, 0, 0, 14],
      },
      {
        table: {
          headerRows: 1,
          heights: (row: number) => (row === 0 ? 15.5 : 24.5),
          widths: ['*', 40, 57, 67],
          body: [
            ['Service / work description', 'Hours', 'Rate', 'Amount'].map(
              (text, i) => ({
                text,
                bold: true,
                fontSize: 9,
                alignment: i ? 'right' : 'left',
                fillColor: COLOR.accentTint,
              }),
            ),
            ...invoice.timeEntries.map((entry, i) => [
              [entry.taskName, entry.description].filter(Boolean).join(' · '),
              {
                text: (entry.roundedDurationSeconds / 3600).toFixed(2),
                alignment: 'right',
              },
              {
                text: amountFormat.format(invoice.hourlyRate),
                alignment: 'right',
              },
              {
                text: amountFormat.format(Number(amounts[i])),
                alignment: 'right',
              },
            ]),
          ],
        },
        layout: {
          vLineWidth: () => 0,
          hLineWidth: (i: number) => (i > 1 ? 0.5 : 0),
          hLineColor: () => COLOR.divider,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
      },
    ];
    const totals = {
      id: 'invoice-totals',
      unbreakable: true,
      margin: [0, 15, 0, 16],
      stack: [
        {
          columns: [
            'Subtotal · ' + invoice.totalHours + 'h',
            { text: money(subtotal), alignment: 'right' },
          ],
        },
        {
          columns: [
            'Discount · ' + invoice.discountPercent + '%',
            { text: money(-discount || 0), alignment: 'right' },
          ],
          margin: [0, 7, 0, 7],
        },
        rule(),
        {
          columns: [
            { text: 'TOTAL DUE', bold: true },
            {
              text: money(invoice.totalAmount),
              fontSize: 18,
              bold: true,
              color: COLOR.brand,
              alignment: 'right',
            },
          ],
          margin: [0, 7, 0, 0],
        },
      ],
    };
    const instructionsAndNotes = [
      {
        stack: [
          { text: 'HOW TO PAY', style: 'section' },
          ...paymentLines.map((text) => ({ text, margin: [0, 0, 0, 4] })),
        ],
      },
      ...(invoice.notes
        ? [
            { text: 'Notes', bold: true, fontSize: 9, margin: [0, 12, 0, 4] },
            { text: invoice.notes, color: COLOR.textMuted },
          ]
        : []),
    ];
    return new Promise((resolve, reject) => {
      const doc = printer.createPdfKitDocument({
        pageSize: 'A4',
        pageMargins: [36, 36, 36, 48],
        defaultStyle: { font: 'Roboto', fontSize: 10, color: COLOR.textDark },
        styles: {
          section: {
            fontSize: 9,
            bold: true,
            color: COLOR.brand,
            margin: [0, 0, 0, 6],
          },
          caption: { fontSize: 9, color: COLOR.textMuted },
        },
        content: [
          ...content,
          ...(totalsLast
            ? [...instructionsAndNotes, totals]
            : [totals, ...instructionsAndNotes]),
        ],
        ...(!totalsLast && {
          pageBreakBefore: (node: {
            id?: string;
            pageNumbers: number[];
            pages: number;
          }) => {
            if (node.id === 'invoice-totals')
              moveTotalsToEnd = node.pageNumbers[0] !== node.pages;
            return false;
          },
        }),
        footer: (page: number, pages: number) => ({
          margin: [36, 6, 36, 0],
          fontSize: 8,
          color: COLOR.textMuted,
          stack: [
            rule(),
            {
              columns: [
                {
                  text: [sender.name, sender.email].filter(Boolean).join(' · '),
                  width: '*',
                  maxHeight: 26,
                },
                {
                  text: `Page ${page} of ${pages}`,
                  noWrap: true,
                  alignment: 'right',
                  width: 'auto',
                },
              ],
              columnGap: 12,
              margin: [0, 6, 0, 0],
            },
          ],
        }),
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.end();
    });
  }
  // Keep the designed section order when it fits. Long payment details or notes
  // can flow beyond the totals, in which case the final page must close with them.
  let moveTotalsToEnd = false;
  const pdf = await render(false);
  return moveTotalsToEnd ? render(true) : pdf;
}
