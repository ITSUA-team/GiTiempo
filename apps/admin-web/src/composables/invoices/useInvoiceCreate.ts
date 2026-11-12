import type { MaybeRefOrGetter } from 'vue';
import type { CreateInvoiceInput, InvoiceResponse } from '@gitiempo/shared';
import type { AdminServerStateScope } from '@/lib/query-keys';
import { adminInvoicesClient, type AdminInvoicesClient } from '@/services/admin-invoices-client';
import { useScopedInvoiceMutation } from './useScopedInvoiceMutation';

interface UseInvoiceCreateOptions {
  client?: Pick<AdminInvoicesClient, 'createInvoice'>;
  onError?: (message: string, error: unknown, action: string) => void;
  onSuccess?: () => void;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}


export function useInvoiceCreate({
  client = adminInvoicesClient, onError, onSuccess, scope,
}: UseInvoiceCreateOptions) {
  const mutation = useScopedInvoiceMutation<CreateInvoiceInput, InvoiceResponse>({
    action: 'create-invoice',
    mutationFn: (input) => client.createInvoice(input),
    onError, onSuccess, scope,
  });
  return { createInvoice: mutation.mutate, isCreating: mutation.isPending };
}
