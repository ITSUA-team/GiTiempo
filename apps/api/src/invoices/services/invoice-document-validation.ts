import { completeInvoiceDocumentSchema } from '@gitiempo/shared';
import { HttpException } from '@nestjs/common';

export function requireCompleteInvoiceDocument(candidate: unknown) {
  const result = completeInvoiceDocumentSchema.safeParse(candidate);
  if (result.success) return result.data;
  const issues = result.error.issues.map(({ path, message }) => ({
    path,
    message,
  }));
  throw new HttpException(
    {
      code: 'invoice_document_incomplete',
      error: 'ValidationError',
      message:
        'Complete the required invoice fields before saving or exporting',
      details: {
        fieldErrors: Object.fromEntries(
          issues.map((issue) => [issue.path.join('.'), issue.message]),
        ),
        missingFields: [
          ...new Set(
            issues
              .map((issue) => String(issue.path[0]))
              .filter((field) =>
                ['sender', 'recipient', 'services', 'payment'].includes(field),
              ),
          ),
        ],
      },
    },
    422,
  );
}
