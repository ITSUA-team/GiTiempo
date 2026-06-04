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
const handlePrimaryAction = vi.fn();
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
  handlePrimaryAction,
  isConfirmingSelection: ref(false),
  isConfirmSelectionDisabled: computed(() => false),
  isCreateTaskDisabled: computed(() => false),
  isCreatingTask: ref(false),
  isDialogOpen: ref(false),
  isLoadingProjects: ref(false),
  isLoadingSummary: ref(false),
  isLoadingTasks: ref(false),
  isPrimaryActionDisabled: computed(() => false),
  isPrimaryActionPending: computed(() => false),
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
  timerContextLabel: ref("Project Orion / Improve reports filters"),
  timerStatusLabel: ref("Last tracked task"),
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
    projectOptions: { type: Array, required: true },
    projectsErrorMessage: { type: String, default: null },
    selectedDescription: { type: String, default: "" },
    selectedProjectId: { type: String, default: null },
    selectedTaskId: { type: String, default: null },
    selectionUpdateErrorMessage: { type: String, default: null },
    taskOptions: { type: Array, required: true },
    tasksErrorMessage: { type: String, default: null },
  },
  emits: [
    "close",
    "confirm",
    "createTask",
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
      handlePrimaryAction,
      openDialog,
      setCreateTaskTitle,
      setSelectedDescription,
      setSelectedProjectId,
      setSelectedTaskId,
    }).forEach((spy) => spy.mockReset());

    composableState.primaryActionLabel.value = "Start";
    composableState.elapsedTimeLabel.value = "01:00:00";
    composableState.isLoadingSummary.value = false;
    composableState.summaryErrorMessage.value = null;
    composableState.timerContextLabel.value =
      "Project Orion / Improve reports filters";
    composableState.timerStatusLabel.value = "Last tracked task";
    composableState.selectedDescription.value = "";
    composableState.selectedProjectId.value = null;
    composableState.selectedTaskId.value = null;
    composableState.isPrimaryActionDisabled = computed(() => false);
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
    expect(wrapper.get('[data-testid="top-bar-timer-context"]').text()).toBe(
      "Project Orion / Improve reports filters",
    );
    expect(wrapper.get('[data-testid="top-bar-timer-context"]').attributes("aria-label")).toBe(
      "Change timer task",
    );
    expect(wrapper.find('[data-testid="top-bar-timer-mobile-actions"]').exists()).toBe(
      false,
    );
  });

  it("keeps the timer context field clickable", async () => {
    const wrapper = mountTopBarTimer();

    await wrapper.get('[data-testid="top-bar-timer-context"]').trigger("click");

    expect(openDialog).toHaveBeenCalledTimes(1);
  });

  it("disables the primary action when the state is not actionable", () => {
    composableState.isPrimaryActionDisabled = computed(() => true);

    const wrapper = mountTopBarTimer();

    expect(
      wrapper.get('[data-testid="top-bar-timer-primary-action"]').attributes("disabled"),
    ).toBeDefined();
  });

  it("routes start and stop button clicks through the composable", async () => {
    const wrapper = mountTopBarTimer();

    await wrapper.get('[data-testid="top-bar-timer-primary-action"]').trigger("click");

    expect(handlePrimaryAction).toHaveBeenCalledTimes(1);

    composableState.primaryActionLabel.value = "Stop";
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="top-bar-timer-primary-action"]').trigger("click");

    expect(handlePrimaryAction).toHaveBeenCalledTimes(2);
  });

  it("keeps the compact surface visible and disables the action while loading", () => {
    composableState.isLoadingSummary.value = true;
    composableState.isPrimaryActionDisabled = computed(() => true);

    const wrapper = mountTopBarTimer();

    expect(wrapper.find('[data-testid="top-bar-timer"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="top-bar-timer-context"]').text()).toBe(
      "Project Orion / Improve reports filters",
    );
    expect(
      wrapper.get('[data-testid="top-bar-timer-primary-action"]').attributes("disabled"),
    ).toBeDefined();
    expect(wrapper.text()).not.toContain("01:00:00");
  });

  it("keeps the compact surface visible and disables the action after a summary failure", () => {
    composableState.summaryErrorMessage.value = "network down";
    composableState.isPrimaryActionDisabled = computed(() => true);
    composableState.timerStatusLabel.value = "No eligible task";
    composableState.timerContextLabel.value =
      "Choose a visible project and task to start tracking time.";

    const wrapper = mountTopBarTimer();

    expect(wrapper.find('[data-testid="top-bar-timer"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("No eligible task");
    expect(wrapper.find('[data-testid="top-bar-timer-context"]').exists()).toBe(true);
    expect(
      wrapper.get('[data-testid="top-bar-timer-primary-action"]').attributes("disabled"),
    ).toBeDefined();
  });

  it("renders the live elapsed label only in the running stop state", async () => {
    composableState.primaryActionLabel.value = "Stop";

    const wrapper = mountTopBarTimer();

    expect(wrapper.text()).toContain("01:00:00");

    composableState.primaryActionLabel.value = "Start";
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain("01:00:00");
  });

  it("renders the selected mobile timer strip with left actions and right metadata", () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer();

    expect(wrapper.get('[data-testid="top-bar-timer"]').attributes("data-layout")).toBe(
      "mobile",
    );
    expect(wrapper.get('[data-testid="top-bar-timer-mobile-actions"]').text()).toContain(
      "Start",
    );
    expect(wrapper.get('[data-testid="top-bar-timer-mobile-actions"]').text()).toContain(
      "Change",
    );
    const mobileContext = wrapper.get('[data-testid="top-bar-timer-mobile-context"]');

    expect(mobileContext.element.tagName).toBe("DIV");
    expect(mobileContext.attributes("aria-label")).toBeUndefined();
    expect(mobileContext.classes()).toContain("flex-col");
    expect(mobileContext.classes()).toContain("items-start");
    expect(mobileContext.find(".line-clamp-2").exists()).toBe(true);
    expect(mobileContext.text()).toContain(
      "Last tracked task",
    );
    expect(mobileContext.text()).toContain(
      "Project Orion / Improve reports filters",
    );
    expect(wrapper.find('[data-testid="top-bar-timer-context"]').exists()).toBe(false);
  });

  it("keeps the mobile Change action available for task selection", async () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer();

    await wrapper.get('[data-testid="top-bar-timer-change-task"]').trigger("click");

    expect(openDialog).toHaveBeenCalledTimes(1);
  });

  it("does not open task selection from mobile timer metadata", async () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer();

    await wrapper.get('[data-testid="top-bar-timer-mobile-context"]').trigger("click");

    expect(openDialog).not.toHaveBeenCalled();
  });

  it("keeps the mobile Start, Stop, and Change controls accessible and actionable", async () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer();

    const primaryAction = wrapper.get(
      '[data-testid="top-bar-timer-mobile-actions"] [data-testid="top-bar-timer-primary-action"]',
    );
    const changeAction = wrapper.get('[data-testid="top-bar-timer-change-task"]');

    expect(primaryAction.text()).toContain("Start");
    expect(primaryAction.attributes("aria-label")).toBe("Start");
    expect(primaryAction.attributes("disabled")).toBeUndefined();
    expect(changeAction.text()).toContain("Change");
    expect(changeAction.attributes("aria-label")).toBe("Change timer task");
    expect(changeAction.attributes("disabled")).toBeUndefined();
    expect(changeAction.classes()).toContain("bg-surface-primary");
    expect(changeAction.classes()).toContain("border-divider");
    expect(changeAction.classes()).toContain("text-brand");
    expect(
      changeAction.find('[data-testid="top-bar-timer-change-task-icon"]').classes(),
    ).toContain("text-brand");

    await primaryAction.trigger("click");
    await changeAction.trigger("click");

    expect(handlePrimaryAction).toHaveBeenCalledTimes(1);
    expect(openDialog).toHaveBeenCalledTimes(1);

    composableState.primaryActionLabel.value = "Stop";
    await wrapper.vm.$nextTick();

    const stopAction = wrapper.get(
      '[data-testid="top-bar-timer-mobile-actions"] [data-testid="top-bar-timer-primary-action"]',
    );

    expect(stopAction.text()).toContain("Stop");
    expect(stopAction.attributes("aria-label")).toBe("Stop");

    await stopAction.trigger("click");

    expect(handlePrimaryAction).toHaveBeenCalledTimes(2);
  });

  it("uses disabled semantics for non-actionable mobile timer primary actions", () => {
    mockMatchMedia(true);
    composableState.isPrimaryActionDisabled = computed(() => true);

    const wrapper = mountTopBarTimer();

    expect(
      wrapper.get('[data-testid="top-bar-timer-primary-action"]').attributes("disabled"),
    ).toBeDefined();
    expect(
      wrapper.get('[data-testid="top-bar-timer-change-task"]').attributes("disabled"),
    ).toBeUndefined();
  });

  it("shows the running elapsed label in the mobile strip metadata", () => {
    mockMatchMedia(true);
    composableState.primaryActionLabel.value = "Stop";
    composableState.timerStatusLabel.value = "Running timer";

    const wrapper = mountTopBarTimer();

    expect(wrapper.get('[data-testid="top-bar-timer-mobile-context"]').text()).toContain(
      "Running timer",
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
    const changeAction = wrapper.get('[data-testid="top-bar-timer-change-task"]');

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
});
