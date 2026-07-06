import {
  createAppToast,
  getErrorMessage,
  type ToastLike,
} from '@gitiempo/web-shared';
import { ref, type ComputedRef } from 'vue';

import { useUpdateTimeEntryMutation } from '@/composables/query';
import type { UserServerStateScope } from '@/lib/query-keys';
import {
  isGitHubIssueSelectedTaskContext,
  type SelectedTaskContext,
} from '@/lib/top-bar-timer-helpers';
import type { TimeEntriesClient } from '@/services/time-entries-client';

import type { TopBarTaskPicker } from './useTopBarTaskPicker';
import type { TopBarTimerSummary } from './useTopBarTimerSummary';

interface UseTopBarTimerSelectionUpdateOptions {
  client: TimeEntriesClient;
  picker: TopBarTaskPicker;
  scope: ComputedRef<UserServerStateScope>;
  summary: TopBarTimerSummary;
  toast: ToastLike;
}

export function useTopBarTimerSelectionUpdate({
  client,
  picker,
  scope,
  summary,
  toast,
}: UseTopBarTimerSelectionUpdateOptions) {
  const appToast = createAppToast(toast);
  const selectionUpdateErrorMessage = ref<string | null>(null);
  const updateTimeEntryMutation = useUpdateTimeEntryMutation({
    client,
    scope,
  });

  function clearSelectionUpdateError(): void {
    selectionUpdateErrorMessage.value = null;
  }

  async function ensureLocalSelectedContext(
    context: ReturnType<typeof picker.getSelectedTaskContext>,
  ): Promise<SelectedTaskContext | null> {
    if (!context) {
      return null;
    }

    if (!isGitHubIssueSelectedTaskContext(context)) {
      return context;
    }

    try {
      const task = await client.ensureGitHubIssueTask({
        projectId: context.projectId,
        issueNumber: context.githubIssue.issueNumber,
      });
      const cachedTasks = picker.getCachedTasks(context.projectId) ?? picker.tasks.value;
      const nextTasks = replaceGitHubIssueOptionWithTask(
        cachedTasks,
        context.taskId,
        task,
      );

      picker.setCachedTasks(context.projectId, nextTasks);
      picker.setTasks(nextTasks);
      picker.setSelectedTaskId(task.id);

      return {
        githubIssue: task.githubIssue,
        projectId: context.projectId,
        projectName: context.projectName,
        source: 'local',
        taskId: task.id,
        taskTitle: task.title,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      selectionUpdateErrorMessage.value = message;
      appToast.showErrorToast({
        detail: 'Choose another task or try again.',
        error,
        logContext: {
          action: 'materialize-github-task',
          feature: 'top-bar-timer',
        },
        summary: 'Could not prepare GitHub issue',
      });
      return null;
    }
  }

  async function applySelectedTaskContext(): Promise<boolean> {
    const context = await ensureLocalSelectedContext(
      picker.getSelectedTaskContext(),
    );

    if (!context) {
      return false;
    }

    selectionUpdateErrorMessage.value = null;
    const description = picker.getNormalizedDescription();

    if (!summary.currentTimer.value) {
      summary.setIdleSelection(context, description);
      return true;
    }

    const currentTimerId = summary.currentTimer.value.id;
    const currentDescription = summary.currentTimer.value.description ?? null;

    if (
      summary.currentTimer.value.task.id === context.taskId &&
      currentDescription === description
    ) {
      return true;
    }

    try {
      await updateTimeEntryMutation.mutateAsync({
        entryId: currentTimerId,
        input: {
          description,
          taskId: context.taskId,
        },
      });

      await summary.refreshSummary();
      picker.setSelectedDescription(summary.selectedDescription.value ?? '');
      appToast.showSuccessToast(
        'Timer updated',
        'Your running timer has been updated.',
      );
      return true;
    } catch (error) {
      const message = getErrorMessage(error);

      selectionUpdateErrorMessage.value = message;
      appToast.showErrorToast({
        detail: 'Please try again.',
        error,
        logContext: {
          action: 'update-running-timer',
          feature: 'top-bar-timer',
        },
        summary: 'Could not update the timer',
      });

      await summary.refreshSummaryAfterConflict(error);
      return false;
    }
  }

  return {
    applySelectedTaskContext,
    clearSelectionUpdateError,
    isUpdatingSelection: updateTimeEntryMutation.isPending,
    selectionUpdateErrorMessage,
  };
}

function replaceGitHubIssueOptionWithTask<TTask extends { id: string }>(
  tasks: TTask[],
  optionId: string,
  task: TTask,
): TTask[] {
  const existingTaskIndex = tasks.findIndex((candidate) => candidate.id === task.id);

  if (existingTaskIndex >= 0) {
    return tasks.filter((candidate) => candidate.id !== optionId);
  }

  const optionIndex = tasks.findIndex((candidate) => candidate.id === optionId);

  if (optionIndex < 0) {
    return [...tasks, task];
  }

  return tasks.map((candidate, index) => (index === optionIndex ? task : candidate));
}

export type TopBarTimerSelectionUpdate = ReturnType<
  typeof useTopBarTimerSelectionUpdate
>;
