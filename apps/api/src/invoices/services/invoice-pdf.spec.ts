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

describe('invoice PDF pagination', () => {
  it('places totals before payment on a single page and uses the saved rounding', async () => {
    const pages = await renderedPages();
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatch(/TOTAL DUE[\s\S]*0\.26 USD[\s\S]*HOW TO PAY/);
    expect(pages[0]).toMatch(/Discount · 0%[\s\S]*0\.00 USD/);
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
