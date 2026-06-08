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
const handleDialogPrimaryAction = vi.fn();
const openDialog = vi.fn();
const setCreateTaskTitle = vi.fn();
const setSelectedDescription = vi.fn();
const setSelectedProjectId = vi.fn();
const setSelectedTaskId = vi.fn();

const composableState = {
  closeDialog,
  confirmSelectedTask,
  createTaskErrorMessage: ref<string | null>(null),
  createTaskFromDialog,
  createTaskTitle: ref(""),
  elapsedTimeLabel: ref("01:00:00"),
  handleDialogPrimaryAction,
  isConfirmingSelection: ref(false),
  isConfirmSelectionDisabled: computed(() => false),
  isCreateTaskDisabled: computed(() => false),
  isCreatingTask: ref(false),
  isDialogPrimaryActionDisabled: computed(() => false),
  isDialogOpen: ref(false),
  isLoadingProjects: ref(false),
  isLoadingSummary: ref(false),
  isLoadingTasks: ref(false),
  isPrimaryActionPending: computed(() => false),
  isTimerRunning: ref(false),
  openDialog,
  primaryActionLabel: ref("Start"),
  projectsErrorMessage: ref<string | null>(null),
  projectOptions: shallowRef([]),
  selectedDescription: ref(""),
  selectedProjectId: ref<string | null>(null),
  selectedTaskId: ref<string | null>(null),
  selectionUpdateErrorMessage: ref<string | null>(null),
  setCreateTaskTitle,
  setSelectedDescription,
  setSelectedProjectId,
  setSelectedTaskId,
  summaryErrorMessage: ref<string | null>(null),
  taskOptions: shallowRef([]),
  tasksErrorMessage: ref<string | null>(null),
  timerActionErrorMessage: ref<string | null>(null),
  timerContextLabel: ref("Project Orion / Improve reports filters"),
  timerProjectLabel: ref("Project Orion"),
  timerStatusLabel: ref("Last tracked task"),
  timerTaskLabel: ref("Improve reports filters"),
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
    primaryActionLabel: { type: String, required: true },
    projectOptions: { type: Array, required: true },
    projectsErrorMessage: { type: String, default: null },
    selectedDescription: { type: String, default: "" },
    selectedProjectId: { type: String, default: null },
    selectedTaskId: { type: String, default: null },
    selectionUpdateErrorMessage: { type: String, default: null },
    taskOptions: { type: Array, required: true },
    timerActionErrorMessage: { type: String, default: null },
    tasksErrorMessage: { type: String, default: null },
  },
  emits: [
    "close",
    "confirm",
    "createTask",
    "primaryAction",
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
      handleDialogPrimaryAction,
      openDialog,
      setCreateTaskTitle,
      setSelectedDescription,
      setSelectedProjectId,
      setSelectedTaskId,
    }).forEach((spy) => spy.mockReset());

    composableState.primaryActionLabel.value = "Start";
    composableState.elapsedTimeLabel.value = "01:00:00";
    composableState.isTimerRunning.value = false;
    composableState.isLoadingSummary.value = false;
    composableState.summaryErrorMessage.value = null;
    composableState.timerContextLabel.value =
      "Project Orion / Improve reports filters";
    composableState.timerProjectLabel.value = "Project Orion";
    composableState.timerStatusLabel.value = "Last tracked task";
    composableState.timerTaskLabel.value = "Improve reports filters";
    composableState.selectedDescription.value = "";
    composableState.selectedProjectId.value = null;
    composableState.selectedTaskId.value = null;
    composableState.isDialogPrimaryActionDisabled = computed(() => false);
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
    expect(wrapper.get('[data-testid="top-bar-timer-context"]').text()).toContain(
      "Project Orion",
    );
    expect(wrapper.get('[data-testid="top-bar-timer-context"]').text()).toContain(
      "Improve reports filters",
    );
    expect(wrapper.get('[data-testid="top-bar-timer"]').attributes("aria-label")).toBe(
      "Open task and timer",
    );
    expect(wrapper.get('[data-testid="top-bar-timer"]').classes()).toContain(
      "h-[47px]",
    );
    expect(wrapper.get('[data-testid="top-bar-timer"]').classes()).toContain(
      "ring-inset",
    );
    expect(wrapper.get('[data-testid="top-bar-timer-context"]').classes()).not.toContain(
      "flex-1",
    );
    expect(wrapper.find('[data-testid="top-bar-timer-mobile-actions"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="top-bar-timer-primary-action"]').exists()).toBe(
      false,
    );
  });

  it("opens task selection from the desktop compact timer surface", async () => {
    const wrapper = mountTopBarTimer();

    await wrapper.get('[data-testid="top-bar-timer"]').trigger("click");

    expect(openDialog).toHaveBeenCalledTimes(1);
  });

  it("keeps the compact surface visible while loading", () => {
    composableState.isLoadingSummary.value = true;

    const wrapper = mountTopBarTimer();

    expect(wrapper.find('[data-testid="top-bar-timer"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="top-bar-timer-context"]').text()).toContain(
      "Project Orion",
    );
    expect(wrapper.get('[data-testid="top-bar-timer-context"]').text()).toContain(
      "Improve reports filters",
    );
    expect(wrapper.text()).not.toContain("01:00:00");
  });

  it("keeps the compact surface visible after a summary failure", () => {
    composableState.summaryErrorMessage.value = "network down";
    composableState.timerProjectLabel.value = "No eligible task";
    composableState.timerStatusLabel.value = "No eligible task";
    composableState.timerTaskLabel.value = "Choose a visible project and task.";
    composableState.timerContextLabel.value =
      "Choose a visible project and task to start tracking time.";

    const wrapper = mountTopBarTimer();

    expect(wrapper.find('[data-testid="top-bar-timer"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("No eligible task");
    expect(wrapper.find('[data-testid="top-bar-timer-context"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Choose a visible project and task.");
  });

  it("renders the live elapsed label only in the running stop state", async () => {
    composableState.primaryActionLabel.value = "Stop";
    composableState.isTimerRunning.value = true;

    const wrapper = mountTopBarTimer();

    expect(wrapper.text()).toContain("01:00:00");

    composableState.primaryActionLabel.value = "Start";
    composableState.isTimerRunning.value = false;
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain("01:00:00");
  });

  it("renders the selected mobile timer strip with an opener and right metadata", () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer();

    expect(wrapper.get('[data-testid="top-bar-timer"]').attributes("data-layout")).toBe(
      "mobile",
    );
    expect(wrapper.get('[data-testid="top-bar-timer-mobile-opener"]').text()).toContain(
      "Task & timer",
    );
    const mobileOpener = wrapper.get('[data-testid="top-bar-timer-mobile-opener"]');
    const mobileOpenerIcon = wrapper.get(
      '[data-testid="top-bar-timer-mobile-opener-icon"]',
    );

    expect(mobileOpener.classes()).toContain("h-[38px]");
    expect(mobileOpener.classes()).toContain("w-[132px]");
    expect(mobileOpener.classes()).toContain("gap-[5px]");
    expect(mobileOpener.classes()).toContain("ring-inset");
    expect(mobileOpener.classes()).toContain("text-brand");
    expect(mobileOpenerIcon.classes()).toContain("size-[13px]");
    expect(mobileOpenerIcon.attributes("aria-hidden")).toBe("true");
    expect(mobileOpenerIcon.findAll("path")).toHaveLength(5);
    expect(wrapper.find('[data-testid="top-bar-timer-mobile-actions"]').exists()).toBe(false);
    const mobileContext = wrapper.get('[data-testid="top-bar-timer-mobile-context"]');

    expect(mobileContext.element.tagName).toBe("DIV");
    expect(mobileContext.attributes("aria-label")).toBeUndefined();
    expect(mobileContext.classes()).toContain("flex-col");
    expect(mobileContext.classes()).toContain("items-start");
    expect(mobileContext.find(".line-clamp-2").exists()).toBe(true);
    expect(mobileContext.text()).toContain(
      "Project Orion",
    );
    expect(mobileContext.text()).toContain(
      "Improve reports filters",
    );
    expect(wrapper.find('[data-testid="top-bar-timer-context"]').exists()).toBe(false);
  });

  it("keeps the mobile Task & timer opener available for task selection", async () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer();

    await wrapper.get('[data-testid="top-bar-timer-mobile-opener"]').trigger("click");

    expect(openDialog).toHaveBeenCalledTimes(1);
  });

  it("does not open task selection from mobile timer metadata", async () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer();

    await wrapper.get('[data-testid="top-bar-timer-mobile-context"]').trigger("click");

    expect(openDialog).not.toHaveBeenCalled();
  });

  it("keeps the mobile opener accessible and actionable", async () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer();

    const opener = wrapper.get('[data-testid="top-bar-timer-mobile-opener"]');

    expect(opener.text()).toContain("Task & timer");
    expect(opener.attributes("disabled")).toBeUndefined();

    await opener.trigger("click");

    expect(openDialog).toHaveBeenCalledTimes(1);
  });

  it("shows the running elapsed label in the mobile strip metadata", () => {
    mockMatchMedia(true);
    composableState.primaryActionLabel.value = "Stop";
    composableState.isTimerRunning.value = true;
    composableState.timerProjectLabel.value = "Project Orion";
    composableState.timerStatusLabel.value = "Running timer";

    const wrapper = mountTopBarTimer();

    expect(wrapper.get('[data-testid="top-bar-timer-mobile-context"]').text()).toContain(
      "Project Orion",
    );
    expect(wrapper.get('[data-testid="top-bar-timer-mobile-context"]').text()).toContain(
      "01:00:00",
    );
    expect(
      wrapper.get('[data-testid="top-bar-timer-mobile-context"]').attributes("aria-label"),
    ).toBeUndefined();
    expect(
      wrapper.get('[data-testid="top-bar-timer-mobile-context"] .tabular-nums').attributes(
        "aria-hidden",
      ),
    ).toBe("true");
    expect(wrapper.get('[data-testid="top-bar-timer-elapsed"]').attributes("aria-live")).toBe(
      "off",
    );
    expect(
      wrapper.get('[data-testid="top-bar-timer-elapsed"]').attributes("role"),
    ).toBeUndefined();
  });

  it("keeps focus on the invoking mobile timer control when the task dialog closes", async () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer({ attachTo: document.body });
    const changeAction = wrapper.get('[data-testid="top-bar-timer-mobile-opener"]');

    (changeAction.element as HTMLElement).focus();
    await changeAction.trigger("click");

    expect(document.activeElement).toBe(changeAction.element);

    wrapper.getComponent({ name: "TopBarTimerTaskDialog" }).vm.$emit("close");
    await wrapper.vm.$nextTick();

    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(changeAction.element);
  });

  it("passes description state through the task dialog and handles description updates", async () => {
    composableState.selectedDescription.value = "Investigate release blocker";

    const wrapper = mountTopBarTimer();
    const dialog = wrapper.getComponent(TopBarTimerTaskDialogStub);

    expect(dialog.props("selectedDescription")).toBe("Investigate release blocker");

    dialog.vm.$emit("update:selectedDescription", "Updated description");
    await wrapper.vm.$nextTick();

    expect(setSelectedDescription).toHaveBeenCalledWith("Updated description");
  });

  it("routes dialog primary actions through the composable", async () => {
    const wrapper = mountTopBarTimer();
    const dialog = wrapper.getComponent(TopBarTimerTaskDialogStub);

    dialog.vm.$emit("primaryAction");
    await wrapper.vm.$nextTick();

    expect(handleDialogPrimaryAction).toHaveBeenCalledTimes(1);
  });
});
