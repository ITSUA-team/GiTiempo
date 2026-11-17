import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { getErrorMessage } from '@gitiempo/web-shared';
import { invalidateQueryKeys } from '@/composables/query';
import { adminMutationInvalidationKeys, type AdminServerStateScope } from '@/lib/query-keys';

export function useScopedInvoiceMutation<Input, Result>(options: {
  action: string;
  mutationFn: (input: Input) => Promise<Result>;
  onError?: (message: string, error: unknown, action: string) => void;
  onSuccess?: (result: Result) => void;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}) {
  const queryClient = useQueryClient();
  const generation = shallowRef(0);
  watch(
    () => JSON.stringify(toValue(options.scope)),
    () => { generation.value++; },
    { flush: 'sync' },
  );
  const mutation = useMutation({
    mutationFn: (variables: {
      input: Input;
      scope: AdminServerStateScope;
      generation: number;
    }) => options.mutationFn(variables.input),
    onSuccess: async (_result, variables) => {
      await invalidateQueryKeys(
        queryClient,
        adminMutationInvalidationKeys.afterInvoiceMutation(variables.scope),
      );
    },
  });
  async function mutate(input: Input): Promise<Result> {
    const requestGeneration = generation.value;
    try {
      const result = await mutation.mutateAsync({
        input,
        scope: { ...toValue(options.scope) },
        generation: requestGeneration,
      });
      if (requestGeneration === generation.value) {
        options.onSuccess?.(result);
      }
      return result;
    } catch (error) {
      if (requestGeneration === generation.value) {
        options.onError?.(getErrorMessage(error), error, options.action);
      }
      throw error;
    }
  }
  return {
    mutate,
    isPending: computed(() =>
      mutation.isPending.value &&
      mutation.variables.value?.generation === generation.value,
    ),
  };
}
