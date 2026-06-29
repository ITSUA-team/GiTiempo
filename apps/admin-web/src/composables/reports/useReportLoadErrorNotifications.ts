import { watch, type ComputedRef, type Ref } from 'vue';

import { getReportErrorMessage } from './report-data-helpers';

/* eslint-disable no-unused-vars */
type ReportErrorHandler = (message: string, error: unknown, action: string) => void;
/* eslint-enable no-unused-vars */

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
