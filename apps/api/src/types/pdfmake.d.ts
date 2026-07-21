/**
 * Minimal server-side typing for pdfmake's printer entrypoint. The package
 * ships no type definitions; document definitions are authored against the
 * local shapes in reports/services/report-pdf.ts.
 */
declare module 'pdfmake' {
  interface PdfKitDocumentLike {
    on(event: 'data', callback: (chunk: Buffer) => void): void;
    on(event: 'end', callback: () => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    end(): void;
  }

  class PdfPrinter {
    constructor(fonts: Record<string, Record<string, string>>);
    createPdfKitDocument(
      documentDefinition: Record<string, unknown>,
    ): PdfKitDocumentLike;
  }

  export = PdfPrinter;
}
