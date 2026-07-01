import { watch, type ComputedRef, type Ref } from "vue";

interface TimeEntriesPageMeta {
  limit: number;
  totalPages: number;
}

interface UseTimeEntriesPaginationSyncOptions {
  currentPage: Ref<number>;
  isFetchingEntries: ComputedRef<boolean>;
  pageMeta: ComputedRef<TimeEntriesPageMeta | null>;
  pageSize: Ref<number>;
}

export function useTimeEntriesPaginationSync({
  currentPage,
  isFetchingEntries,
  pageMeta,
  pageSize,
}: UseTimeEntriesPaginationSyncOptions) {
  watch(
    [pageMeta, isFetchingEntries],
    ([meta, isFetching]) => {
      if (!meta || isFetching) {
        return;
      }

      pageSize.value = meta.limit;

      if (meta.totalPages > 0 && currentPage.value > meta.totalPages) {
        currentPage.value = meta.totalPages;
      }
    },
    { immediate: true },
  );
}
