import { completeInvoiceDocumentSchema, projectInvoicePayment, type InvoicePayment } from '@gitiempo/shared';
import { ApiError } from '@gitiempo/web-shared/http';

const labels: Record<string, string> = {
  title: 'Title', issueDate: 'Issue date', dueDate: 'Due date',
  dateFrom: 'Billing period start', dateTo: 'Billing period end',
  hourlyRate: 'Hourly rate', currency: 'Currency', services: 'Services',
  'sender.name': 'Sender name', 'sender.address': 'Sender address', 'sender.email': 'Sender email',
  'recipient.name': 'Recipient name', 'recipient.address': 'Recipient address', 'recipient.email': 'Recipient email',
  'payment.method': 'Payment method', 'payment.beneficiary': 'Beneficiary',
  'payment.provider': 'Bank or payment provider', 'payment.account': 'Account or payment details',
  'payment.paymentUrl': 'HTTPS payment link',
};

export function invoiceFieldLabel(path: string): string {
  return labels[path] ?? path;
}

export function invoiceDocumentErrors(document: Record<string, unknown>): Record<string, string> {
  const payment = document.payment as InvoicePayment | null | undefined;
  const result = completeInvoiceDocumentSchema.safeParse({
    ...document,
    sender: document.sender ?? {name:'',address:'',email:'',taxId:''}, recipient: document.recipient ?? {name:'',address:'',email:'',taxId:''},
    payment: payment ? projectInvoicePayment(payment) : {method:'',terms:'',beneficiary:'',provider:'',account:'',instructions:''},
    issueDate: document.issueDate ?? (typeof document.createdAt === 'string' ? document.createdAt.slice(0, 10) : undefined),
  });
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (errors[path]) continue;
    errors[path] = (path === 'dateFrom' || path === 'dateTo') && !document[path]
      ? 'Date range is required.'
      : issue.code === 'invalid_format' && path.endsWith('.email')
      ? 'Please enter a valid email address.'
      : issue.code === 'too_big'
        ? `Use ${issue.maximum} ${typeof issue.maximum === 'number' && issue.origin === 'string' ? 'characters or fewer' : 'or less'}.`
        : (issue.code === 'too_small' && issue.origin === 'string') || issue.code === 'invalid_type'
          ? `${invoiceFieldLabel(path)} is required.`
          : issue.message;
  }
  return errors;
}

export function invoiceServerFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  if (error.code === 'invoice_total_overflow') return { hourlyRate: error.message };
  if (error.code === 'invoice_rate_required') return { hourlyRate: error.message };
  if (error.code === 'invoice_currency_required') return { currency: error.message };
  const body = error.body as { details?: { fieldErrors?: Record<string, unknown> } } | null;
  return Object.fromEntries(Object.entries(body?.details?.fieldErrors ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}
