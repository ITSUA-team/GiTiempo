import type { MaybeRefOrGetter } from 'vue';
import type { AdminServerStateScope } from '@/lib/query-keys';
import { adminInvoicesClient, type AdminInvoicesClient } from '@/services/admin-invoices-client';
import { useScopedInvoiceMutation } from './useScopedInvoiceMutation';

interface UseInvoiceDeleteOptions {
  client?: Pick<AdminInvoicesClient, 'deleteInvoice'>;
  onError?: (message: string, error: unknown, action: string) => void;
  onSuccess?: () => void;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}


export function useInvoiceDelete({
  client = adminInvoicesClient, onError, onSuccess, scope,
}: UseInvoiceDeleteOptions) {
  const mutation = useScopedInvoiceMutation<string, void>({
    action: 'delete-invoice',
    mutationFn: (input) => client.deleteInvoice(input),
    onError, onSuccess, scope,
  });
  return { deleteInvoice: mutation.mutate, isDeleting: mutation.isPending };
}
