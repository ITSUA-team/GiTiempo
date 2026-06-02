// @vitest-environment jsdom

import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ProjectResponse,
  TaskResponse,
  TimeEntryListResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";

import { reconcileTimeEntryListCaches } from "@/lib/time-entry-query-cache";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";
import {
  createTestQueryClient,
  createTestQueryPlugin,
} from "@/test/query-client";

import TimeEntriesView from "./TimeEntriesView.vue";

const clientRef = vi.hoisted(() => ({
  current: null as unknown,
}));
const primeVueMocks = vi.hoisted(() => ({
  confirmRequire: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock("@/config/clients", () => ({
  createDefaultTimeEntriesClient: () => clientRef.current,
}));

vi.mock("primevue/useconfirm", () => ({
  useConfirm: () => ({ require: primeVueMocks.confirmRequire }),
}));

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({ add: primeVueMocks.toastAdd }),
}));

const TEST_IDS = {
  completedEntry: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f3002",
  createdEntry: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f3003",
  projectAdmin: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
  projectOrion: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001",
  runningEntry: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f3001",
  taskAdmin: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
  taskReports: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2001",
  updatedEntry: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f3004",
  user: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f4001",
  workspace: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f5001",
} as const;

const mountedWrappers: VueWrapper[] = [];

function createProject(overrides: Partial<ProjectResponse> = {}): ProjectResponse {
  return {
    color: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    description: null,
    id: TEST_IDS.projectOrion,
    isActive: true,
    members: [],
    name: "Project Orion",
    source: "manual",
    totalHours: 12,
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "public",
    workspaceId: TEST_IDS.workspace,
    ...overrides,
  };
}

function createTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    id: TEST_IDS.taskReports,
    isActive: true,
    projectId: TEST_IDS.projectOrion,
    status: "open",
    title: "Improve reports filters",
    updatedAt: "2026-04-20T12:00:00.000Z",
    workspaceId: TEST_IDS.workspace,
    ...overrides,
  };
}

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  const { githubIssue = null, ...entryOverrides } = overrides;

  return {
    createdAt: "2026-04-21T10:30:00.000Z",
    description: null,
    durationSeconds: 5400,
    endedAt: "2026-04-21T10:30:00.000Z",
    id: TEST_IDS.completedEntry,
    isBillable: false,
    project: {
      id: TEST_IDS.projectOrion,
      name: "Project Orion",
    },
    projectId: TEST_IDS.projectOrion,
    source: "manual",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: {
      id: TEST_IDS.taskReports,
      title: "Improve reports filters",
    },
    taskId: TEST_IDS.taskReports,
    updatedAt: "2026-04-21T10:30:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: TEST_IDS.user,
    },
    userId: TEST_IDS.user,
    workspaceId: TEST_IDS.workspace,
    githubIssue,
    ...entryOverrides,
  };
}

function createEntryListResponse(
  items: TimeEntryResponse[],
  meta: TimeEntryListResponse["meta"] = {
    limit: 20,
    page: 1,
    total: items.length,
    totalPages: 1,
  },
): TimeEntryListResponse {
  return { items, meta };
}

function createClientMock(options: {
  entriesResponse?: TimeEntryListResponse;
  tasksByProject?: Record<string, TaskResponse[]>;
} = {}): TimeEntriesClient & {
  createManualEntry: ReturnType<typeof vi.fn<TimeEntriesClient["createManualEntry"]>>;
  createTask: ReturnType<typeof vi.fn<TimeEntriesClient["createTask"]>>;
  deleteEntry: ReturnType<typeof vi.fn<TimeEntriesClient["deleteEntry"]>>;
  deleteTask: ReturnType<typeof vi.fn<TimeEntriesClient["deleteTask"]>>;
  getCurrentTimer: ReturnType<typeof vi.fn<TimeEntriesClient["getCurrentTimer"]>>;
  listOwnEntries: ReturnType<typeof vi.fn<TimeEntriesClient["listOwnEntries"]>>;
  listProjectTasks: ReturnType<typeof vi.fn<TimeEntriesClient["listProjectTasks"]>>;
  listVisibleProjects: ReturnType<typeof vi.fn<TimeEntriesClient["listVisibleProjects"]>>;
  startTimer: ReturnType<typeof vi.fn<TimeEntriesClient["startTimer"]>>;
  stopTimer: ReturnType<typeof vi.fn<TimeEntriesClient["stopTimer"]>>;
  updateEntry: ReturnType<typeof vi.fn<TimeEntriesClient["updateEntry"]>>;
  updateTask: ReturnType<typeof vi.fn<TimeEntriesClient["updateTask"]>>;
} {
  const entriesResponse = options.entriesResponse ?? createEntryListResponse([
    createEntry({
      durationSeconds: null,
      endedAt: null,
      id: TEST_IDS.runningEntry,
      source: "web",
    }),
    createEntry({
      endedAt: "2026-04-20T10:30:00.000Z",
      id: TEST_IDS.completedEntry,
      startedAt: "2026-04-20T09:00:00.000Z",
    }),
  ], { limit: 20, page: 1, total: 2, totalPages: 1 });
  const tasksByProject: Record<string, TaskResponse[]> = {
    [TEST_IDS.projectOrion]: [createTask()],
    [TEST_IDS.projectAdmin]: [
      createTask({
        id: TEST_IDS.taskAdmin,
        projectId: TEST_IDS.projectAdmin,
        title: "Ship admin polish",
      }),
    ],
    ...options.tasksByProject,
  };

  return {
    createManualEntry: vi.fn(async () => createEntry({ id: TEST_IDS.createdEntry })),
    createTask: vi.fn(async () => createTask()),
    deleteEntry: vi.fn(async () => undefined),
    deleteTask: vi.fn(async () => undefined),
    getCurrentTimer: vi.fn(async () => ({ timeEntry: null })),
    listOwnEntries: vi.fn(async (query) => ({
      ...entriesResponse,
      meta: {
        ...entriesResponse.meta,
        limit: query?.limit ?? entriesResponse.meta.limit,
        page: query?.page ?? entriesResponse.meta.page,
      },
    })),
    listProjectTasks: vi.fn(async (projectId) => tasksByProject[projectId] ?? []),
    listVisibleProjects: vi.fn(async () => [
      createProject(),
      createProject({
        id: TEST_IDS.projectAdmin,
        name: "Admin Web",
      }),
    ]),
    startTimer: vi.fn(async () => createEntry({ endedAt: null, id: TEST_IDS.runningEntry })),
    stopTimer: vi.fn(async () => createEntry()),
    updateEntry: vi.fn(async () => createEntry({ id: TEST_IDS.updatedEntry })),
    updateTask: vi.fn(async () => createTask()),
  };
}

async function mountView(
  client = createClientMock(),
  options: {
    pinia?: ReturnType<typeof createPinia>;
    queryClient?: ReturnType<typeof createTestQueryClient>;
  } = {},
) {
  const pinia = options.pinia ?? createPinia();
  const queryClient = options.queryClient ?? createTestQueryClient();

  setActivePinia(pinia);
  useAuthStore().accessToken = "access-token";
  clientRef.current = client;

  const wrapper = mount(TimeEntriesView, {
    global: {
      plugins: [pinia, createTestQueryPlugin(queryClient)],
      stubs: {
        AutoComplete: {
          emits: ["complete", "update:modelValue"],
          template: `
            <div>
              <button data-testid="filter-task-search" type="button" @click="$emit('complete', { query: 'ship' })">Search task</button>
              <button data-testid="filter-task-select" type="button" @click="$emit('update:modelValue', {
                id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002',
                isActive: true,
                projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002',
                title: 'Ship admin polish'
              })">Select task</button>
            </div>
          `,
        },
        Button: {
          emits: ["click"],
          props: ["label"],
          template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        DatePicker: {
          emits: ["update:modelValue"],
          props: ["inputId"],
          template: `
            <button
              :data-testid="inputId === 'time-entries-date-range' ? 'date-range-filter' : 'date-picker-other'"
              type="button"
              @click="$emit('update:modelValue', [new Date('2026-04-01T00:00:00.000Z'), new Date('2026-04-21T00:00:00.000Z')])"
            >Date</button>
          `,
        },
        Paginator: {
          emits: ["page"],
          template: '<button data-testid="paginator-page-2" type="button" @click="$emit(\'page\', { page: 1 })">Page 2</button>',
        },
        ProgressSpinner: { template: "<div />" },
        Select: {
          emits: ["update:modelValue"],
          template: '<button data-testid="project-filter-select" type="button" @click="$emit(\'update:modelValue\', \'018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002\')">Project</button>',
        },
        SurfaceCard: { template: "<section><slot /></section>" },
        TimeEntriesDaySection: {
          emits: ["createForDay", "deleteEntry", "editEntry"],
          props: ["formatDuration", "formatTimeRange", "group"],
          template: `
            <section>
              <p>{{ group.heading }}</p>
                <div v-for="entry in group.items" :key="entry.id">
                  <p>{{ entry.id }} {{ entry.task.title }}</p>
                  <p>{{ formatTimeRange(entry) }}</p>
                  <p>{{ formatDuration(entry) }}</p>
                  <button
                    v-if="entry.endedAt !== null"
                    data-testid="time-entry-edit-entry-completed"
                    type="button"
                    @click="$emit('editEntry', entry)"
                  >Edit</button>
                  <button
                    v-if="entry.endedAt !== null"
                    data-testid="time-entry-delete-entry-completed"
                    type="button"
                    @click="$emit('deleteEntry', entry)"
                  >Delete</button>
                  <p v-else>Stop from the top bar</p>
                </div>
              <button data-testid="time-entries-day-create-2026-04-21" type="button" @click="$emit('createForDay', group.dateKey)">Create day</button>
            </section>
          `,
        },
        TimeEntryDialog: {
          emits: [
            "close",
            "save",
            "taskSearch",
            "update:description",
            "update:endedAt",
            "update:isBillable",
            "update:projectId",
            "update:startedAt",
            "update:taskValue",
          ],
          props: ["dialogErrorMessage", "isOpen", "valueDescription"],
          template: `
            <div v-if="isOpen" data-testid="time-entry-dialog">
              <p data-testid="dialog-description-value">{{ valueDescription }}</p>
              <p data-testid="dialog-request-error">{{ dialogErrorMessage }}</p>
              <button data-testid="dialog-project-admin" type="button" @click="$emit('update:projectId', '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002')">Project</button>
              <button data-testid="dialog-task-admin" type="button" @click="$emit('update:taskValue', {
                id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002',
                isActive: true,
                projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002',
                title: 'Ship admin polish'
              })">Task</button>
              <button data-testid="dialog-description" type="button" @click="$emit('update:description', 'Manual cleanup')">Description</button>
              <button data-testid="dialog-started" type="button" @click="$emit('update:startedAt', new Date('2026-04-21T09:15:00.000Z'))">Started</button>
              <button data-testid="dialog-ended" type="button" @click="$emit('update:endedAt', new Date('2026-04-21T10:45:00.000Z'))">Ended</button>
              <button data-testid="dialog-billable" type="button" @click="$emit('update:isBillable', true)">Billable</button>
              <button data-testid="dialog-save" type="button" @click="$emit('save')">Save</button>
            </div>
          `,
        },
      },
    },
  });

  mountedWrappers.push(wrapper);

  return { client, pinia, queryClient, wrapper };
}

describe("TimeEntriesView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T11:00:05.000Z"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    primeVueMocks.confirmRequire.mockClear();
    primeVueMocks.toastAdd.mockClear();
  });

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount();
    }

    clientRef.current = null;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("loads initial data, groups entries by day, and updates running durations", async () => {
    const client = createClientMock();
    const { wrapper } = await mountView(client);

    await flushPromises();

    expect(client.listVisibleProjects).toHaveBeenCalledWith();
    expect(client.listOwnEntries.mock.calls[0]?.[0]).toEqual({
      dateFrom: undefined,
      dateTo: undefined,
      limit: 20,
      page: 1,
      projectId: undefined,
      search: undefined,
      taskId: undefined,
    });
    expect(wrapper.text()).toContain("Today, Apr 21");
    expect(wrapper.text()).toContain("02:00:05");

    vi.advanceTimersByTime(3000);
    await flushPromises();

    expect(wrapper.text()).toContain("02:00:08");
  });

  it("wires header, day create, edit, and delete actions through the real view", async () => {
    const { wrapper } = await mountView();

    await flushPromises();
    await wrapper.get('[data-testid="time-entries-header-create"]').trigger("click");

    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(true);

    await wrapper.get('[data-testid="time-entries-day-create-2026-04-21"]').trigger("click");
    const editButtons = wrapper.findAll('[data-testid="time-entry-edit-entry-completed"]');
    await editButtons[editButtons.length - 1]!.trigger("click");
    const deleteButtons = wrapper.findAll('[data-testid="time-entry-delete-entry-completed"]');
    await deleteButtons[deleteButtons.length - 1]!.trigger("click");

    expect(wrapper.text()).toContain("Stop from the top bar");
    expect(primeVueMocks.confirmRequire).toHaveBeenCalledTimes(1);
  });

  it("updates grouped entry state after a top-bar stop reconciliation", async () => {
    const initialRunningResponse = createEntryListResponse([
      createEntry({
        durationSeconds: null,
        endedAt: null,
        id: TEST_IDS.runningEntry,
        source: "web",
      }),
    ]);
    const client = createClientMock({
      entriesResponse: initialRunningResponse,
    });
    const stoppedEntry = createEntry({
      id: TEST_IDS.runningEntry,
      updatedAt: "2026-04-21T10:30:00.000Z",
    });

    client.listOwnEntries
      .mockResolvedValueOnce(initialRunningResponse)
      .mockResolvedValue(createEntryListResponse([stoppedEntry]));

    const { queryClient, wrapper } = await mountView(client);

    await flushPromises();
    await flushPromises();

    expect(wrapper.text()).toContain("09:00 - Running");
    expect(wrapper.text()).toContain("02:00:05");
    expect(wrapper.text()).toContain("Stop from the top bar");
    expect(wrapper.find('[data-testid="time-entry-edit-entry-completed"]').exists()).toBe(false);

    reconcileTimeEntryListCaches(queryClient, { userId: null, workspaceId: null }, stoppedEntry);
    await flushPromises();
    await flushPromises();

    expect(wrapper.text()).toContain("09:00 - 10:30");
    expect(wrapper.text()).toContain("1h 30m");
    expect(wrapper.text()).not.toContain("Stop from the top bar");
    expect(wrapper.find('[data-testid="time-entry-edit-entry-completed"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="time-entry-delete-entry-completed"]').exists()).toBe(true);

    vi.advanceTimersByTime(3000);
    await flushPromises();

    expect(wrapper.text()).toContain("1h 30m");
    expect(wrapper.text()).not.toContain("02:00:08");
  });

  it("keeps request-error and empty states distinct", async () => {
    const errorClient = createClientMock();

    errorClient.listOwnEntries.mockRejectedValueOnce(new Error("network down"));

    const { wrapper: errorWrapper } = await mountView(errorClient);

    await flushPromises();

    expect(errorWrapper.text()).toContain("Could not load time entries");
    expect(errorWrapper.text()).toContain("network down");
    expect(primeVueMocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "error",
        summary: "Could not load time entries",
      }),
    );

    const emptyClient = createClientMock({
      entriesResponse: createEntryListResponse([], {
        limit: 20,
        page: 1,
        total: 0,
        totalPages: 0,
      }),
    });
    const { wrapper: emptyWrapper } = await mountView(emptyClient);

    await flushPromises();

    expect(emptyWrapper.text()).toContain("No time entries match these filters");
    expect(emptyWrapper.text()).not.toContain("Could not load time entries");
  });

  it("applies filter and pagination changes through the scoped list query", async () => {
    const client = createClientMock();
    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="date-range-filter"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="project-filter-select"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="filter-task-search"]').trigger("click");
    await wrapper.get('[data-testid="filter-task-select"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="paginator-page-2"]').trigger("click");
    await flushPromises();

    expect(client.listProjectTasks).toHaveBeenCalledWith(
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
    );
    expect(client.listOwnEntries.mock.calls.map((call) => call[0])).toContainEqual({
      dateFrom: "2026-04-01T00:00:00.000Z",
      dateTo: "2026-04-22T00:00:00.000Z",
      limit: 20,
      page: 2,
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
      search: "Ship admin polish",
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
    });
  });

  it("creates a manual entry and refreshes the current list page", async () => {
    const client = createClientMock({
      entriesResponse: createEntryListResponse([createEntry()], {
        limit: 20,
        page: 1,
        total: 40,
        totalPages: 2,
      }),
    });
    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="paginator-page-2"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="time-entries-day-create-2026-04-21"]').trigger("click");
    await wrapper.get('[data-testid="dialog-project-admin"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="dialog-task-admin"]').trigger("click");
    await wrapper.get('[data-testid="dialog-description"]').trigger("click");
    await wrapper.get('[data-testid="dialog-started"]').trigger("click");
    await wrapper.get('[data-testid="dialog-ended"]').trigger("click");
    await wrapper.get('[data-testid="dialog-billable"]').trigger("click");
    await wrapper.get('[data-testid="dialog-save"]').trigger("click");
    await flushPromises();

    expect(client.createManualEntry).toHaveBeenCalledWith({
      description: "Manual cleanup",
      endedAt: "2026-04-21T10:45:00.000Z",
      isBillable: true,
      startedAt: "2026-04-21T09:15:00.000Z",
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
    });
    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(false);
    expect(client.listOwnEntries.mock.calls.map((call) => call[0])).toContainEqual({
      dateFrom: undefined,
      dateTo: undefined,
      limit: 20,
      page: 2,
      projectId: undefined,
      search: undefined,
      taskId: undefined,
    });
  });

  it("keeps edit failures retryable with the backend message visible", async () => {
    const client = createClientMock();

    client.updateEntry.mockRejectedValueOnce(new Error("Task is inactive"));

    const { wrapper } = await mountView(client);

    await flushPromises();
    const editButtons = wrapper.findAll('[data-testid="time-entry-edit-entry-completed"]');
    await editButtons[editButtons.length - 1]!.trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="dialog-project-admin"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="dialog-task-admin"]').trigger("click");
    await wrapper.get('[data-testid="dialog-description"]').trigger("click");
    await wrapper.get('[data-testid="dialog-ended"]').trigger("click");
    await wrapper.get('[data-testid="dialog-save"]').trigger("click");
    await flushPromises();

    expect(client.updateEntry).toHaveBeenCalledWith(
      TEST_IDS.completedEntry,
      expect.objectContaining({
        description: "Manual cleanup",
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
      }),
    );
    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="dialog-request-error"]').text()).toBe("Task is inactive");
    expect(primeVueMocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "error",
        summary: "Could not update time entry",
      }),
    );
  });

  it("confirms deletes, refreshes on success, and keeps failures visible on error", async () => {
    const client = createClientMock();

    client.deleteEntry.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Delete failed"));

    const { wrapper } = await mountView(client);

    await flushPromises();
    const retryDeleteButtons = wrapper.findAll('[data-testid="time-entry-delete-entry-completed"]');
    await retryDeleteButtons[retryDeleteButtons.length - 1]!.trigger("click");
    await primeVueMocks.confirmRequire.mock.calls[0]?.[0].accept();
    await flushPromises();

    expect(client.deleteEntry).toHaveBeenCalledWith(TEST_IDS.completedEntry);
    expect(client.listOwnEntries).toHaveBeenCalledTimes(2);

    const deleteButtons = wrapper.findAll('[data-testid="time-entry-delete-entry-completed"]');
    await deleteButtons[deleteButtons.length - 1]!.trigger("click");
    await primeVueMocks.confirmRequire.mock.calls[1]?.[0].accept();
    await flushPromises();

    expect(primeVueMocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "error",
        summary: "Could not delete time entry",
      }),
    );
  });
});
