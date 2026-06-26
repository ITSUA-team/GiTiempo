import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readonly, shallowRef } from "vue";
import type {
  ProjectResponse,
  TaskResponse,
  TimeEntryListResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";

import { reconcileTimeEntryListCaches } from "@/lib/time-entry-query-cache";
import { topBarTimerDialogControllerKey } from "@/composables/timer/useTopBarTimerDialogController";
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
  githubProject: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1003",
  githubTaskIssueOne: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2003",
  githubTaskIssueTwo: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2004",
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

function createTopBarTimerDialogControllerMock() {
  const openRequestId = shallowRef(0);

  return {
    openRequestId: readonly(openRequestId),
    requestOpen: vi.fn(() => {
      openRequestId.value += 1;
    }),
  };
}

beforeAll(() => {
  vi.stubEnv("TZ", "Europe/Kiev");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

function createProject(overrides: Partial<ProjectResponse> = {}): ProjectResponse {
  return {
    color: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    defaultBillableForTasks: true,
    description: null,
    id: TEST_IDS.projectOrion,
    isActive: true,
    members: [],
    name: "Project Orion",
    source: "manual",
    totalSeconds: 43200,
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "public",
    workspaceId: TEST_IDS.workspace,
    ...overrides,
  };
}

function createTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    defaultBillableForTimeEntries: true,
    githubIssue: null,
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

function formatLocalWallClock(value: Date | string | null | undefined): string {
  if (!value) {
    return "none";
  }

  const date = value instanceof Date ? value : new Date(value);

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
  visibleProjects?: ProjectResponse[];
} = {}): TimeEntriesClient & {
  backfillTaskBillableDefault: ReturnType<typeof vi.fn<TimeEntriesClient["backfillTaskBillableDefault"]>>;
  createManualEntry: ReturnType<typeof vi.fn<TimeEntriesClient["createManualEntry"]>>;
  createTask: ReturnType<typeof vi.fn<TimeEntriesClient["createTask"]>>;
  deleteEntry: ReturnType<typeof vi.fn<TimeEntriesClient["deleteEntry"]>>;
  deleteTask: ReturnType<typeof vi.fn<TimeEntriesClient["deleteTask"]>>;
  ensureGitHubIssueTask: ReturnType<typeof vi.fn<TimeEntriesClient["ensureGitHubIssueTask"]>>;
  getCurrentTimer: ReturnType<typeof vi.fn<TimeEntriesClient["getCurrentTimer"]>>;
  listGitHubRepositoryIssues: ReturnType<typeof vi.fn<TimeEntriesClient["listGitHubRepositoryIssues"]>>;
  listOwnEntries: ReturnType<typeof vi.fn<TimeEntriesClient["listOwnEntries"]>>;
  listProjectTimeEntries: ReturnType<typeof vi.fn<TimeEntriesClient["listProjectTimeEntries"]>>;
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
    backfillTaskBillableDefault: vi.fn(async () => ({
      timeEntriesUpdated: 0,
    })),
    createManualEntry: vi.fn(async () => createEntry({ id: TEST_IDS.createdEntry })),
    createTask: vi.fn(async () => createTask()),
    deleteEntry: vi.fn(async () => undefined),
    deleteTask: vi.fn(async () => undefined),
    ensureGitHubIssueTask: vi.fn(async () => createTask()),
    getCurrentTimer: vi.fn(async () => ({ timeEntry: null })),
    listGitHubRepositoryIssues: vi.fn(async () => ({
      items: [],
      pagination: { hasNextPage: false, limit: 30, nextPageToken: null },
    })),
    listOwnEntries: vi.fn(async (query) => ({
      ...entriesResponse,
      meta: {
        ...entriesResponse.meta,
        limit: query?.limit ?? entriesResponse.meta.limit,
        page: query?.page ?? entriesResponse.meta.page,
      },
    })),
    listProjectTimeEntries: vi.fn(async () => createEntryListResponse([])),
    listProjectTasks: vi.fn(async (projectId) => tasksByProject[projectId] ?? []),
    listVisibleProjects: vi.fn(async () => options.visibleProjects ?? [
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
    topBarTimerDialogController?: ReturnType<typeof createTopBarTimerDialogControllerMock>;
  } = {},
) {
  const pinia = options.pinia ?? createPinia();
  const queryClient = options.queryClient ?? createTestQueryClient();
  const topBarTimerDialogController =
    options.topBarTimerDialogController ?? createTopBarTimerDialogControllerMock();

  setActivePinia(pinia);
  useAuthStore().accessToken = "access-token";
  clientRef.current = client;

  const wrapper = mount(TimeEntriesView, {
    global: {
      plugins: [pinia, createTestQueryPlugin(queryClient)],
      provide: {
        [topBarTimerDialogControllerKey]: topBarTimerDialogController,
      },
      stubs: {
        AutoComplete: {
          emits: ["complete", "update:modelValue"],
          props: [
            "completeOnFocus",
            "dropdownMode",
            "inputId",
            "minLength",
            "optionLabel",
            "overlayClass",
            "pt",
            "suggestions",
          ],
          template: `
            <div
              :data-complete-on-focus="String(completeOnFocus === true || completeOnFocus === '')"
              :data-dropdown-mode="dropdownMode ?? ''"
              :data-input-pt-class="pt?.pcInputText?.root?.class ?? ''"
              :data-list-container-pt-class="pt?.listContainer?.class ?? ''"
              :data-min-length="String(minLength)"
              :data-option-pt-class="pt?.option?.class ?? ''"
              :data-overlay-class="overlayClass ?? ''"
              :data-overlay-pt-class="pt?.overlay?.class ?? ''"
              :data-root-pt-class="pt?.root?.class ?? ''"
              :data-testid="inputId === 'time-entries-project-filter' ? 'project-filter-autocomplete' : inputId === 'time-entry-task' ? 'dialog-task-autocomplete' : 'filter-task-autocomplete'"
            >
              <p v-for="suggestion in suggestions" :key="suggestion.id">
                {{ suggestion[optionLabel] }}
              </p>
              <template v-if="inputId === 'time-entries-project-filter'">
                <button data-testid="project-filter-search" type="button" @click="$emit('complete', { query: 'Project' })">Search project</button>
                <button data-testid="project-filter-select" type="button" @click="$emit('update:modelValue', {
                  id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002',
                  name: 'Project Orion'
                })">Select project</button>
              </template>
              <template v-else>
                <button data-testid="filter-task-focus" type="button" @click="$emit('complete', { query: '' })">Focus task</button>
                <button data-testid="filter-task-search" type="button" @click="$emit('complete', { query: 'ship' })">Search task</button>
                <button data-testid="filter-task-select" type="button" @click="$emit('update:modelValue', {
                  id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002',
                  isActive: true,
                  projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002',
                  title: 'Ship admin polish'
                })">Select task</button>
              </template>
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
          props: ["inputId", "modelValue", "showIcon"],
          methods: {
            formatRange(value: Date[] | null | undefined): string {
              if (!value?.length) {
                return "";
              }

              return value
                .map((date) => [
                  date.getFullYear(),
                  String(date.getMonth() + 1).padStart(2, "0"),
                  String(date.getDate()).padStart(2, "0"),
                ].join("-"))
                .join(" - ");
            },
          },
          template: `
            <button
              :data-testid="inputId === 'time-entries-date-range' ? 'date-range-filter' : 'date-picker-other'"
              :data-show-icon="String(showIcon === true || showIcon === '')"
              type="button"
              @click="$emit('update:modelValue', [new Date(2026, 3, 1, 0, 0, 0, 0), new Date(2026, 3, 21, 0, 0, 0, 0)])"
            >{{ formatRange(modelValue) }}</button>
          `,
        },
        Paginator: {
          emits: ["page"],
          template: '<button data-testid="paginator-page-2" type="button" @click="$emit(\'page\', { page: 1 })">Page 2</button>',
        },
        ProgressSpinner: { template: "<div />" },
        SurfaceCard: { template: "<section><slot /></section>" },
        TimeEntriesDaySection: {
          emits: ["createForDay", "editEntry", "openActiveTimer", "startTimer", "stopTimer"],
          props: [
            "formatDuration",
            "formatTimeRange",
            "group",
            "isStartTimerDisabled",
            "startingTimerEntryId",
            "stoppingTimerEntryId",
          ],
          template: `
            <section>
              <p>{{ group.heading }}</p>
                <div v-for="entry in group.items" :key="entry.id">
                  <p>{{ entry.id }} {{ entry.task.title }}</p>
                  <p :data-testid="'time-entry-range-' + entry.id">{{ formatTimeRange(entry) }}</p>
                  <p>{{ formatDuration(entry) }}</p>
                  <button
                    v-if="entry.endedAt !== null"
                    :data-testid="'time-entry-start-timer-' + entry.id"
                    :disabled="isStartTimerDisabled === true || (startingTimerEntryId !== null && startingTimerEntryId !== undefined)"
                    type="button"
                    @click="!(isStartTimerDisabled === true || (startingTimerEntryId !== null && startingTimerEntryId !== undefined)) && $emit('startTimer', entry)"
                  >Start timer</button>
                  <button
                    v-if="entry.endedAt !== null"
                    data-testid="time-entry-edit-entry-completed"
                    type="button"
                    @click="$emit('editEntry', entry)"
                  >Edit</button>
                  <button
                    v-else
                    :data-testid="'time-entry-open-timer-' + entry.id"
                    type="button"
                    @click="$emit('openActiveTimer')"
                  >Update timer</button>
                  <button
                    v-if="entry.endedAt === null"
                    :data-testid="'time-entry-stop-timer-' + entry.id"
                    :disabled="stoppingTimerEntryId !== null && stoppingTimerEntryId !== undefined"
                    type="button"
                    @click="!(stoppingTimerEntryId !== null && stoppingTimerEntryId !== undefined) && $emit('stopTimer', entry)"
                  >Stop timer</button>
                </div>
              <button data-testid="time-entries-day-create-2026-04-21" type="button" @click="$emit('createForDay', group.dateKey)">Create day</button>
            </section>
          `,
        },
        TimeEntryDialog: {
          emits: [
            "close",
            "deleteEntry",
            "save",
            "taskSearch",
            "update:description",
            "update:endedAt",
            "update:isBillable",
            "update:projectId",
            "update:startedAt",
            "update:taskValue",
          ],
          props: [
            "dialogErrorMessage",
            "endedAt",
            "isDeleting",
            "isOpen",
            "startedAt",
            "taskSuggestions",
            "valueDescription",
          ],
          methods: {
            formatDialogTime(value: Date | null | undefined): string {
              return formatLocalWallClock(value);
            },
          },
          template: `
            <div v-if="isOpen" data-testid="time-entry-dialog">
              <p data-testid="dialog-description-value">{{ valueDescription }}</p>
              <p data-testid="dialog-started-value">{{ formatDialogTime(startedAt) }}</p>
              <p data-testid="dialog-ended-value">{{ formatDialogTime(endedAt) }}</p>
              <p data-testid="dialog-request-error">{{ dialogErrorMessage }}</p>
              <div data-testid="dialog-task-suggestions">
                <p v-for="suggestion in taskSuggestions" :key="suggestion.id">{{ suggestion.title }}</p>
              </div>
              <button data-testid="dialog-project-admin" type="button" @click="$emit('update:projectId', '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002')">Project</button>
              <button data-testid="dialog-project-github" type="button" @click="$emit('update:projectId', '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1003')">GitHub project</button>
              <button data-testid="dialog-task-search-empty" type="button" @click="$emit('taskSearch', '')">Search all tasks</button>
              <button data-testid="dialog-task-search-polish" type="button" @click="$emit('taskSearch', 'polish')">Search polish tasks</button>
              <button data-testid="dialog-task-admin" type="button" @click="$emit('update:taskValue', {
                id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002',
                isActive: true,
                projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002',
                title: 'Ship admin polish'
              })">Task</button>
              <button data-testid="dialog-task-github-issue" type="button" @click="$emit('update:taskValue', {
                githubIssue: {
                  githubRepo: 'My-test-org-for-clock/test-repo',
                  issueNumber: 2
                },
                id: '__top-bar-timer-github-issue__My-test-org-for-clock/test-repo#2',
                isActive: true,
                isGitHubIssueOption: true,
                issueTitle: 'second test issue',
                projectId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1003',
                title: 'second test issue'
              })">GitHub issue task</button>
              <button data-testid="dialog-description" type="button" @click="$emit('update:description', 'Manual cleanup')">Description</button>
              <button data-testid="dialog-started" type="button" @click="$emit('update:startedAt', new Date('2026-04-21T09:15:00.000Z'))">Started</button>
              <button data-testid="dialog-ended" type="button" @click="$emit('update:endedAt', new Date('2026-04-21T10:45:00.000Z'))">Ended</button>
              <button data-testid="dialog-billable" type="button" @click="$emit('update:isBillable', true)">Billable</button>
              <button data-testid="dialog-delete" type="button" @click="$emit('deleteEntry')">Delete entry</button>
              <button data-testid="dialog-save" type="button" @click="$emit('save')">Save</button>
            </div>
          `,
        },
      },
    },
  });

  mountedWrappers.push(wrapper);

  return { client, pinia, queryClient, topBarTimerDialogController, wrapper };
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
    expect(wrapper.get('[data-testid="date-range-filter"]').text()).toBe("");
    expect(wrapper.get('[data-testid="date-range-filter"]').attributes("data-show-icon")).toBe(
      "true",
    );
    expect(wrapper.text()).toContain("Today, Apr 21");
    expect(wrapper.text()).toContain("02:00:05");

    vi.advanceTimersByTime(3000);
    await flushPromises();

    expect(wrapper.text()).toContain("02:00:08");
  });

  it("wires day create and task-name edit actions through the real view", async () => {
    const { wrapper } = await mountView();

    await flushPromises();

    expect(wrapper.find('[data-testid="time-entries-header-create"]').exists()).toBe(false);

    await wrapper.get('[data-testid="time-entries-day-create-2026-04-21"]').trigger("click");
    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(true);

    const editButtons = wrapper.findAll('[data-testid="time-entry-edit-entry-completed"]');
    await editButtons[editButtons.length - 1]!.trigger("click");

    expect(wrapper.find(`[data-testid="time-entry-stop-timer-${TEST_IDS.runningEntry}"]`).exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Stop from the top bar");
    expect(primeVueMocks.confirmRequire).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="time-entry-delete-entry-completed"]').exists()).toBe(false);
  });

  it("opens the active timer dialog instead of the time-entry edit dialog for running entries", async () => {
    const { topBarTimerDialogController, wrapper } = await mountView();

    await flushPromises();
    await wrapper.get(`[data-testid="time-entry-open-timer-${TEST_IDS.runningEntry}"]`).trigger("click");

    expect(topBarTimerDialogController.requestOpen).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(false);
  });

  it("stops the active timer from a running entry row", async () => {
    const client = createClientMock();
    client.getCurrentTimer.mockResolvedValue({
      timeEntry: createEntry({
        durationSeconds: null,
        endedAt: null,
        id: TEST_IDS.runningEntry,
        source: "web",
      }),
    });
    client.stopTimer.mockResolvedValueOnce(createEntry({
      endedAt: "2026-04-21T11:00:05.000Z",
      id: TEST_IDS.runningEntry,
    }));

    const { topBarTimerDialogController, wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get(`[data-testid="time-entry-stop-timer-${TEST_IDS.runningEntry}"]`).trigger("click");
    await flushPromises();
    await flushPromises();

    expect(client.getCurrentTimer).toHaveBeenCalled();
    expect(client.stopTimer).toHaveBeenCalledWith();
    expect(topBarTimerDialogController.requestOpen).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(false);
    expect(primeVueMocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Stopped tracking Improve reports filters.",
        severity: "success",
        summary: "Timer stopped",
      }),
    );
  });

  it("refreshes state without stopping when the clicked running row is stale", async () => {
    const client = createClientMock();
    client.getCurrentTimer.mockResolvedValue({
      timeEntry: createEntry({
        durationSeconds: null,
        endedAt: null,
        id: TEST_IDS.updatedEntry,
        source: "web",
        task: {
          id: TEST_IDS.taskAdmin,
          title: "Ship admin polish",
        },
        taskId: TEST_IDS.taskAdmin,
      }),
    });

    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get(`[data-testid="time-entry-stop-timer-${TEST_IDS.runningEntry}"]`).trigger("click");
    await flushPromises();
    await flushPromises();

    expect(client.stopTimer).not.toHaveBeenCalled();
    expect(client.listOwnEntries).toHaveBeenCalledTimes(2);
    expect(primeVueMocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "The running timer changed. Please try again.",
        severity: "info",
        summary: "Timer status refreshed",
      }),
    );
  });

  it("keeps active timer stop failures retryable with the backend message visible", async () => {
    const client = createClientMock();
    client.getCurrentTimer.mockResolvedValue({
      timeEntry: createEntry({
        durationSeconds: null,
        endedAt: null,
        id: TEST_IDS.runningEntry,
        source: "web",
      }),
    });
    client.stopTimer.mockRejectedValueOnce(new Error("Timer is not running"));

    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get(`[data-testid="time-entry-stop-timer-${TEST_IDS.runningEntry}"]`).trigger("click");
    await flushPromises();

    expect(client.stopTimer).toHaveBeenCalledWith();
    expect(primeVueMocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Timer is not running",
        severity: "error",
        summary: "Could not stop timer",
      }),
    );
    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(false);
  });

  it("starts a fresh timer from a completed entry row", async () => {
    const client = createClientMock({
      entriesResponse: createEntryListResponse([createEntry()]),
    });
    const { topBarTimerDialogController, wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get(`[data-testid="time-entry-start-timer-${TEST_IDS.completedEntry}"]`).trigger("click");
    await flushPromises();
    await flushPromises();

    expect(client.startTimer).toHaveBeenCalledWith({ taskId: TEST_IDS.taskReports });
    expect(topBarTimerDialogController.requestOpen).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(false);
    expect(primeVueMocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Tracking Improve reports filters.",
        severity: "success",
        summary: "Timer started",
      }),
    );
  });

  it("disables completed-entry direct starts while the current timer is already running", async () => {
    const client = createClientMock({
      entriesResponse: createEntryListResponse([createEntry()]),
    });

    client.getCurrentTimer.mockResolvedValue({
      timeEntry: createEntry({
        durationSeconds: null,
        endedAt: null,
        id: TEST_IDS.runningEntry,
        source: "web",
      }),
    });

    const { wrapper } = await mountView(client);

    await flushPromises();

    const startTimerButton = wrapper.get(
      `[data-testid="time-entry-start-timer-${TEST_IDS.completedEntry}"]`,
    );

    expect(client.getCurrentTimer).toHaveBeenCalledWith();
    expect(startTimerButton.attributes("disabled")).toBeDefined();

    await startTimerButton.trigger("click");
    await flushPromises();

    expect(client.startTimer).not.toHaveBeenCalled();
    expect(primeVueMocks.toastAdd).not.toHaveBeenCalledWith(
      expect.objectContaining({ summary: "Could not start timer" }),
    );
    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(false);
  });

  it("keeps direct timer start failures retryable with the backend message visible", async () => {
    const client = createClientMock({
      entriesResponse: createEntryListResponse([createEntry()]),
    });

    client.startTimer.mockRejectedValueOnce(new Error("A timer is already running"));

    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get(`[data-testid="time-entry-start-timer-${TEST_IDS.completedEntry}"]`).trigger("click");
    await flushPromises();

    expect(client.startTimer).toHaveBeenCalledWith({ taskId: TEST_IDS.taskReports });
    expect(primeVueMocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "A timer is already running",
        severity: "error",
        summary: "Could not start timer",
      }),
    );
    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(false);
  });

  it("opens edit with the same browser-local times shown in the table", async () => {
    const startedAt = new Date(2026, 3, 21, 9, 0, 0, 0).toISOString();
    const endedAt = new Date(2026, 3, 21, 10, 30, 0, 0).toISOString();
    const client = createClientMock({
      entriesResponse: createEntryListResponse([
        createEntry({
          endedAt,
          startedAt,
        }),
      ]),
    });
    const { wrapper } = await mountView(client);
    const expectedTimeRange = `${formatLocalWallClock(startedAt)} - ${formatLocalWallClock(endedAt)}`;

    await flushPromises();

    expect(startedAt).toBe("2026-04-21T06:00:00.000Z");
    expect(expectedTimeRange).toBe("09:00 - 10:30");
    expect(wrapper.get(`[data-testid="time-entry-range-${TEST_IDS.completedEntry}"]`).text()).toBe(
      expectedTimeRange,
    );

    await wrapper.get('[data-testid="time-entry-edit-entry-completed"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="dialog-started-value"]').text()).toBe(
      formatLocalWallClock(startedAt),
    );
    expect(wrapper.get('[data-testid="dialog-ended-value"]').text()).toBe(
      formatLocalWallClock(endedAt),
    );
  });

  it("updates the table to the API-returned browser-local times after edit save", async () => {
    const startedAt = new Date(2026, 3, 21, 9, 0, 0, 0).toISOString();
    const endedAt = new Date(2026, 3, 21, 10, 30, 0, 0).toISOString();
    const updatedStartedAt = new Date(2026, 3, 21, 12, 15, 0, 0).toISOString();
    const updatedEndedAt = new Date(2026, 3, 21, 13, 45, 0, 0).toISOString();
    const initialEntry = createEntry({
      endedAt,
      startedAt,
    });
    const updatedEntry = createEntry({
      durationSeconds: 5400,
      endedAt: updatedEndedAt,
      id: TEST_IDS.completedEntry,
      startedAt: updatedStartedAt,
      updatedAt: updatedEndedAt,
    });
    const initialResponse = createEntryListResponse([initialEntry]);
    const updatedResponse = createEntryListResponse([updatedEntry]);
    const client = createClientMock({ entriesResponse: initialResponse });

    client.listOwnEntries.mockResolvedValueOnce(initialResponse).mockResolvedValue(updatedResponse);
    client.updateEntry.mockResolvedValueOnce(updatedEntry);

    const { wrapper } = await mountView(client);

    await flushPromises();

    expect(wrapper.get(`[data-testid="time-entry-range-${TEST_IDS.completedEntry}"]`).text()).toBe(
      `${formatLocalWallClock(startedAt)} - ${formatLocalWallClock(endedAt)}`,
    );

    await wrapper.get('[data-testid="time-entry-edit-entry-completed"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="dialog-started"]').trigger("click");
    await wrapper.get('[data-testid="dialog-ended"]').trigger("click");
    await wrapper.get('[data-testid="dialog-save"]').trigger("click");
    await flushPromises();
    await flushPromises();

    expect(client.updateEntry).toHaveBeenCalledWith(
      TEST_IDS.completedEntry,
      expect.objectContaining({
        endedAt: "2026-04-21T10:45:00.000Z",
        startedAt: "2026-04-21T09:15:00.000Z",
      }),
    );
    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(false);
    expect(wrapper.get(`[data-testid="time-entry-range-${TEST_IDS.completedEntry}"]`).text()).toBe(
      `${formatLocalWallClock(updatedStartedAt)} - ${formatLocalWallClock(updatedEndedAt)}`,
    );
  });

  it("deletes the editing entry from inside the dialog and closes after success", async () => {
    const client = createClientMock();
    const { wrapper } = await mountView(client);

    await flushPromises();
    const editButtons = wrapper.findAll('[data-testid="time-entry-edit-entry-completed"]');
    await editButtons[editButtons.length - 1]!.trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="dialog-delete"]').trigger("click");

    const confirmOptions = primeVueMocks.confirmRequire.mock.calls[0]?.[0];

    expect(confirmOptions).toMatchObject({
      acceptLabel: "Delete",
      header: "Delete entry?",
      message: "This time entry will be permanently deleted.",
      rejectLabel: "Cancel",
    });

    await confirmOptions!.accept();
    await flushPromises();
    await flushPromises();

    expect(client.deleteEntry).toHaveBeenCalledWith(TEST_IDS.completedEntry);
    expect(client.listOwnEntries).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(false);
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

    expect(wrapper.text()).toContain("Running");
    expect(wrapper.text()).toContain("02:00:05");
    expect(wrapper.find(`[data-testid="time-entry-stop-timer-${TEST_IDS.runningEntry}"]`).exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Stop from the top bar");
    expect(wrapper.find('[data-testid="time-entry-edit-entry-completed"]').exists()).toBe(false);

    reconcileTimeEntryListCaches(queryClient, { userId: null, workspaceId: null }, stoppedEntry);
    await flushPromises();
    await flushPromises();

    expect(wrapper.text()).not.toContain("Running");
    expect(wrapper.text()).toContain("1h 30m");
    expect(wrapper.find('[data-testid="time-entry-edit-entry-completed"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="time-entry-delete-entry-completed"]').exists()).toBe(false);

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

    expect(client.listOwnEntries.mock.calls.map((call) => call[0])).toContainEqual({
      dateFrom: new Date(2026, 3, 1, 0, 0, 0, 0).toISOString(),
      dateTo: new Date(2026, 3, 22, 0, 0, 0, 0).toISOString(),
      limit: 20,
      page: 2,
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
      search: "Ship admin polish",
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
    });
  });

  it("shows task suggestions from the current filtered entries", async () => {
    const client = createClientMock({
      entriesResponse: createEntryListResponse([
        createEntry({
          id: TEST_IDS.completedEntry,
          project: {
            id: TEST_IDS.projectAdmin,
            name: "Admin Web",
          },
          projectId: TEST_IDS.projectAdmin,
          task: {
            id: TEST_IDS.taskAdmin,
            title: "Ship admin polish",
          },
          taskId: TEST_IDS.taskAdmin,
        }),
        createEntry({
          id: TEST_IDS.runningEntry,
        }),
      ]),
    });
    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="filter-task-search"]').trigger("click");
    await flushPromises();

    const filterSuggestions = wrapper.get('[data-testid="filter-task-autocomplete"]');

    expect(filterSuggestions.attributes("data-complete-on-focus")).toBe("true");
    expect(filterSuggestions.attributes("data-dropdown-mode")).toBe("blank");
    expect(filterSuggestions.attributes("data-input-pt-class")).toBe("truncate");
    expect(filterSuggestions.attributes("data-list-container-pt-class")).toBe(
      "max-w-full overflow-x-hidden",
    );
    expect(filterSuggestions.attributes("data-min-length")).toBe("0");
    expect(filterSuggestions.attributes("data-option-pt-class")).toBe(
      "max-w-full min-w-0 truncate",
    );
    expect(filterSuggestions.attributes("data-overlay-class")).toBe(
      "max-w-[calc(100vw-2rem)]",
    );
    expect(filterSuggestions.attributes("data-overlay-pt-class")).toBe(
      "max-w-[calc(100vw-2rem)] overflow-hidden",
    );
    expect(filterSuggestions.attributes("data-root-pt-class")).toBe(
      "max-w-full min-w-0",
    );
    expect(client.listProjectTasks).not.toHaveBeenCalled();
    expect(filterSuggestions.text()).toContain("Ship admin polish");
    expect(filterSuggestions.text()).not.toContain("Improve reports filters");
  });

  it("filters closed tasks from manual entry selection without hiding historical filters", async () => {
    const closedTask = createTask({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2999",
      projectId: TEST_IDS.projectAdmin,
      status: "closed",
      title: "Ship closed archive",
    });
    const client = createClientMock({
      entriesResponse: createEntryListResponse([
        createEntry({
          id: TEST_IDS.completedEntry,
          project: {
            id: TEST_IDS.projectAdmin,
            name: "Admin Web",
          },
          projectId: TEST_IDS.projectAdmin,
          task: {
            id: TEST_IDS.taskAdmin,
            title: "Ship admin polish",
          },
          taskId: TEST_IDS.taskAdmin,
        }),
        createEntry({
          id: TEST_IDS.runningEntry,
          project: {
            id: TEST_IDS.projectAdmin,
            name: "Admin Web",
          },
          projectId: TEST_IDS.projectAdmin,
          task: {
            id: closedTask.id,
            title: closedTask.title,
          },
          taskId: closedTask.id,
        }),
      ]),
      tasksByProject: {
        [TEST_IDS.projectAdmin]: [
          createTask({
            id: TEST_IDS.taskAdmin,
            projectId: TEST_IDS.projectAdmin,
            title: "Ship admin polish",
          }),
          closedTask,
        ],
      },
    });
    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="project-filter-select"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="filter-task-search"]').trigger("click");

    const filterSuggestions = wrapper.get('[data-testid="filter-task-autocomplete"]');

    expect(filterSuggestions.text()).toContain("Ship admin polish");
    expect(filterSuggestions.text()).toContain("Ship closed archive");

    await wrapper.get('[data-testid="time-entries-day-create-2026-04-21"]').trigger("click");
    await wrapper.get('[data-testid="dialog-project-admin"]').trigger("click");
    await flushPromises();

    const dialogSuggestions = wrapper.get('[data-testid="dialog-task-suggestions"]');

    expect(dialogSuggestions.text()).toContain("Ship admin polish");
    expect(dialogSuggestions.text()).not.toContain("Ship closed archive");
  });

  it("shows all open project tasks in the create dialog after an empty task dropdown query", async () => {
    const secondOpenTask = createTask({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f2998",
      projectId: TEST_IDS.projectAdmin,
      title: "Write release checklist",
    });
    const closedTask = createTask({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f2999",
      projectId: TEST_IDS.projectAdmin,
      status: "closed",
      title: "Closed historical cleanup",
    });
    const client = createClientMock({
      entriesResponse: createEntryListResponse([createEntry()]),
      tasksByProject: {
        [TEST_IDS.projectAdmin]: [
          createTask({
            id: TEST_IDS.taskAdmin,
            projectId: TEST_IDS.projectAdmin,
            title: "Ship admin polish",
          }),
          secondOpenTask,
          closedTask,
        ],
      },
    });
    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="time-entries-day-create-2026-04-21"]').trigger("click");
    await wrapper.get('[data-testid="dialog-project-admin"]').trigger("click");
    await flushPromises();

    const dialogSuggestions = wrapper.get('[data-testid="dialog-task-suggestions"]');

    expect(client.listProjectTasks).toHaveBeenCalledWith(TEST_IDS.projectAdmin);
    expect(dialogSuggestions.text()).toContain("Ship admin polish");
    expect(dialogSuggestions.text()).toContain("Write release checklist");
    expect(dialogSuggestions.text()).not.toContain("Closed historical cleanup");

    await wrapper.get('[data-testid="dialog-task-search-polish"]').trigger("click");

    expect(dialogSuggestions.text()).toContain("Ship admin polish");
    expect(dialogSuggestions.text()).not.toContain("Write release checklist");

    await wrapper.get('[data-testid="dialog-task-search-empty"]').trigger("click");

    expect(dialogSuggestions.text()).toContain("Ship admin polish");
    expect(dialogSuggestions.text()).toContain("Write release checklist");
    expect(dialogSuggestions.text()).not.toContain("Closed historical cleanup");
  });

  it("shows all open project tasks in the edit dialog for an empty task dropdown query", async () => {
    const secondOpenTask = createTask({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f2998",
      title: "Write release checklist",
    });
    const closedTask = createTask({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f2999",
      status: "closed",
      title: "Closed historical cleanup",
    });
    const client = createClientMock({
      entriesResponse: createEntryListResponse([createEntry()]),
      tasksByProject: {
        [TEST_IDS.projectOrion]: [
          createTask(),
          secondOpenTask,
          closedTask,
        ],
      },
    });
    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="time-entry-edit-entry-completed"]').trigger("click");
    await flushPromises();

    const dialogSuggestions = wrapper.get('[data-testid="dialog-task-suggestions"]');

    expect(client.listProjectTasks).toHaveBeenCalledWith(TEST_IDS.projectOrion);
    expect(dialogSuggestions.text()).toContain("Improve reports filters");
    expect(dialogSuggestions.text()).toContain("Write release checklist");
    expect(dialogSuggestions.text()).not.toContain("Closed historical cleanup");
  });

  it("appends unsynced GitHub issues in the manual dialog for a GitHub-backed project", async () => {
    const githubProject = createProject({
      id: TEST_IDS.githubProject,
      name: "My-test-org-for-clock/test-repo",
      source: "github",
    });
    const syncedTask = createTask({
      githubIssue: {
        githubRepo: "My-test-org-for-clock/test-repo",
        issueNumber: 1,
      },
      id: TEST_IDS.githubTaskIssueOne,
      projectId: TEST_IDS.githubProject,
      title: "some test issue",
    });
    const client = createClientMock({
      tasksByProject: {
        [TEST_IDS.githubProject]: [syncedTask],
      },
      visibleProjects: [createProject(), githubProject],
    });

    client.listGitHubRepositoryIssues.mockResolvedValue({
      items: [
        {
          id: "issue-1",
          nodeId: "node-1",
          number: 1,
          repository: {
            fullName: "My-test-org-for-clock/test-repo",
            name: "test-repo",
            owner: "My-test-org-for-clock",
          },
          state: "open",
          title: "some test issue",
          updatedAt: "2026-04-21T10:00:00.000Z",
          url: "https://github.com/My-test-org-for-clock/test-repo/issues/1",
        },
        {
          id: "issue-2",
          nodeId: "node-2",
          number: 2,
          repository: {
            fullName: "My-test-org-for-clock/test-repo",
            name: "test-repo",
            owner: "My-test-org-for-clock",
          },
          state: "open",
          title: "second test issue",
          updatedAt: "2026-04-21T10:01:00.000Z",
          url: "https://github.com/My-test-org-for-clock/test-repo/issues/2",
        },
      ],
      pagination: { hasNextPage: false, limit: 30, nextPageToken: null },
    });

    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="time-entries-day-create-2026-04-21"]').trigger("click");
    await wrapper.get('[data-testid="dialog-project-github"]').trigger("click");
    await flushPromises();

    const dialogSuggestions = wrapper.get('[data-testid="dialog-task-suggestions"]');

    expect(client.listProjectTasks).toHaveBeenCalledWith(TEST_IDS.githubProject);
    expect(client.listGitHubRepositoryIssues).toHaveBeenCalledWith(
      "My-test-org-for-clock",
      "test-repo",
      { limit: 30, state: "open" },
    );
    expect(dialogSuggestions.text()).toContain("some test issue");
    expect(dialogSuggestions.text()).toContain("second test issue");
    expect(dialogSuggestions.text().match(/some test issue/g)?.length ?? 0).toBe(1);
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

  it("materializes a selected GitHub issue before creating a manual entry", async () => {
    const githubProject = createProject({
      id: TEST_IDS.githubProject,
      name: "My-test-org-for-clock/test-repo",
      source: "github",
    });
    const materializedTask = createTask({
      githubIssue: {
        githubRepo: "My-test-org-for-clock/test-repo",
        issueNumber: 2,
      },
      id: TEST_IDS.githubTaskIssueTwo,
      projectId: TEST_IDS.githubProject,
      title: "second test issue",
    });
    const client = createClientMock({
      visibleProjects: [createProject(), githubProject],
    });

    client.listGitHubRepositoryIssues.mockResolvedValue({
      items: [
        {
          id: "issue-2",
          nodeId: "node-2",
          number: 2,
          repository: {
            fullName: "My-test-org-for-clock/test-repo",
            name: "test-repo",
            owner: "My-test-org-for-clock",
          },
          state: "open",
          title: "second test issue",
          updatedAt: "2026-04-21T10:01:00.000Z",
          url: "https://github.com/My-test-org-for-clock/test-repo/issues/2",
        },
      ],
      pagination: { hasNextPage: false, limit: 30, nextPageToken: null },
    });
    client.ensureGitHubIssueTask.mockResolvedValue(materializedTask);

    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="time-entries-day-create-2026-04-21"]').trigger("click");
    await wrapper.get('[data-testid="dialog-project-github"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="dialog-task-github-issue"]').trigger("click");
    await wrapper.get('[data-testid="dialog-save"]').trigger("click");
    await flushPromises();

    expect(client.ensureGitHubIssueTask).toHaveBeenCalledWith({
      githubRepo: "My-test-org-for-clock/test-repo",
      issueNumber: 2,
      issueTitle: "second test issue",
    });
    expect(client.createManualEntry).toHaveBeenCalledWith({
      description: null,
      endedAt: "2026-04-21T07:00:00.000Z",
      isBillable: true,
      startedAt: "2026-04-21T06:00:00.000Z",
      taskId: TEST_IDS.githubTaskIssueTwo,
    });
  });

  it("materializes a selected GitHub issue before updating a manual entry", async () => {
    const githubProject = createProject({
      id: TEST_IDS.githubProject,
      name: "My-test-org-for-clock/test-repo",
      source: "github",
    });
    const entry = createEntry({
      project: {
        id: TEST_IDS.githubProject,
        name: githubProject.name,
      },
      projectId: TEST_IDS.githubProject,
      task: {
        id: TEST_IDS.githubTaskIssueOne,
        title: "some test issue",
      },
      taskId: TEST_IDS.githubTaskIssueOne,
    });
    const syncedTask = createTask({
      githubIssue: {
        githubRepo: "My-test-org-for-clock/test-repo",
        issueNumber: 1,
      },
      id: TEST_IDS.githubTaskIssueOne,
      projectId: TEST_IDS.githubProject,
      title: "some test issue",
    });
    const materializedTask = createTask({
      githubIssue: {
        githubRepo: "My-test-org-for-clock/test-repo",
        issueNumber: 2,
      },
      id: TEST_IDS.githubTaskIssueTwo,
      projectId: TEST_IDS.githubProject,
      title: "second test issue",
    });
    const client = createClientMock({
      entriesResponse: createEntryListResponse([entry]),
      tasksByProject: {
        [TEST_IDS.githubProject]: [syncedTask],
      },
      visibleProjects: [githubProject],
    });

    client.listGitHubRepositoryIssues.mockResolvedValue({
      items: [
        {
          id: "issue-1",
          nodeId: "node-1",
          number: 1,
          repository: {
            fullName: "My-test-org-for-clock/test-repo",
            name: "test-repo",
            owner: "My-test-org-for-clock",
          },
          state: "open",
          title: "some test issue",
          updatedAt: "2026-04-21T10:00:00.000Z",
          url: "https://github.com/My-test-org-for-clock/test-repo/issues/1",
        },
        {
          id: "issue-2",
          nodeId: "node-2",
          number: 2,
          repository: {
            fullName: "My-test-org-for-clock/test-repo",
            name: "test-repo",
            owner: "My-test-org-for-clock",
          },
          state: "open",
          title: "second test issue",
          updatedAt: "2026-04-21T10:01:00.000Z",
          url: "https://github.com/My-test-org-for-clock/test-repo/issues/2",
        },
      ],
      pagination: { hasNextPage: false, limit: 30, nextPageToken: null },
    });
    client.ensureGitHubIssueTask.mockResolvedValue(materializedTask);

    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="time-entry-edit-entry-completed"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="dialog-task-github-issue"]').trigger("click");
    await wrapper.get('[data-testid="dialog-save"]').trigger("click");
    await flushPromises();

    expect(client.ensureGitHubIssueTask).toHaveBeenCalledWith({
      githubRepo: "My-test-org-for-clock/test-repo",
      issueNumber: 2,
      issueTitle: "second test issue",
    });
    expect(client.updateEntry).toHaveBeenCalledWith(
      TEST_IDS.completedEntry,
      expect.objectContaining({
        taskId: TEST_IDS.githubTaskIssueTwo,
      }),
    );
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

  it("confirms dialog deletes, refreshes on success, and keeps failures visible on error", async () => {
    const client = createClientMock();

    client.deleteEntry.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Delete failed"));

    const { wrapper } = await mountView(client);

    await flushPromises();
    const editButtons = wrapper.findAll('[data-testid="time-entry-edit-entry-completed"]');
    await editButtons[editButtons.length - 1]!.trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="dialog-delete"]').trigger("click");
    await primeVueMocks.confirmRequire.mock.calls[0]?.[0].accept();
    await flushPromises();
    await flushPromises();

    expect(client.deleteEntry).toHaveBeenCalledWith(TEST_IDS.completedEntry);
    expect(client.listOwnEntries).toHaveBeenCalledTimes(2);

    const nextEditButtons = wrapper.findAll('[data-testid="time-entry-edit-entry-completed"]');
    await nextEditButtons[nextEditButtons.length - 1]!.trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="dialog-delete"]').trigger("click");
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
