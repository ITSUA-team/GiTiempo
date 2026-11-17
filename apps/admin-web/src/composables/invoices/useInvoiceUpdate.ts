import type { MaybeRefOrGetter } from 'vue';
import type { InvoiceResponse, UpdateInvoiceInput } from '@gitiempo/shared';
import type { AdminServerStateScope } from '@/lib/query-keys';
import { adminInvoicesClient, type AdminInvoicesClient } from '@/services/admin-invoices-client';
import { useScopedInvoiceMutation } from './useScopedInvoiceMutation';

interface UpdateInvoicePayload {
  data: UpdateInvoiceInput;
  invoiceId: string;
}

interface UseInvoiceUpdateOptions {
  client?: Pick<AdminInvoicesClient, 'updateInvoice'>;
  onError?: (message: string, error: unknown, action: string) => void;
  onSuccess?: (invoice: InvoiceResponse) => void;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}


export function useInvoiceUpdate({
  client = adminInvoicesClient, onError, onSuccess, scope,
}: UseInvoiceUpdateOptions) {
  const mutation = useScopedInvoiceMutation<UpdateInvoicePayload, InvoiceResponse>({
    action: 'update-invoice',
    mutationFn: (input) => client.updateInvoice(input.invoiceId, input.data),
    onError, onSuccess, scope,
  });
  return { updateInvoice: mutation.mutate, isUpdating: mutation.isPending };
}
