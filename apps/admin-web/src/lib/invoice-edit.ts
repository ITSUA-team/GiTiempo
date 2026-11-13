import type { CreateInvoiceInput, InvoiceResponse, UpdateInvoiceInput } from '@gitiempo/shared';

const emptyParty = { name: '', address: '', email: '', taxId: '' };
const emptyPayment = { method: '', terms: '', beneficiary: '', provider: '', account: '', instructions: '' };

export function savedDraft(invoice: InvoiceResponse): CreateInvoiceInput {
  return {
    issueDate: invoice.issueDate ?? invoice.createdAt.slice(0, 10), dueDate: invoice.dueDate ?? null,
    title: invoice.title, dateFrom: invoice.dateFrom, dateTo: invoice.dateTo,
    projectId: invoice.projectId ?? undefined, groupId: invoice.groupId ?? null,
    hourlyRate: invoice.hourlyRate, currency: invoice.currency, discountPercent: invoice.discountPercent,
    roundingStepMinutes: invoice.roundingStepMinutes, notes: invoice.notes ?? null,
    sender: invoice.sender ?? emptyParty, recipient: invoice.recipient ?? emptyParty,
    payment: invoice.payment ?? emptyPayment, logo: invoice.logo ?? null, services: invoice.services ?? '',
    timeEntryIds: invoice.timeEntries.map(entry => entry.id),
    timeDisplayMode: invoice.timeDisplayMode,
  };
}

const scalarFields = [
  'issueDate', 'dueDate', 'title', 'dateFrom', 'dateTo', 'projectId', 'groupId', 'hourlyRate', 'currency',
  'discountPercent', 'roundingStepMinutes', 'notes', 'logo', 'services', 'timeEntryIds', 'timeDisplayMode',
] as const;

function equal(a: unknown, b: unknown) {
  if (Array.isArray(a) && Array.isArray(b)) {
    const members = new Set(a);
    return a.length === b.length && b.every(value => members.has(value));
  }
  return a === b;
}

function describe(value: unknown) {
  if (Array.isArray(value)) return value.join(', ') || 'none';
  return String(value ?? '') || '(empty)';
}

export function reconcileInvoiceDraft(original: InvoiceResponse, local: CreateInvoiceInput, latest: InvoiceResponse) {
  const base = savedDraft(original);
  const remote = savedDraft(latest);
  const draft = { ...remote };
  const patch: UpdateInvoiceInput = {};
  const conflicts: string[] = [];
  let savedLogo: string | null | undefined;

  function localWins(field: string, before: unknown, edited: unknown, saved: unknown) {
    if (equal(before, edited) || equal(edited, saved)) return false;
    if (!equal(before, saved)) {
      if (field === 'logo') {
        savedLogo = latest.logo ?? null;
      } else {
        conflicts.push(`${field} · Saved: ${describe(saved)} · Your edit: ${describe(edited)}`);
      }
    }
    return true;
  }
  for (const key of scalarFields) {
    if (!(key in local) || !localWins(key, base[key], local[key], remote[key])) continue;
    Object.assign(draft, { [key]: local[key] });
    Object.assign(patch, { [key]: key === 'projectId' ? local[key] ?? null : local[key] });
  }
  for (const key of ['sender', 'recipient', 'payment'] as const) {
    const edited = local[key];
    if (!edited) continue;
    const merged = { ...remote[key] };
    let changed = false;
    const originalFields: Record<string, string> = base[key] ?? {};
    const savedFields: Record<string, string> = remote[key] ?? {};
    for (const [name, value] of Object.entries(edited)) {
      if (!localWins(`${key}.${name}`, originalFields[name], value, savedFields[name])) continue;
      Object.assign(merged, { [name]: value });
      changed = true;
    }
    if (changed) {
      Object.assign(draft, { [key]: merged });
      Object.assign(patch, { [key]: merged });
    }
  }
  return { patch, draft, conflicts, savedLogo };
}
