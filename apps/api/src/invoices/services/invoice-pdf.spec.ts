import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import PdfPrinter from 'pdfmake';
import type { InvoiceResponse } from '@gitiempo/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderInvoicePdf } from './invoice-pdf';

const entry: InvoiceResponse['timeEntries'][number] = {
  id: 'entry-id',
  taskId: 'task-id',
  userId: 'user-id',
  taskName: 'Design review',
  userName: 'Reviewer',
  description: 'Review notes',
  isBillable: true,
  startedAt: '2026-11-01T12:00:00Z',
  endedAt: '2026-11-01T12:15:00Z',
  durationSeconds: 900,
  roundedDurationSeconds: 900,
};
const sender = {
  name: 'Acme',
  address: '',
  email: 'acme@example.org',
  taxId: '',
};
const payment = {
  method: 'Bank transfer',
  terms: '',
  beneficiary: '',
  provider: '',
  account: '',
  instructions: '',
};
const invoice: InvoiceResponse = {
  timeDisplayMode: 'entries',
  id: 'invoice-id',
  workspaceId: 'workspace-id',
  projectId: null,
  project: null,
  title: 'November',
  reference: 'INV-123',
  services: 'Consulting',
  status: 'sent',
  sender,
  recipient: { ...sender, name: 'Client' },
  payment,
  notes: null,
  dateFrom: '2026-11-01',
  dateTo: '2026-11-30',
  currency: 'USD',
  hourlyRate: 1.01,
  totalAmount: 0.26,
  totalHours: 0.25,
  discountPercent: 0,
  roundingStepMinutes: 15,
  timeEntries: [entry],
  timeEntryCount: 1,
  createdAt: '2026-11-01T12:15:00Z',
  updatedAt: '2026-11-01T12:15:00Z',
  createdBy: 'user-id',
  createdByName: 'Admin',
};

async function renderedPages(overrides: Partial<InvoiceResponse> = {}) {
  const printer = vi.spyOn(PdfPrinter.prototype, 'createPdfKitDocument');
  const output = await renderInvoicePdf({ ...invoice, ...overrides });
  expect(output.subarray(0, 5).toString()).toBe('%PDF-');
  // Read the actual line layout from the embedded PDFKit document so this
  // regression can run on CI without a separate native PDF extractor.
  const document = printer.mock.results.at(-1)?.value as unknown as {
    _pdfMakePages: Array<{
      items: Array<{
        type: string;
        item: { inlines?: Array<{ text: string }> };
      }>;
    }>;
  };
  return document._pdfMakePages.map((page) =>
    page.items
      .filter(({ type }) => type === 'line')
      .map(({ item }) => item.inlines!.map((inline) => inline.text).join(''))
      .join('\n'),
  );
}

afterEach(() => vi.restoreAllMocks());

async function renderedServiceRows(overrides: Partial<InvoiceResponse>) {
  const pages = await renderedPages(overrides);
  const printer = vi.mocked(PdfPrinter.prototype.createPdfKitDocument);
  const definition = printer.mock.calls.at(-1)![0] as unknown as {
    content: Array<{ table?: { body: unknown[][] } }>;
  };
  return {
    pages,
    rows: definition.content
      .find((node) => node.table?.body[0]?.length === 4)!
      .table!.body.slice(1)
      .map((row) =>
        row.map((cell, index) => {
          const value = cell as { text: string; alignment?: string };
          return index === 0
            ? value.text
            : { text: value.text, alignment: value.alignment };
        }),
      ),
  };
}

describe('invoice PDF time display', () => {
  it('matches the approved task PDF labels, Inter typography and table geometry', async () => {
    const pages = await renderedPages({ timeDisplayMode: 'tasks' });
    const printer = vi.mocked(PdfPrinter.prototype.createPdfKitDocument);
    const definition = printer.mock.calls.at(-1)![0] as unknown as {
      defaultStyle: { font: string; fontSize: number };
      content: Array<{
        table?: {
          widths: Array<{ width: number }>;
          body: Array<Array<{ text: string }>>;
        };
      }>;
    };
    const table = definition.content.find(
      (node) => node.table?.body[0]?.[0]?.text === 'Task',
    )!.table!;
    expect(pages.join('\n')).toContain('Issue date');
    expect(pages.join('\n')).not.toContain('Issued');
    expect(definition.defaultStyle).toMatchObject({
      font: 'Inter',
      fontSize: 9.75,
    });
    expect(table.widths.slice(1).map((column) => column.width)).toEqual([
      40.5, 57, 67.5,
    ]);
    const document = printer.mock.results.at(-1)!.value as unknown as {
      _pdfMakePages: Array<{
        items: Array<{
          type: string;
          item: { type?: string; color?: string; h?: number };
        }>;
      }>;
    };
    const fills = document._pdfMakePages[0].items.filter(
      ({ type, item }) =>
        type === 'vector' && item.type === 'rect' && item.color === '#E8E1F5',
    );
    expect(fills).toHaveLength(4);
    for (const fill of fills) expect(fill.item.h).toBeCloseTo(31.5, 2);
  });

  it.each([
    { rate: 2, subtotal: 0.1, taskAmounts: ['0.06', '0.04'] },
    { rate: 0.2, subtotal: 0.01, taskAmounts: ['0.00', '0.01'] },
  ])(
    'allocates a $subtotal subtotal in saved entry order before grouping tasks',
    async ({ rate, subtotal, taskAmounts }) => {
      const timeEntries = ['A', 'B', 'A'].map((taskId, index) => ({
        ...entry,
        id: String(index),
        taskId,
        taskName: 'Task ' + taskId,
        description: 'Private work ' + index,
        durationSeconds: 60,
        roundedDurationSeconds: 60,
      }));
      const billing = {
        timeEntries,
        timeEntryCount: 3,
        hourlyRate: rate,
        totalHours: 0.05,
        totalAmount: subtotal,
      };
      const entries = await renderedServiceRows({
        ...billing,
        timeDisplayMode: 'entries',
      });
      const tasks = await renderedServiceRows({
        ...billing,
        timeDisplayMode: 'tasks',
      });
      expect(tasks.rows).toEqual([
        [
          'Task A',
          { text: '0.03', alignment: 'left' },
          { text: rate.toFixed(2), alignment: 'left' },
          { text: taskAmounts[0], alignment: 'left' },
        ],
        [
          'Task B',
          { text: '0.02', alignment: 'left' },
          { text: rate.toFixed(2), alignment: 'left' },
          { text: taskAmounts[1], alignment: 'left' },
        ],
      ]);
      const sumAmounts = (rows: unknown[][]) =>
        rows.reduce(
          (sum, row) => sum + Number((row[3] as { text: string }).text),
          0,
        );
      expect(sumAmounts(tasks.rows)).toBeCloseTo(sumAmounts(entries.rows), 10);
      expect(sumAmounts(tasks.rows)).toBeCloseTo(subtotal, 10);
      for (const result of [entries, tasks]) {
        expect(result.pages.join('\n')).toContain(subtotal.toFixed(2) + ' USD');
        expect(result.pages.join('\n')).not.toContain('Discount');
      }
      expect(tasks.pages.join('\n')).not.toContain('Private work');
      expect(tasks.pages.join('\n')).not.toContain(entry.userName);
    },
  );

  it('renders only the saved selection as 17h and 8h tasks with unchanged discount and total', async () => {
    const timeEntries = [
      {
        ...entry,
        id: 'a1',
        taskId: 'A',
        taskName: 'Dashboard UX',
        roundedDurationSeconds: 36000,
      },
      {
        ...entry,
        id: 'b1',
        taskId: 'B',
        taskName: 'Invoice editing',
        roundedDurationSeconds: 28800,
      },
      {
        ...entry,
        id: 'a2',
        taskId: 'A',
        taskName: 'Dashboard UX',
        userName: 'Second worker',
        roundedDurationSeconds: 25200,
      },
    ];
    const billing = {
      timeEntries,
      timeEntryCount: 3,
      hourlyRate: 100,
      totalHours: 25,
      discountPercent: 10,
      totalAmount: 2250,
    };
    const entries = await renderedServiceRows({
      ...billing,
      timeDisplayMode: 'entries',
    });
    const tasks = await renderedServiceRows({
      ...billing,
      timeDisplayMode: 'tasks',
    });
    expect(tasks.rows).toEqual([
      [
        'Dashboard UX',
        { text: '17', alignment: 'left' },
        { text: '100.00', alignment: 'left' },
        { text: '1,700.00', alignment: 'left' },
      ],
      [
        'Invoice editing',
        { text: '8', alignment: 'left' },
        { text: '100.00', alignment: 'left' },
        { text: '800.00', alignment: 'left' },
      ],
    ]);
    for (const result of [entries, tasks]) {
      const text = result.pages.join('\n');
      expect(text).toContain('2,500.00 USD');
      expect(text).toContain('Discount · 10%');
      expect(text).toContain('−250.00 USD');
      expect(text).toContain('2,250.00 USD');
    }
    expect(tasks.pages.join('\n')).not.toContain('Second worker');
    expect(tasks.pages.join('\n')).not.toContain('Review notes');
  });

  it('exports empty task-mode invoices without task lines or charges', async () => {
    const result = await renderedServiceRows({
      timeDisplayMode: 'tasks',
      timeEntries: [],
      timeEntryCount: 0,
      totalHours: 0,
      totalAmount: 0,
      discountPercent: 10,
    });
    expect(result.rows).toEqual([]);
    expect(result.pages.join('\n')).toMatch(
      /Subtotal · 0h[\s\S]*0\.00 USD[\s\S]*Discount · 10%[\s\S]*0\.00 USD[\s\S]*TOTAL DUE[\s\S]*0\.00 USD/,
    );
  });

  it('wraps long saved task titles and paginates many tasks with repeated headers and final totals', async () => {
    const result = await renderedServiceRows({
      timeDisplayMode: 'tasks',
      timeEntries: Array.from({ length: 80 }, (_, index) => ({
        ...entry,
        id: 'entry-' + index,
        taskId: 'task-' + index,
        taskName: 'Task ' + index + ': ' + 'A long saved task title '.repeat(8),
      })),
      timeEntryCount: 80,
      totalHours: 20,
      totalAmount: 20.2,
    });
    expect(result.rows).toHaveLength(80);
    expect(result.pages.length).toBeGreaterThan(1);
    const text = result.pages.join('\n');
    expect(text).toContain('Task 79:');
    expect(text.match(/Task\nHours/g)!.length).toBeGreaterThan(1);
    expect(text.match(/TOTAL DUE/g)).toHaveLength(1);
    expect(result.pages.at(-1)).toContain('TOTAL DUE');
  });

  it.each(['entries', 'tasks'] as const)(
    'keeps unbroken %s titles and every numeric column inside A4 margins across pages',
    async (mode) => {
      const longTitle = 'W'.repeat(250);
      const result = await renderedServiceRows({
        timeDisplayMode: mode,
        timeEntries: Array.from({ length: 40 }, (_, index) => ({
          ...entry,
          id: 'entry-' + index,
          taskId: 'task-' + index,
          taskName: index === 39 ? longTitle : 'Task ' + index,
        })),
        timeEntryCount: 40,
        totalHours: 10,
        totalAmount: 10.1,
      });
      const printer = vi.mocked(PdfPrinter.prototype.createPdfKitDocument);
      const document = printer.mock.results.at(-1)!.value as unknown as {
        _pdfMakePages: Array<{
          items: Array<{
            type: string;
            item: {
              x: number;
              inlines: Array<{ text: string; x: number; width: number }>;
            };
          }>;
        }>;
      };
      const lines = document._pdfMakePages.flatMap((page) =>
        page.items
          .filter(({ type }) => type === 'line')
          .map(({ item }) => item),
      );
      for (const line of lines) {
        for (const inline of line.inlines) {
          expect(line.x + inline.x, inline.text).toBeGreaterThanOrEqual(35.99);
          expect(
            line.x + inline.x + inline.width,
            inline.text,
          ).toBeLessThanOrEqual(559.29);
        }
      }
      const titleLines = lines.filter((line) =>
        line.inlines.some((inline) => /^W+\s*$/.test(inline.text)),
      );
      expect(titleLines.length).toBeGreaterThan(1);
      expect(
        titleLines
          .flatMap((line) =>
            line.inlines
              .filter((inline) => /^W+\s*$/.test(inline.text))
              .map((inline) => inline.text.trim()),
          )
          .join(''),
      ).toBe(longTitle);
      expect(result.pages.length).toBeGreaterThan(1);
      expect(result.rows).toHaveLength(40);
      expect(result.rows.at(-1)![1]).toEqual({
        text: '0.25',
        alignment: 'left',
      });
      expect(result.rows.at(-1)![2]).toEqual({
        text: '1.01',
        alignment: 'left',
      });
      expect(result.rows.at(-1)![3]).toEqual({
        text: '0.25',
        alignment: 'left',
      });
      expect(result.pages.at(-1)).toContain('TOTAL DUE');
    },
  );
});

describe('invoice PDF pagination', () => {
  it('places the single-page footer in document flow after notes with the designed gaps', async () => {
    const pages = await renderedPages({ notes: 'Closing note' });
    expect(pages).toHaveLength(1);
    const printer = vi.mocked(PdfPrinter.prototype.createPdfKitDocument);
    const document = printer.mock.results.at(-1)!.value as unknown as {
      _pdfMakePages: Array<{
        items: Array<{
          type: string;
          item: { y: number; inlines?: Array<{ text: string }> };
        }>;
      }>;
    };
    const lines = document._pdfMakePages[0].items
      .filter(({ type }) => type === 'line')
      .map(({ item }) => item);
    const note = lines.find(
      (line) =>
        line.inlines?.map((inline) => inline.text).join('') === 'Closing note',
    )!;
    const footer = lines.find((line) =>
      line.inlines
        ?.map((inline) => inline.text)
        .join('')
        .includes('Acme · acme@example.org'),
    )!;
    expect(footer.y - note.y).toBeGreaterThan(45);
    expect(footer.y - note.y).toBeLessThan(60);
    expect(footer.y).toBeLessThan(760);
    expect(pages[0].match(/Page 1 of 1/g)).toHaveLength(1);
  });

  it('places totals before payment on a single page and uses the saved rounding', async () => {
    const pages = await renderedPages();
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatch(
      /TOTAL DUE[\s\S]*0\.26 USD[\s\S]*Payment instructions/,
    );
    expect(pages[0]).not.toContain('Discount');
  });

  it('continues a single multiline item without losing the task or its last line', async () => {
    const pages = await renderedPages({
      timeEntries: [
        { ...entry, description: 'Work\n'.repeat(160) + 'End of billed work' },
      ],
    });
    expect(pages.length).toBeGreaterThan(1);
    const text = pages.join('\n');
    expect(text).toContain('Design review');
    expect(text).toContain('End of billed work');
    expect(text.match(/Service \/ work description/g)!.length).toBeGreaterThan(
      1,
    );
    expect(pages.at(-1)).toContain('TOTAL DUE');
  });

  it('keeps page numbers on one line for long sender names', async () => {
    const pages = await renderedPages({
      sender: { ...sender, name: 'Studio '.repeat(714) },
    });
    pages.forEach((page, i) =>
      expect(page).toContain(`Page ${i + 1} of ${pages.length}`),
    );
  });

  it.each([
    {
      name: 'payment instructions',
      overrides: {
        payment: {
          ...payment,
          instructions: 'Line\n'.repeat(160) + 'Last instruction',
        },
      },
      end: 'Last instruction',
    },
    {
      name: 'notes',
      overrides: { notes: 'Note\n'.repeat(160) + 'Last note' },
      end: 'Last note',
    },
  ])(
    'preserves oversize $name and finishes the last page with one grand total',
    async ({ overrides, end }) => {
      const pages = await renderedPages(overrides);
      expect(pages.length).toBeGreaterThan(1);
      const text = pages.join('\n');
      expect(text).toContain(end);
      expect(text.match(/TOTAL DUE/g)).toHaveLength(1);
      expect(pages.at(-1)).toContain('TOTAL DUE');
      pages.forEach((page, i) =>
        expect(page).toContain(`Page ${i + 1} of ${pages.length}`),
      );
    },
  );
});

describe('invoice PNG logos', () => {
  it('rejects a saved logo with corrupt IDAT without crashing the exporting process', () => {
    const child = spawnSync(
      process.execPath,
      [
        '--require',
        'tsx/cjs',
        '-e',
        `
      const { renderInvoicePdf } = require('./src/invoices/services/invoice-pdf.ts');
      const invoice = JSON.parse(process.argv[1]);
      renderInvoicePdf(invoice).then(() => { process.exitCode = 1; }).catch(error => {
        console.log(JSON.stringify({status: error.getStatus(), code: error.getResponse().code}));
      });
    `,
        JSON.stringify({
          ...invoice,
          logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAA0lEQVRiYWSEoK5LAAAAAElFTkSuQmCC',
        }),
      ],
      {
        encoding: 'utf8',
        timeout: 15000,
      },
    );
    expect(child.status, child.stderr).toBe(0);
    expect(JSON.parse(child.stdout)).toEqual({
      status: 422,
      code: 'invoice_logo_invalid',
    });
  }, 20000);

  it.each([32, 2100])(
    'bounds decoded PNG size for a %ipx square',
    async (size) => {
      const bytes = await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: '#12345680',
        },
      })
        .png()
        .toBuffer();
      const pdf = renderInvoicePdf({
        ...invoice,
        logo: 'data:image/png;base64,' + bytes.toString('base64'),
      });
      if (size === 32) {
        expect((await pdf).subarray(0, 5).toString()).toBe('%PDF-');
      } else {
        await expect(pdf).rejects.toMatchObject({
          status: 422,
          response: { code: 'invoice_logo_invalid' },
        });
      }
    },
  );
});

describe('invoice dates and payment methods', () => {
  it('formats a single-day billing period as one date in both modes', async () => {
    for (const timeDisplayMode of ['entries', 'tasks'] as const) {
      const text = (
        await renderedPages({
          dateFrom: '2026-11-12',
          dateTo: '2026-11-12',
          timeDisplayMode,
        })
      ).join('\n');
      expect(text).toContain('12 Nov 2026');
      expect(text).not.toContain('12–12 Nov 2026');
    }
  });
  it('uses the saved issue and due dates instead of creation time', async () => {
    const text = (
      await renderedPages({ issueDate: '2026-12-02', dueDate: '2026-12-15' })
    ).join('\n');
    expect(text).toContain('02 Dec 2026');
    expect(text).toContain('15 Dec 2026');
    expect(text).toContain('Due date');
  });
  it('includes only card instructions after changing from bank transfer', async () => {
    const text = (
      await renderedPages({
        payment: {
          ...payment,
          method: 'Card',
          provider: 'Stripe',
          account: 'OLD-IBAN',
          swift: 'OLD-SWIFT',
          beneficiary: 'OLD-BENEFICIARY',
          paymentUrl: 'https://pay.example.com/invoice',
        },
      })
    ).join('\n');
    expect(text).toContain('https://pay.example.com/invoice');
    expect(text).toContain('Stripe');
    expect(text).not.toContain('OLD-');
  });
  it('includes SWIFT details for a bank transfer and omits card links', async () => {
    const text = (
      await renderedPages({
        payment: {
          ...payment,
          account: 'TEST-IBAN',
          swift: 'TESTBIC',
          paymentUrl: 'https://pay.example.com/old',
        },
      })
    ).join('\n');
    expect(text).toContain('TEST-IBAN');
    expect(text).toContain('TESTBIC');
    expect(text).not.toContain('https://pay.example.com/old');
  });
  it('omits unsafe payment links in persisted documents', async () => {
    const text = (
      await renderedPages({
        payment: {
          ...payment,
          method: 'Card',
          paymentUrl: 'javascript:alert(1)',
        },
      })
    ).join('\n');
    expect(text).not.toContain('javascript:');
  });
});
