import { createTaskSchema, type ProjectResponse, type TaskResponse } from "@gitiempo/shared";
import { computed, ref } from "vue";

import {
  isGitHubIssueTaskOption,
  isWorkspaceProjectOption,
  isWorkspaceTaskOption,
  toWorkspaceProjectOption,
  toWorkspaceTaskOption,
  type GitHubProjectSourceOption,
  type GitHubRepositorySourceOption,
  type TopBarProjectOption,
  type TopBarTaskOption,
  type WorkspaceTaskOption,
} from "@/lib/top-bar-task-picker-options";
import type { SelectedTaskContext } from "@/lib/top-bar-timer-helpers";
import { TOP_BAR_TIMER_NEW_TASK_ID } from "@/lib/top-bar-timer-helpers";

type GitHubSourceOption = GitHubRepositorySourceOption | GitHubProjectSourceOption;

export function useTopBarTaskPicker() {
  const projects = ref<ProjectResponse[]>([]);
  const githubSources = ref<GitHubSourceOption[]>([]);
  const tasks = ref<TopBarTaskOption[]>([]);
  const taskCache = new Map<string, TopBarTaskOption[]>();
  const isDialogOpen = ref(false);
  const selectedProjectId = ref<string | null>(null);
  const selectedTaskId = ref<string | null>(null);
  const selectedDescription = ref("");
  const createTaskTitle = ref("");
  const projectsErrorMessage = ref<string | null>(null);
  const githubSourcesErrorMessage = ref<string | null>(null);
  const tasksErrorMessage = ref<string | null>(null);
  const createTaskErrorMessage = ref<string | null>(null);
  const activeProjects = computed(() => projects.value.filter((project) => project.isActive));
  const workspaceProjectOptions = computed(() =>
    activeProjects.value.map(toWorkspaceProjectOption),
  );
  const projectOptions = computed<TopBarProjectOption[]>(() => [
    ...workspaceProjectOptions.value,
    ...githubSources.value,
  ]);
  const activeTasks = computed(() =>
    tasks.value.filter(
      (task): task is WorkspaceTaskOption =>
        isWorkspaceTaskOption(task) && task.task.isActive && task.task.status === "open",
    ),
  );
  const taskOptions = computed<TopBarTaskOption[]>(() =>
    tasks.value.filter(
      (task) =>
        !isWorkspaceTaskOption(task) ||
        (task.task.isActive && task.task.status === "open"),
    ),
  );
  const selectedProject = computed(
    () => projectOptions.value.find((project) => project.id === selectedProjectId.value) ?? null,
  );
  const selectedWorkspaceProject = computed(() =>
    isWorkspaceProjectOption(selectedProject.value) ? selectedProject.value.project : null,
  );
  const selectedTask = computed(
    () => taskOptions.value.find((task) => task.id === selectedTaskId.value) ?? null,
  );
  const selectedWorkspaceTask = computed(() =>
    isWorkspaceTaskOption(selectedTask.value) ? selectedTask.value.task : null,
  );
  const selectedGitHubIssueTask = computed(() =>
    isGitHubIssueTaskOption(selectedTask.value) ? selectedTask.value : null,
  );
  const canCreateTaskInSelectedProject = computed(() =>
    isWorkspaceProjectOption(selectedProject.value),
  );
  const isConfirmSelectionDisabled = computed(
    () =>
      !selectedProject.value ||
      (!selectedTask.value && selectedTaskId.value !== TOP_BAR_TIMER_NEW_TASK_ID),
  );
  const isCreateTaskTitleEmpty = computed(() => createTaskTitle.value.trim().length === 0);

  function setProjects(nextProjects: ProjectResponse[]): void {
    projects.value = nextProjects;
  }

  function setGitHubSources(nextSources: GitHubSourceOption[]): void {
    githubSources.value = nextSources;
  }

  function setTasks(nextTasks: TopBarTaskOption[]): void {
    tasks.value = nextTasks;
  }

  function getCachedTasks(sourceId: string): TopBarTaskOption[] | undefined {
    return taskCache.get(sourceId);
  }

  function setCachedTasks(sourceId: string, nextTasks: TopBarTaskOption[]): void {
    taskCache.set(sourceId, nextTasks);
  }

  function appendWorkspaceTaskToCache(projectId: string, task: TaskResponse): void {
    const cachedTasks = taskCache.get(projectId) ?? [];
    const nextTask = toWorkspaceTaskOption(task);
    const nextTasks = [...cachedTasks, nextTask];

    taskCache.set(projectId, nextTasks);
    tasks.value = nextTasks;
  }

  function openTaskPicker(
    context: { projectId: string; taskId: string; description: string } | null,
  ): void {
    isDialogOpen.value = true;
    createTaskErrorMessage.value = null;
    projectsErrorMessage.value = null;
    tasksErrorMessage.value = null;
    selectedProjectId.value = context?.projectId ?? null;
    selectedTaskId.value = context?.taskId ?? null;
    selectedDescription.value = context?.description ?? "";
  }

  function closeDialog(): void {
    isDialogOpen.value = false;
    createTaskTitle.value = "";
    createTaskErrorMessage.value = null;
  }

  function setSelectedProjectId(projectId: string | null): void {
    if (selectedProjectId.value === projectId) {
      return;
    }

    selectedProjectId.value = projectId;
  }

  function setSelectedTaskId(taskId: string | null): void {
    selectedTaskId.value = taskId;
  }

  function setSelectedDescription(description: string): void {
    selectedDescription.value = description;
  }

  function setCreateTaskTitle(title: string): void {
    createTaskTitle.value = title;
    createTaskErrorMessage.value = null;
  }

  function setProjectsError(message: string | null): void {
    projectsErrorMessage.value = message;
  }

  function setGitHubSourcesError(message: string | null): void {
    githubSourcesErrorMessage.value = message;
  }

  function setTasksError(message: string | null): void {
    tasksErrorMessage.value = message;
  }

  function setCreateTaskError(message: string | null): void {
    createTaskErrorMessage.value = message;
  }

  function validateCreateTaskInput() {
    const parsed = createTaskSchema.safeParse({ title: createTaskTitle.value.trim() });

    if (!parsed.success) {
      createTaskErrorMessage.value = parsed.error.issues[0]?.message ?? "Task title is invalid.";
      return null;
    }

    createTaskErrorMessage.value = null;
    return parsed.data;
  }

  function getSelectedTaskContext(): SelectedTaskContext | null {
    if (!selectedWorkspaceProject.value || !selectedWorkspaceTask.value) {
      return null;
    }

    return {
      githubIssue: selectedWorkspaceTask.value.githubIssue,
      projectId: selectedWorkspaceProject.value.id,
      projectName: selectedWorkspaceProject.value.name,
      taskId: selectedWorkspaceTask.value.id,
      taskTitle: selectedWorkspaceTask.value.title,
    };
  }

  function getNormalizedDescription(): string | null {
    return selectedDescription.value.trim() === "" ? null : selectedDescription.value;
  }

  return {
    activeProjects,
    activeTasks,
    appendWorkspaceTaskToCache,
    canCreateTaskInSelectedProject,
    closeDialog,
    createTaskErrorMessage,
    createTaskTitle,
    getCachedTasks,
    getNormalizedDescription,
    getSelectedTaskContext,
    githubSources,
    githubSourcesErrorMessage,
    isConfirmSelectionDisabled,
    isCreateTaskTitleEmpty,
    isDialogOpen,
    openTaskPicker,
    projects,
    projectsErrorMessage,
    projectOptions,
    selectedDescription,
    selectedGitHubIssueTask,
    selectedProject,
    selectedProjectId,
    selectedTask,
    selectedTaskId,
    selectedWorkspaceProject,
    selectedWorkspaceTask,
    setCachedTasks,
    setCreateTaskError,
    setCreateTaskTitle,
    setGitHubSources,
    setGitHubSourcesError,
    setProjects,
    setProjectsError,
    setSelectedDescription,
    setSelectedProjectId,
    setSelectedTaskId,
    setTasks,
    setTasksError,
    taskOptions,
    tasks,
    tasksErrorMessage,
    validateCreateTaskInput,
  };
}

export type TopBarTaskPicker = ReturnType<typeof useTopBarTaskPicker>;
