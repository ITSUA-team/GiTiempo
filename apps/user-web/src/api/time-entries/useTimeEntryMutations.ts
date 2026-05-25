import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { toValue, type MaybeRefOrGetter } from "vue";

import {
  userMutationInvalidationKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

type TimeEntryMutationClient = Pick<
  TimeEntriesClient,
  "createManualEntry" | "deleteEntry" | "updateEntry"
>;
type CreateManualEntryInput = Parameters<TimeEntriesClient["createManualEntry"]>[1];
type UpdateEntryInput = Parameters<TimeEntriesClient["updateEntry"]>[2];

interface UseTimeEntryMutationsOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: TimeEntryMutationClient;
  scope: MaybeRefOrGetter<UserServerStateScope>;
}

function requireAccessToken(accessToken: string | null | undefined): string {
  if (!accessToken) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return accessToken;
}

export function useTimeEntryMutations(options: UseTimeEntryMutationsOptions) {
  const queryClient = useQueryClient();

  async function invalidateTimeEntrySurfaces(): Promise<void> {
    await Promise.all(
      userMutationInvalidationKeys
        .afterTimeEntryMutation(toValue(options.scope))
        .map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  }

  const createEntryMutation = useMutation({
    mutationFn: (input: CreateManualEntryInput) =>
      options.client.createManualEntry(
        requireAccessToken(toValue(options.accessToken)),
        input,
      ),
    onSuccess: invalidateTimeEntrySurfaces,
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ entryId, input }: { entryId: string; input: UpdateEntryInput }) =>
      options.client.updateEntry(
        requireAccessToken(toValue(options.accessToken)),
        entryId,
        input,
      ),
    onSuccess: invalidateTimeEntrySurfaces,
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (entryId: string) =>
      options.client.deleteEntry(
        requireAccessToken(toValue(options.accessToken)),
        entryId,
      ),
    onSuccess: invalidateTimeEntrySurfaces,
  });

  return {
    createEntry: createEntryMutation.mutateAsync,
    createEntryMutation,
    deleteEntry: deleteEntryMutation.mutateAsync,
    deleteEntryMutation,
    updateEntry: updateEntryMutation.mutateAsync,
    updateEntryMutation,
  };
}
