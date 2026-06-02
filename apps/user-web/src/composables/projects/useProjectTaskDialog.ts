import {
  createTaskSchema,
  type TaskResponse,
  type TaskStatus,
  updateTaskSchema,
} from "@gitiempo/shared";
import { computed, ref, shallowRef } from "vue";

type DialogMode = "create" | "edit" | null;

interface ProjectsDialogErrors {
  projectId: string | null;
  status: string | null;
  title: string | null;
}

export type ValidProjectTaskDialogInput =
  | {
      input: ReturnType<typeof createTaskSchema.parse>;
      mode: "create";
      projectId: string;
    }
  | {
      input: ReturnType<typeof updateTaskSchema.parse>;
      mode: "edit";
      projectId: string;
    };

function defaultDialogErrors(): ProjectsDialogErrors {
  return {
    projectId: null,
    status: null,
    title: null,
  };
}

export function useProjectTaskDialog() {
  const dialogMode = ref<DialogMode>(null);
  const editingTask = shallowRef<TaskResponse | null>(null);
  const dialogProjectId = ref<string | null>(null);
  const dialogTaskTitle = ref("");
  const dialogTaskStatus = ref<TaskStatus>("open");
  const dialogErrors = ref<ProjectsDialogErrors>(defaultDialogErrors());
  const dialogRequestErrorMessage = ref<string | null>(null);
  const isDialogOpen = computed(() => dialogMode.value !== null);
  const dialogTitle = computed(() =>
    dialogMode.value === "edit" ? "Edit task" : "New task",
  );
  const dialogSubtitle = computed(() => {
    if (dialogMode.value === "edit") {
      return "Update the selected task details.";
    }

    if (dialogProjectId.value) {
      return "Create a task in the selected visible project.";
    }

    return "Create a task in one of your visible projects.";
  });
  const dialogSaveLabel = computed(() =>
    dialogMode.value === "edit" ? "Save changes" : "Create task",
  );

  function clearDialogErrors(): void {
    dialogErrors.value = defaultDialogErrors();
    dialogRequestErrorMessage.value = null;
  }

  function resetDialogState(): void {
    dialogMode.value = null;
    editingTask.value = null;
    dialogProjectId.value = null;
    dialogTaskTitle.value = "";
    dialogTaskStatus.value = "open";
    clearDialogErrors();
  }

  function openCreateDialog(projectId: string | null = null): void {
    resetDialogState();
    dialogMode.value = "create";
    dialogProjectId.value = projectId;
  }

  function openEditDialog(task: TaskResponse): void {
    resetDialogState();
    dialogMode.value = "edit";
    editingTask.value = task;
    dialogProjectId.value = task.projectId;
    dialogTaskTitle.value = task.title;
    dialogTaskStatus.value = task.status;
  }

  function closeDialog(): void {
    resetDialogState();
  }

  function setDialogProjectId(value: string | null): void {
    dialogProjectId.value = value;
    dialogErrors.value.projectId = null;
    dialogRequestErrorMessage.value = null;
  }

  function setDialogTaskTitle(value: string): void {
    dialogTaskTitle.value = value;
    dialogErrors.value.title = null;
    dialogRequestErrorMessage.value = null;
  }

  function setDialogTaskStatus(value: TaskStatus): void {
    dialogTaskStatus.value = value;
    dialogErrors.value.status = null;
    dialogRequestErrorMessage.value = null;
  }

  function setDialogRequestError(message: string | null): void {
    dialogRequestErrorMessage.value = message;
  }

  function validateDialog(): ValidProjectTaskDialogInput | null {
    const nextErrors = defaultDialogErrors();

    if (!dialogProjectId.value) {
      nextErrors.projectId = "Select a project.";
    }

    const trimmedTitle = dialogTaskTitle.value.trim();
    if (!dialogProjectId.value) {
      dialogErrors.value = nextErrors;
      return null;
    }

    if (dialogMode.value === "edit") {
      const parsed = updateTaskSchema.safeParse({
        status: dialogTaskStatus.value,
        title: trimmedTitle,
      });

      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;

        dialogErrors.value = {
          projectId: nextErrors.projectId,
          status: fieldErrors.status?.[0] ?? null,
          title: fieldErrors.title?.[0] ?? null,
        };
        return null;
      }

      dialogErrors.value = nextErrors;

      return {
        input: parsed.data,
        mode: "edit",
        projectId: dialogProjectId.value,
      };
    }

    const parsed = createTaskSchema.safeParse({ title: trimmedTitle });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;

      dialogErrors.value = {
        projectId: nextErrors.projectId,
        status: null,
        title: fieldErrors.title?.[0] ?? null,
      };
      return null;
    }

    dialogErrors.value = nextErrors;

    return {
      input: parsed.data,
      mode: "create",
      projectId: dialogProjectId.value,
    };
  }

  return {
    closeDialog,
    dialogErrors,
    dialogMode,
    dialogProjectId,
    dialogRequestErrorMessage,
    dialogSaveLabel,
    dialogSubtitle,
    dialogTaskStatus,
    dialogTaskTitle,
    dialogTitle,
    editingTask,
    isDialogOpen,
    openCreateDialog,
    openEditDialog,
    setDialogProjectId,
    setDialogRequestError,
    setDialogTaskStatus,
    setDialogTaskTitle,
    validateDialog,
  };
}
