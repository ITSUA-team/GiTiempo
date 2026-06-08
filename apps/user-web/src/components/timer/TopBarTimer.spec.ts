import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, defineComponent, ref, shallowRef } from "vue";
import PrimeVue from "primevue/config";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import TopBarTimer from "./TopBarTimer.vue";
import { mockMatchMedia } from "@/test/mockMatchMedia";

const closeDialog = vi.fn();
const confirmSelectedTask = vi.fn();
const createTaskFromDialog = vi.fn();
const openDialog = vi.fn();
const setCreateTaskTitle = vi.fn();
const setSelectedDescription = vi.fn();
const setSelectedProjectId = vi.fn();
const setSelectedTaskId = vi.fn();
const startTimerFromDialog = vi.fn();
const stopTimerFromDialog = vi.fn();

const composableState = {
  closeDialog,
  confirmSelectedTask,
  createTaskErrorMessage: ref<string | null>(null),
  createTaskFromDialog,
  createTaskTitle: ref(""),
  currentTimer: shallowRef<null | { project: { name: string }; task: { title: string } }>(null),
  elapsedTimeLabel: ref("01:00:00"),
  isConfirmingSelection: ref(false),
  isCreateTaskDisabled: computed(() => false),
  isCreatingTask: ref(false),
  isDialogOpen: ref(false),
  isDialogPrimaryActionDisabled: computed(() => false),
  isDialogSecondaryActionDisabled: computed(() => false),
  isLoadingProjects: ref(false),
  isLoadingSummary: ref(false),
  isLoadingTasks: ref(false),
  isPrimaryActionPending: computed(() => false),
  isTimerRunning: ref(false),
  openDialog,
  primaryActionLabel: ref("Start"),
  projectsErrorMessage: ref<string | null>(null),
  projectOptions: shallowRef([]),
  selectedContext: shallowRef<null | { projectName: string; taskTitle: string }>(
    {
      projectName: "Project Orion",
      taskTitle: "Improve reports filters",
    },
  ),
  selectedDescription: ref(""),
  selectedProjectId: ref<string | null>(null),
  selectedTaskId: ref<string | null>(null),
  selectionUpdateErrorMessage: ref<string | null>(null),
  setCreateTaskTitle,
  setSelectedDescription,
  setSelectedProjectId,
  setSelectedTaskId,
  startTimerFromDialog,
  stopTimerFromDialog,
  summaryErrorMessage: ref<string | null>(null),
  taskOptions: shallowRef([]),
  tasksErrorMessage: ref<string | null>(null),
  timerActionErrorMessage: ref<string | null>(null),
};

const mountedWrappers: VueWrapper[] = [];

const TopBarTimerTaskDialogStub = defineComponent({
  name: "TopBarTimerTaskDialog",
  props: {
    createTaskErrorMessage: { type: String, default: null },
    createTaskTitle: { type: String, default: "" },
    isConfirmSelectionDisabled: { type: Boolean, required: true },
    isConfirmingSelection: { type: Boolean, required: true },
    isCreateTaskDisabled: { type: Boolean, required: true },
    isCreatingTask: { type: Boolean, required: true },
    isLoadingProjects: { type: Boolean, required: true },
    isLoadingTasks: { type: Boolean, required: true },
    isOpen: { type: Boolean, required: true },
    isPrimaryActionDisabled: { type: Boolean, required: true },
    isPrimaryActionPending: { type: Boolean, required: true },
    isTimerRunning: { type: Boolean, required: true },
    primaryActionLabel: { type: String, required: true },
    projectOptions: { type: Array, required: true },
    projectsErrorMessage: { type: String, default: null },
    selectedDescription: { type: String, default: "" },
    selectedProjectId: { type: String, default: null },
    selectedTaskId: { type: String, default: null },
    selectionUpdateErrorMessage: { type: String, default: null },
    taskOptions: { type: Array, required: true },
    tasksErrorMessage: { type: String, default: null },
    timerActionErrorMessage: { type: String, default: null },
  },
  emits: [
    "close",
    "confirm",
    "createTask",
    "primary-action",
    "update:createTaskTitle",
    "update:selectedDescription",
    "update:selectedProjectId",
    "update:selectedTaskId",
  ],
  template: '<div data-testid="top-bar-timer-task-dialog-stub" />',
});

vi.mock("@/composables/timer/useTopBarTimer", () => ({
  useTopBarTimer: () => composableState,
}));

function mountTopBarTimer(options: { attachTo?: HTMLElement } = {}) {
  const wrapper = mount(TopBarTimer, {
    attachTo: options.attachTo,
    global: {
      plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      stubs: {
        TopBarTimerTaskDialog: TopBarTimerTaskDialogStub,
      },
    },
  });

  mountedWrappers.push(wrapper);

  return wrapper;
}

describe("TopBarTimer", () => {
  beforeEach(() => {
    mockMatchMedia(false);

    Object.values({
      closeDialog,
      confirmSelectedTask,
      createTaskFromDialog,
      openDialog,
      setCreateTaskTitle,
      setSelectedDescription,
      setSelectedProjectId,
      setSelectedTaskId,
      startTimerFromDialog,
      stopTimerFromDialog,
    }).forEach((spy) => spy.mockReset());

    composableState.createTaskErrorMessage.value = null;
    composableState.createTaskTitle.value = "";
    composableState.currentTimer.value = null;
    composableState.elapsedTimeLabel.value = "01:00:00";
    composableState.isConfirmingSelection.value = false;
    composableState.isDialogOpen.value = false;
    composableState.isLoadingProjects.value = false;
    composableState.isLoadingSummary.value = false;
    composableState.isLoadingTasks.value = false;
    composableState.isTimerRunning.value = false;
    composableState.primaryActionLabel.value = "Start";
    composableState.projectsErrorMessage.value = null;
    composableState.selectedContext.value = {
      projectName: "Project Orion",
      taskTitle: "Improve reports filters",
    };
    composableState.selectedDescription.value = "";
    composableState.selectedProjectId.value = null;
    composableState.selectedTaskId.value = null;
    composableState.selectionUpdateErrorMessage.value = null;
    composableState.summaryErrorMessage.value = null;
    composableState.tasksErrorMessage.value = null;
    composableState.timerActionErrorMessage.value = null;
    composableState.isDialogPrimaryActionDisabled = computed(() => false);
    composableState.isDialogSecondaryActionDisabled = computed(() => false);
    composableState.isCreateTaskDisabled = computed(() => false);
    composableState.isPrimaryActionPending = computed(() => false);
  });

  afterEach(() => {
    for (const wrapper of mountedWrappers) {
      wrapper.unmount();
    }

    mountedWrappers.length = 0;
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders the desktop compact timer surface by default", () => {
    const wrapper = mountTopBarTimer();

    expect(wrapper.get('[data-testid="top-bar-timer"]').attributes("data-layout")).toBe(
      "desktop",
    );
    expect(wrapper.get('[data-testid="top-bar-timer-surface"]').text()).toContain(
      "Project Orion",
    );
    expect(wrapper.get('[data-testid="top-bar-timer-surface"]').text()).toContain(
      "Improve reports filters",
    );
    expect(wrapper.find('[data-testid="top-bar-timer-mobile-opener"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="top-bar-timer-primary-action"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="top-bar-timer-change-task"]').exists()).toBe(
      false,
    );
  });

  it("keeps the desktop timer surface clickable", async () => {
    const wrapper = mountTopBarTimer();

    await wrapper.get('[data-testid="top-bar-timer-surface"]').trigger("click");

    expect(openDialog).toHaveBeenCalledTimes(1);
  });

  it("keeps the compact surface visible while loading and after summary failure", () => {
    composableState.isLoadingSummary.value = true;

    let wrapper = mountTopBarTimer();

    expect(wrapper.find('[data-testid="top-bar-timer-surface"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Loading timer");
    expect(wrapper.text()).not.toContain("01:00:00");

    wrapper.unmount();
    mountedWrappers.pop();

    composableState.isLoadingSummary.value = false;
    composableState.selectedContext.value = null;
    composableState.summaryErrorMessage.value = "network down";

    wrapper = mountTopBarTimer();

    expect(wrapper.find('[data-testid="top-bar-timer-surface"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Timer unavailable");
    expect(wrapper.text()).toContain("Open the popup to choose a task.");
  });

  it("renders the live elapsed label only in the running state", async () => {
    composableState.currentTimer.value = {
      project: { name: "Project Orion" },
      task: { title: "Improve reports filters" },
    };
    composableState.isTimerRunning.value = true;
    composableState.primaryActionLabel.value = "Stop";

    const wrapper = mountTopBarTimer();

    expect(wrapper.text()).toContain("01:00:00");

    composableState.currentTimer.value = null;
    composableState.isTimerRunning.value = false;
    composableState.primaryActionLabel.value = "Start";
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain("01:00:00");
  });

  it("renders the selected mobile timer strip with a left opener and right metadata", async () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer();
    const opener = wrapper.get('[data-testid="top-bar-timer-mobile-opener"]');
    const metadata = wrapper.get('[data-testid="top-bar-timer-mobile-metadata"]');

    expect(wrapper.get('[data-testid="top-bar-timer"]').attributes("data-layout")).toBe(
      "mobile",
    );
    expect(opener.text()).toContain("Task & timer");
    expect(metadata.text()).toContain("Project Orion");
    expect(metadata.text()).toContain("Improve reports filters");
    expect(wrapper.find('[data-testid="top-bar-timer-surface"]').exists()).toBe(false);

    await opener.trigger("click");
    await metadata.trigger("click");

    expect(openDialog).toHaveBeenCalledTimes(1);
  });

  it("shows the running elapsed label in the mobile strip metadata", () => {
    mockMatchMedia(true);
    composableState.currentTimer.value = {
      project: { name: "Project Atlas" },
      task: { title: "Plan kickoff notes" },
    };
    composableState.isTimerRunning.value = true;
    composableState.primaryActionLabel.value = "Stop";

    const wrapper = mountTopBarTimer();
    const metadata = wrapper.get('[data-testid="top-bar-timer-mobile-metadata"]');

    expect(metadata.text()).toContain("Project Atlas");
    expect(metadata.text()).toContain("Plan kickoff notes");
    expect(metadata.text()).toContain("01:00:00");
    expect(wrapper.get('[data-testid="top-bar-timer-elapsed"]').attributes("aria-live")).toBe(
      "off",
    );
  });

  it("passes dialog state through and routes idle primary actions to start", async () => {
    const wrapper = mountTopBarTimer();
    const dialog = wrapper.getComponent(TopBarTimerTaskDialogStub);

    expect(dialog.props("primaryActionLabel")).toBe("Start timer");
    expect(dialog.props("isTimerRunning")).toBe(false);

    dialog.vm.$emit("primary-action");
    dialog.vm.$emit("update:selectedDescription", "Updated description");
    await wrapper.vm.$nextTick();

    expect(startTimerFromDialog).toHaveBeenCalledTimes(1);
    expect(setSelectedDescription).toHaveBeenCalledWith("Updated description");
  });

  it("passes dialog state through and routes running actions to change or stop", async () => {
    composableState.currentTimer.value = {
      project: { name: "Project Orion" },
      task: { title: "Improve reports filters" },
    };
    composableState.isTimerRunning.value = true;
    composableState.primaryActionLabel.value = "Stop";

    const wrapper = mountTopBarTimer();
    const dialog = wrapper.getComponent(TopBarTimerTaskDialogStub);

    expect(dialog.props("primaryActionLabel")).toBe("Stop timer");
    expect(dialog.props("isTimerRunning")).toBe(true);

    dialog.vm.$emit("confirm");
    dialog.vm.$emit("primary-action");
    await wrapper.vm.$nextTick();

    expect(confirmSelectedTask).toHaveBeenCalledTimes(1);
    expect(stopTimerFromDialog).toHaveBeenCalledTimes(1);
  });

  it("keeps focus on the invoking mobile timer opener when the task dialog closes", async () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer({ attachTo: document.body });
    const opener = wrapper.get('[data-testid="top-bar-timer-mobile-opener"]');

    (opener.element as HTMLElement).focus();
    await opener.trigger("click");

    expect(document.activeElement).toBe(opener.element);

    wrapper.getComponent({ name: "TopBarTimerTaskDialog" }).vm.$emit("close");
    await wrapper.vm.$nextTick();

    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(opener.element);
  });

  it("passes description state through the task dialog", () => {
    composableState.selectedDescription.value = "Investigate release blocker";

    const wrapper = mountTopBarTimer();
    const dialog = wrapper.getComponent(TopBarTimerTaskDialogStub);

    expect(dialog.props("selectedDescription")).toBe("Investigate release blocker");
  });
});
