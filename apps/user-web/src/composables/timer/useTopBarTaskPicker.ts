import {
  createTaskSchema,
  type ProjectResponse,
  type SyncedGitHubIssue,
  type TaskResponse,
} from "@gitiempo/shared";
import { computed, ref } from "vue";

import type { SelectedTaskContext } from "@/lib/top-bar-timer-helpers";

export interface GitHubIssueTaskOption extends TaskResponse {
  githubIssue: SyncedGitHubIssue;
  isGitHubIssueOption: true;
  issueTitle: string;
}

export type TopBarTaskOption = GitHubIssueTaskOption | TaskResponse;

export function isTopBarGitHubIssueTaskOption(
  task: TopBarTaskOption,
): task is GitHubIssueTaskOption {
  return "isGitHubIssueOption" in task && task.isGitHubIssueOption === true;
}

export function useTopBarTaskPicker() {
  const projects = ref<ProjectResponse[]>([]);
  const tasks = ref<TopBarTaskOption[]>([]);
  const taskCache = new Map<string, TopBarTaskOption[]>();
  const isDialogOpen = ref(false);
  const selectedProjectId = ref<string | null>(null);
  const selectedTaskId = ref<string | null>(null);
  const selectedDescription = ref("");
  const createTaskTitle = ref("");
  const projectsErrorMessage = ref<string | null>(null);
  const tasksErrorMessage = ref<string | null>(null);
  const createTaskErrorMessage = ref<string | null>(null);
  const activeProjects = computed(() => projects.value.filter((project) => project.isActive));
  const activeTasks = computed(() =>
    tasks.value.filter((task) => task.isActive && task.status === "open"),
  );
  const selectedProject = computed(
    () => activeProjects.value.find((project) => project.id === selectedProjectId.value) ?? null,
  );
  const selectedTask = computed(
    () => activeTasks.value.find((task) => task.id === selectedTaskId.value) ?? null,
  );
  const isConfirmSelectionDisabled = computed(
    () => !selectedProject.value || !selectedTask.value,
  );
  const isCreateTaskTitleEmpty = computed(() => createTaskTitle.value.trim().length === 0);

  function setProjects(nextProjects: ProjectResponse[]): void {
    projects.value = nextProjects;
  }

  function setTasks(nextTasks: TopBarTaskOption[]): void {
    tasks.value = nextTasks;
  }

  function getCachedTasks(projectId: string): TopBarTaskOption[] | undefined {
    return taskCache.get(projectId);
  }

  function setCachedTasks(projectId: string, nextTasks: TopBarTaskOption[]): void {
    taskCache.set(projectId, nextTasks);
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

  function setTasksError(message: string | null): void {
    tasksErrorMessage.value = message;
  }

  function setCreateTaskError(message: string | null): void {
    createTaskErrorMessage.value = message;
  }

  function validateCreateTaskInput() {
    const parsed = createTaskSchema.safeParse({
      defaultBillableForTimeEntries:
        selectedProject.value?.defaultBillableForTasks ?? true,
      title: createTaskTitle.value.trim(),
    });

    if (!parsed.success) {
      createTaskErrorMessage.value = parsed.error.issues[0]?.message ?? "Task title is invalid.";
      return null;
    }

    createTaskErrorMessage.value = null;
    return parsed.data;
  }

  function getSelectedTaskContext(): SelectedTaskContext | null {
    if (!selectedProject.value || !selectedTask.value) {
      return null;
    }

    if (isTopBarGitHubIssueTaskOption(selectedTask.value)) {
      return {
        githubIssue: selectedTask.value.githubIssue,
        issueTitle: selectedTask.value.issueTitle,
        projectId: selectedProject.value.id,
        projectName: selectedProject.value.name,
        source: "github-issue",
        taskId: selectedTask.value.id,
        taskTitle: selectedTask.value.title,
      };
    }

    return {
      githubIssue: selectedTask.value.githubIssue,
      projectId: selectedProject.value.id,
      projectName: selectedProject.value.name,
      source: "local",
      taskId: selectedTask.value.id,
      taskTitle: selectedTask.value.title,
    };
  }

  function getNormalizedDescription(): string | null {
    return selectedDescription.value.trim() === "" ? null : selectedDescription.value;
  }

  return {
    activeProjects,
    activeTasks,
    closeDialog,
    createTaskErrorMessage,
    createTaskTitle,
    getCachedTasks,
    getNormalizedDescription,
    getSelectedTaskContext,
    isConfirmSelectionDisabled,
    isCreateTaskTitleEmpty,
    isDialogOpen,
    openTaskPicker,
    projects,
    projectsErrorMessage,
    selectedDescription,
    selectedProject,
    selectedProjectId,
    selectedTask,
    selectedTaskId,
    setCachedTasks,
    setCreateTaskError,
    setCreateTaskTitle,
    setProjects,
    setProjectsError,
    setSelectedDescription,
    setSelectedProjectId,
    setSelectedTaskId,
    setTasks,
    setTasksError,
    tasks,
    tasksErrorMessage,
    validateCreateTaskInput,
  };
}

export type TopBarTaskPicker = ReturnType<typeof useTopBarTaskPicker>;
