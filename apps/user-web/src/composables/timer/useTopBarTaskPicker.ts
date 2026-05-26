import { createTaskSchema, type ProjectResponse, type TaskResponse } from "@gitiempo/shared";
import { computed, ref, shallowRef } from "vue";

import type { SelectedTaskContext } from "@/lib/top-bar-timer-helpers";

export function useTopBarTaskPicker() {
  const projects = ref<ProjectResponse[]>([]);
  const tasks = ref<TaskResponse[]>([]);
  const taskCache = new Map<string, TaskResponse[]>();
  const isDialogOpen = shallowRef(false);
  const selectedProjectId = shallowRef<string | null>(null);
  const selectedTaskId = shallowRef<string | null>(null);
  const createTaskTitle = shallowRef("");
  const projectsErrorMessage = shallowRef<string | null>(null);
  const tasksErrorMessage = shallowRef<string | null>(null);
  const createTaskErrorMessage = shallowRef<string | null>(null);
  const activeProjects = computed(() => projects.value.filter((project) => project.isActive));
  const activeTasks = computed(() => tasks.value.filter((task) => task.isActive));
  const selectedProject = computed(
    () => activeProjects.value.find((project) => project.id === selectedProjectId.value) ?? null,
  );
  const selectedTask = computed(
    () => activeTasks.value.find((task) => task.id === selectedTaskId.value) ?? null,
  );
  const isConfirmSelectionDisabled = computed(
    () => !selectedProjectId.value || !selectedTaskId.value,
  );
  const isCreateTaskTitleEmpty = computed(() => createTaskTitle.value.trim().length === 0);

  function setProjects(nextProjects: ProjectResponse[]): void {
    projects.value = nextProjects;
  }

  function setTasks(nextTasks: TaskResponse[]): void {
    tasks.value = nextTasks;
  }

  function getCachedTasks(projectId: string): TaskResponse[] | undefined {
    return taskCache.get(projectId);
  }

  function setCachedTasks(projectId: string, nextTasks: TaskResponse[]): void {
    taskCache.set(projectId, nextTasks);
  }

  function openTaskPicker(context: { projectId: string; taskId: string } | null): void {
    isDialogOpen.value = true;
    createTaskErrorMessage.value = null;
    projectsErrorMessage.value = null;
    tasksErrorMessage.value = null;
    selectedProjectId.value = context?.projectId ?? null;
    selectedTaskId.value = context?.taskId ?? null;
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
    const parsed = createTaskSchema.safeParse({ title: createTaskTitle.value.trim() });

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
      projectId: selectedProject.value.id,
      projectName: selectedProject.value.name,
      taskId: selectedTask.value.id,
      taskTitle: selectedTask.value.title,
    };
  }

  return {
    activeProjects,
    activeTasks,
    closeDialog,
    createTaskErrorMessage,
    createTaskTitle,
    getCachedTasks,
    getSelectedTaskContext,
    isConfirmSelectionDisabled,
    isCreateTaskTitleEmpty,
    isDialogOpen,
    openTaskPicker,
    projects,
    projectsErrorMessage,
    selectedProject,
    selectedProjectId,
    selectedTask,
    selectedTaskId,
    setCachedTasks,
    setCreateTaskError,
    setCreateTaskTitle,
    setProjects,
    setProjectsError,
    setSelectedProjectId,
    setSelectedTaskId,
    setTasks,
    setTasksError,
    tasks,
    tasksErrorMessage,
    validateCreateTaskInput,
  };
}
