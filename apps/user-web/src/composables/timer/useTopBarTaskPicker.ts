import {
  createTaskSchema,
  type GitHubIssue,
  type ProjectResponse,
  type TaskResponse,
} from "@gitiempo/shared";
import { computed, ref } from "vue";

import type { SelectedTaskContext } from "@/lib/top-bar-timer-helpers";

export interface TopBarGitHubTaskProposal {
  id: string;
  isGitHubIssueProposal: true;
  issue: GitHubIssue;
  repositoryLabel: string;
  title: string;
}

export function useTopBarTaskPicker() {
  const projects = ref<ProjectResponse[]>([]);
  const tasks = ref<TaskResponse[]>([]);
  const gitHubIssueProposals = ref<TopBarGitHubTaskProposal[]>([]);
  const taskCache = new Map<string, TaskResponse[]>();
  const gitHubIssueProposalCache = new Map<string, TopBarGitHubTaskProposal[]>();
  const isDialogOpen = ref(false);
  const selectedProjectId = ref<string | null>(null);
  const selectedTaskId = ref<string | null>(null);
  const selectedDescription = ref("");
  const createTaskTitle = ref("");
  const projectsErrorMessage = ref<string | null>(null);
  const tasksErrorMessage = ref<string | null>(null);
  const gitHubProposalErrorMessage = ref<string | null>(null);
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

  function setTasks(nextTasks: TaskResponse[]): void {
    tasks.value = nextTasks;
  }

  function setGitHubIssueProposals(
    nextProposals: TopBarGitHubTaskProposal[],
  ): void {
    gitHubIssueProposals.value = nextProposals;
  }

  function getCachedTasks(projectId: string): TaskResponse[] | undefined {
    return taskCache.get(projectId);
  }

  function setCachedTasks(projectId: string, nextTasks: TaskResponse[]): void {
    taskCache.set(projectId, nextTasks);
  }

  function getCachedGitHubIssueProposals(
    cacheKey: string,
  ): TopBarGitHubTaskProposal[] | undefined {
    return gitHubIssueProposalCache.get(cacheKey);
  }

  function setCachedGitHubIssueProposals(
    cacheKey: string,
    nextProposals: TopBarGitHubTaskProposal[],
  ): void {
    gitHubIssueProposalCache.set(cacheKey, nextProposals);
  }

  function openTaskPicker(
    context: { projectId: string; taskId: string; description: string } | null,
  ): void {
    isDialogOpen.value = true;
    createTaskErrorMessage.value = null;
    projectsErrorMessage.value = null;
    tasksErrorMessage.value = null;
    gitHubProposalErrorMessage.value = null;
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

  function setGitHubProposalError(message: string | null): void {
    gitHubProposalErrorMessage.value = message;
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

    return {
      githubIssue: selectedTask.value.githubIssue,
      projectId: selectedProject.value.id,
      projectName: selectedProject.value.name,
      taskId: selectedTask.value.id,
      taskTitle: selectedTask.value.title,
    };
  }

  function getGitHubIssueProposal(
    proposalId: string | null,
  ): TopBarGitHubTaskProposal | null {
    if (!proposalId) {
      return null;
    }

    return gitHubIssueProposals.value.find((proposal) => proposal.id === proposalId) ?? null;
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
    getCachedGitHubIssueProposals,
    getCachedTasks,
    getGitHubIssueProposal,
    getNormalizedDescription,
    getSelectedTaskContext,
    gitHubIssueProposals,
    gitHubProposalErrorMessage,
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
    setCachedGitHubIssueProposals,
    setCachedTasks,
    setCreateTaskError,
    setCreateTaskTitle,
    setGitHubIssueProposals,
    setGitHubProposalError,
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
