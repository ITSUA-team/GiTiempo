import { watch, type ComputedRef, type Ref } from 'vue';

import { getReportErrorMessage } from './report-data-helpers';

type ReportErrorHandler = (message: string, error: unknown, action: string) => void;

interface UseReportLoadErrorNotificationsOptions {
  currentAction: Ref<string>;
  isAdminScope: ComputedRef<boolean>;
  membersError: Ref<unknown> | ComputedRef<unknown>;
  onError?: ReportErrorHandler;
  projectsError: Ref<unknown> | ComputedRef<unknown>;
  rowsError: Ref<unknown> | ComputedRef<unknown>;
}

export function useReportLoadErrorNotifications({
  currentAction,
  isAdminScope,
  membersError,
  onError,
  projectsError,
  rowsError,
}: UseReportLoadErrorNotificationsOptions): void {
  watch(
    [projectsError, membersError, rowsError],
    ([projectsLoadError, membersLoadError, rowsLoadError]) => {
      const error = projectsLoadError ??
        (isAdminScope.value ? membersLoadError : null) ??
        rowsLoadError;

      if (error) {
        onError?.(getReportErrorMessage(error), error, currentAction.value);
      }
    },
  );
}
