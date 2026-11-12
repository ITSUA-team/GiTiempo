import { prepareInvoiceLogo } from './invoice-logo';
import PdfPrinter from 'pdfmake';
import { join } from 'node:path';
import {
  computeInvoiceAmount,
  groupInvoiceTimeByTask,
  type InvoiceResponse,
} from '@gitiempo/shared';
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
  const fontPath = (weight: string) =>
    join(__dirname, '../../reports/assets', `Inter-${weight}.ttf`);
  const regular = fontPath('Regular');
  const semibold = fontPath('SemiBold');
  const printer = new PdfPrinter({
    Inter: {
      normal: regular,
      bold: semibold,
      italics: regular,
      bolditalics: semibold,
    },
    InterMedium: {
      normal: fontPath('Medium'),
      bold: semibold,
      italics: regular,
      bolditalics: semibold,
    },
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
    return amount;
  });
  const lines =
    invoice.timeDisplayMode === 'tasks'
      ? groupInvoiceTimeByTask(invoice.timeEntries).map((task) => ({
          description: task.taskName,
          seconds: task.roundedDurationSeconds,
          amountCents: task.sourceIndices.reduce(
            (sum, index) => sum + amounts[index],
            0,
          ),
        }))
      : invoice.timeEntries.map((entry, index) => ({
          description: [entry.taskName, entry.description]
            .filter(Boolean)
            .join(' · '),
          seconds: entry.roundedDurationSeconds,
          amountCents: amounts[index],
        }));
  const rule = () => ({
    canvas: [
      {
        type: 'rect',
        x: 0,
        y: 0,
        w: 523.28,
        h: 0.75,
        lineWidth: 0,
        color: COLOR.divider,
      },
    ],
  });
  const amountFormat = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const money = (value: number) =>
    amountFormat.format(value).replace(/^-/, '−') + ' ' + invoice.currency;
  const dateFormat = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const firstDate = new Date(invoice.dateFrom);
  const lastDate = new Date(invoice.dateTo);
  const period =
    invoice.dateFrom.slice(0, 7) === invoice.dateTo.slice(0, 7)
      ? invoice.dateFrom.slice(-2) + '–' + dateFormat.format(lastDate)
      : dateFormat.formatRange(firstDate, lastDate);
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
      {
        text: value,
        font: fontSize === 12 ? 'Inter' : 'InterMedium',
        bold: fontSize === 12,
        fontSize,
        margin: [0, 9, 0, 0],
      },
    ],
  });
  const party = (heading: string, value: typeof sender) => ({
    stack: [
      { text: heading, style: 'section', margin: [0, 0, 0, 7.5] },
      { text: value.name, fontSize: 12, bold: true },
      ...(value.address
        ? [
            {
              table: {
                widths: ['*'],
                heights: 30,
                body: [[{ text: value.address }]],
              },
              layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 0,
                paddingBottom: () => 0,
              },
              margin: [0, 7.5, 0, 0],
            },
          ]
        : []),
      ...(value.email ? [{ text: value.email, margin: [0, 7.5, 0, 0] }] : []),
      ...(value.taxId
        ? [
            {
              text: 'Tax ID ' + value.taxId,
              fontSize: 9,
              color: COLOR.textMuted,
              margin: [0, 7.5, 0, 0],
            },
          ]
        : []),
    ],
  });
  const preparedLogo = await prepareInvoiceLogo(invoice.logo);
  let logo;
  if (preparedLogo?.startsWith('data:image/png;base64,')) {
    logo = { image: preparedLogo, fit: [36, 36], width: 36 };
  } else if (preparedLogo?.startsWith('data:image/svg+xml;base64,')) {
    logo = {
      svg: Buffer.from(preparedLogo.split(',')[1], 'base64').toString(),
      fit: [36, 36],
      width: 36,
    };
  }
  const discount = Math.round((subtotal - invoice.totalAmount) * 100) / 100;
  const paymentUrl =
    payment.paymentUrl &&
    URL.canParse(payment.paymentUrl) &&
    new URL(payment.paymentUrl).protocol === 'https:'
      ? payment.paymentUrl
      : null;
  const paymentLines = [
    [payment.method, payment.terms].filter(Boolean).join(' · '),
    ...(payment.method === 'Card'
      ? [
          payment.provider,
          paymentUrl && {
            text: paymentUrl,
            link: paymentUrl,
            color: COLOR.brand,
          },
        ]
      : [
          [payment.beneficiary, payment.provider].filter(Boolean).join(' · '),
          [
            payment.account && 'Account: ' + payment.account,
            payment.method === 'Bank transfer' &&
              payment.swift &&
              'SWIFT: ' + payment.swift,
          ]
            .filter(Boolean)
            .join(' · '),
        ]),
    payment.instructions,
  ].filter(Boolean);
  const pageMargins = [36, 36, 36, 48];
  const tableCellPadding = 9;
  const numericColumnWidths = [40.5, 57, 67.5];
  const descriptionWidth =
    595.28 -
    pageMargins[0] -
    pageMargins[2] -
    tableCellPadding * (numericColumnWidths.length + 2) -
    numericColumnWidths.reduce((sum, width) => sum + width, 0);
  const pageFooter = (page: number, pages: number, inFlow: boolean) => ({
    margin: inFlow ? [0, 18, 0, 0] : [36, 6, 36, 0],
    fontSize: 8.25,
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
        columnGap: 9,
        margin: [0, inFlow ? 18 : 6, 0, 0],
      },
    ],
  });
  let pageCount = 0;
  function render(totalsLast: boolean, flowFooter = false): Promise<Buffer> {
    const content = [
      {
        table: {
          widths: ['*'],
          heights: 42,
          body: [
            [
              {
                columns: [
                  ...(logo ? [{ ...logo, margin: [0, 3, 0, 0] }] : []),
                  {
                    text: sender.name,
                    bold: true,
                    fontSize: 15,
                    width: '*',
                    margin: [0, 12, 0, 0],
                  },
                  {
                    text: 'INVOICE',
                    color: COLOR.brand,
                    bold: true,
                    fontSize: 21,
                    margin: [0, 8, 0, 0],
                    width: 'auto',
                  },
                ],
                columnGap: 9,
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 18],
      },
      rule(),
      {
        columns: [
          identification('Invoice number', invoice.reference ?? invoice.id, 12),
          identification(
            'Issue date',
            dateFormat.format(new Date(invoice.issueDate ?? invoice.createdAt)),
          ),
          ...(invoice.dueDate
            ? [
                identification(
                  'Due date',
                  dateFormat.format(new Date(invoice.dueDate)),
                ),
              ]
            : []),
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
        margin: [0, 18, 0, 6],
      },
      {
        text: [invoice.project?.name, periodLabel].filter(Boolean).join(' · '),
        color: COLOR.textMuted,
        margin: [0, 0, 0, 18],
      },
      {
        table: {
          headerRows: 1,
          heights: (row: number) => (row === 0 ? 12.75 : 14.25),
          // A star column grows to its longest word; fixed width lets pdfmake wrap it.
          widths: [descriptionWidth, ...numericColumnWidths],
          body: [
            [
              invoice.timeDisplayMode === 'tasks'
                ? 'Task'
                : 'Service / work description',
              'Hours',
              'Rate',
              'Amount',
            ].map((text) => ({
              text,
              bold: true,
              fontSize: 9,
              alignment: 'left',
              fillColor: COLOR.accentTint,
            })),
            ...lines.map((line) => [
              line.description,
              {
                text: String(Number((line.seconds / 3600).toFixed(2))),
                alignment: 'left',
              },
              {
                text: amountFormat.format(invoice.hourlyRate),
                alignment: 'left',
              },
              {
                text: amountFormat.format(line.amountCents / 100),
                alignment: 'left',
              },
            ]),
          ],
        },
        layout: {
          vLineWidth: () => 0,
          hLineWidth: (i: number) => (i > 1 ? 0.75 : 0),
          hLineColor: () => COLOR.divider,
          paddingLeft: () => tableCellPadding,
          paddingRight: (column: number) =>
            column === 3 ? tableCellPadding : 0,
          paddingTop: (row: number) => (row === 0 ? 9.375 : 12.75),
          paddingBottom: (row: number) => (row === 0 ? 9.375 : 12.75),
        },
      },
    ];
    const totals = {
      id: 'invoice-totals',
      unbreakable: true,
      margin: [0, 18, 0, totalsLast ? 0 : 18],
      stack: [
        {
          columns: [
            'Subtotal · ' + invoice.totalHours + 'h',
            {
              text: money(subtotal),
              font: 'InterMedium',
              fontSize: 10.5,
              alignment: 'right',
            },
          ],
          margin: [0, 0, 0, invoice.discountPercent > 0 ? 1.55 : 10.55],
        },
        ...(invoice.discountPercent > 0
          ? [
              {
                columns: [
                  'Discount · ' + invoice.discountPercent + '%',
                  {
                    text: money(-discount || 0),
                    fontSize: 10.5,
                    alignment: 'right',
                  },
                ],
                margin: [0, 9, 0, 10.55],
              },
            ]
          : []),
        rule(),
        {
          columns: [
            {
              text: 'TOTAL DUE',
              bold: true,
              fontSize: 10.5,
              margin: [0, 3.4, 0, 0],
            },
            {
              text: money(invoice.totalAmount),
              fontSize: 18,
              bold: true,
              color: COLOR.brand,
              alignment: 'right',
            },
          ],
          margin: [0, 9, 0, 0],
        },
      ],
    };
    const instructionsAndNotes = [
      {
        stack: [
          { text: 'Payment instructions', style: 'section' },
          ...paymentLines.map((text, index) =>
            typeof text === 'object'
              ? { ...text, margin: [0, 0, 0, 7.5] }
              : {
                  text,
                  ...(index === 0
                    ? { font: 'InterMedium', fontSize: 10.5 }
                    : {}),
                  margin: [0, 0, 0, 7.5],
                },
          ),
        ],
      },
      ...(invoice.notes
        ? [
            { text: 'Notes', bold: true, fontSize: 9, margin: [0, 10.5, 0, 6] },
            { text: invoice.notes, color: COLOR.textMuted },
          ]
        : []),
    ];
    return new Promise((resolve, reject) => {
      const doc = printer.createPdfKitDocument({
        pageSize: 'A4',
        pageMargins: flowFooter ? [36, 36, 36, 36] : pageMargins,
        defaultStyle: { font: 'Inter', fontSize: 9.75, color: COLOR.textDark },
        styles: {
          section: {
            fontSize: 9,
            bold: true,
            color: COLOR.brand,
            margin: [0, 0, 0, 7.5],
          },
          caption: { fontSize: 9, color: COLOR.textMuted },
        },
        content: [
          ...content,
          ...(totalsLast
            ? [...instructionsAndNotes, totals]
            : [totals, ...instructionsAndNotes]),
          ...(flowFooter ? [pageFooter(1, 1, true)] : []),
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
        footer: (page: number, pages: number) => {
          pageCount = pages;
          return flowFooter ? { text: '' } : pageFooter(page, pages, false);
        },
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
  if (moveTotalsToEnd) return render(true);
  if (pageCount === 1) {
    const withFlowFooter = await render(false, true);
    if (pageCount === 1) return withFlowFooter;
  }
  return pdf;
}
