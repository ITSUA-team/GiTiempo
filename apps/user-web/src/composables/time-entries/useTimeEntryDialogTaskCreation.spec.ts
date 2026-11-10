/* eslint-disable vue/one-component-per-file -- each test mounts a local composable harness */
import { mount } from "@vue/test-utils";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { computed, defineComponent, shallowRef } from "vue";
import { describe, expect, it, vi } from "vitest";

import { createTestQueryClient, createTestQueryPlugin } from "@/test/query-client";

import { createNewTaskLookupOption } from "./time-entry-task-lookup";
import { useTimeEntryDialog } from "./useTimeEntryDialog";
import { useTimeEntryDialogTaskCreation } from "./useTimeEntryDialogTaskCreation";

const project: ProjectResponse = {
  accessScope: "own-time",
  capabilities: { canManageTasks: false },
  color: null,
  createdAt: "2026-04-20T12:00:00.000Z",
  defaultBillableForTasks: true,
  description: null,
  id: "project-1",
  isActive: true,
  members: [],
  name: "External project",
  referenceProvenance: "user-supplied",
  timeRoundingStepMinutes: null,
  source: "github",
  totalSeconds: 3600,
  trackingMode: "external-reference",
  updatedAt: "2026-04-20T12:00:00.000Z",
  visibility: "private",
  workspaceId: "workspace-1",
};

const manageableProject: ProjectResponse = {
  ...project,
  accessScope: "project",
  capabilities: { canManageTasks: true },
  referenceProvenance: null,
  source: "manual",
  trackingMode: "managed",
};

const createdTask: TaskResponse = {
  accessScope: "project",
  capabilities: { canManageTasks: true },
  createdAt: "2026-04-20T12:00:00.000Z",
  defaultBillableForTimeEntries: true,
  githubIssue: null,
  id: "task-1",
  isActive: true,
  projectId: project.id,
  status: "open",
  title: "Delayed task",
  updatedAt: "2026-04-20T12:00:00.000Z",
  workspaceId: "workspace-1",
};

describe("useTimeEntryDialogTaskCreation", () => {
  it("rejects stale new-task creation without sending a request for an own-time project", async () => {
    const dialog = useTimeEntryDialog();
    const client = {
      createTask: vi.fn(),
    };
    const queryClient = createTestQueryClient();
    const visibleProjects = shallowRef([project]);
    let createDialogTaskFromSelection!: ReturnType<
      typeof useTimeEntryDialogTaskCreation
    >["createDialogTaskFromSelection"];

    dialog.openCreateDialogState();
    dialog.setProjectId(project.id);
    dialog.setTaskValue(createNewTaskLookupOption(project.id));

    mount(
      defineComponent({
        setup() {
          ({ createDialogTaskFromSelection } = useTimeEntryDialogTaskCreation({
            client: client as never,
            dialog,
            scope: computed(() => ({ userId: "user-1", workspaceId: "workspace-1" })),
            taskOptions: { upsertProjectTask: vi.fn() } as never,
            toast: { add: vi.fn() },
            visibleProjects: computed(() => visibleProjects.value),
          }));

          return () => null;
        },
      }),
      {
        global: {
          plugins: [createTestQueryPlugin(queryClient)],
        },
      },
    );

    await expect(
      createDialogTaskFromSelection("Do not create this task"),
    ).resolves.toBeNull();

    expect(client.createTask).not.toHaveBeenCalled();
    expect(dialog.dialogErrors.value.newTaskTitle).toBe(
      "You do not have permission to create tasks in this project.",
    );
  });

  it("does not add a task after project access narrows while creation is pending", async () => {
    const dialog = useTimeEntryDialog();
    let resolveCreateTask!: (task: TaskResponse) => void;
    const client = {
      createTask: vi.fn(
        () =>
          new Promise<TaskResponse>((resolve) => {
            resolveCreateTask = resolve;
          }),
      ),
    };
    const queryClient = createTestQueryClient();
    const visibleProjects = shallowRef([manageableProject]);
    const upsertProjectTask = vi.fn();
    let createDialogTaskFromSelection!: ReturnType<
      typeof useTimeEntryDialogTaskCreation
    >["createDialogTaskFromSelection"];

    dialog.openCreateDialogState();
    dialog.setProjectId(project.id);
    dialog.setTaskValue(createNewTaskLookupOption(project.id));

    mount(
      defineComponent({
        setup() {
          ({ createDialogTaskFromSelection } = useTimeEntryDialogTaskCreation({
            client: client as never,
            dialog,
            scope: computed(() => ({ userId: "user-1", workspaceId: "workspace-1" })),
            taskOptions: { upsertProjectTask } as never,
            toast: { add: vi.fn() },
            visibleProjects: computed(() => visibleProjects.value),
          }));

          return () => null;
        },
      }),
      {
        global: {
          plugins: [createTestQueryPlugin(queryClient)],
        },
      },
    );

    const creation = createDialogTaskFromSelection(createdTask.title);

    await Promise.resolve();
    expect(client.createTask).toHaveBeenCalledOnce();

    visibleProjects.value = [project];
    resolveCreateTask(createdTask);

    await expect(creation).resolves.toBeNull();
    expect(upsertProjectTask).not.toHaveBeenCalled();
    expect(dialog.dialogRequestErrorMessage.value).toBe(
      "The project or your access changed before the task was ready. The time entry was not saved; the task may already have been created.",
    );
  });
});
