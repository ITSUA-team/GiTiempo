// @vitest-environment jsdom

import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, shallowRef } from "vue";
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
const setSelectedProjectId = vi.fn();
const setSelectedTaskId = vi.fn();

const composableState = {
  closeDialog,
  confirmSelectedTask,
  createTaskErrorMessage: shallowRef<string | null>(null),
  createTaskFromDialog,
  createTaskTitle: shallowRef(""),
  elapsedTimeLabel: shallowRef("01:00:00"),
  handlePrimaryAction,
  isConfirmSelectionDisabled: computed(() => false),
  isCreateTaskDisabled: computed(() => false),
  isCreatingTask: shallowRef(false),
  isDialogOpen: shallowRef(false),
  isLoadingProjects: shallowRef(false),
  isLoadingSummary: shallowRef(false),
  isLoadingTasks: shallowRef(false),
  isPrimaryActionDisabled: computed(() => false),
  isPrimaryActionPending: computed(() => false),
  openDialog,
  primaryActionLabel: shallowRef("Start"),
  projectsErrorMessage: shallowRef<string | null>(null),
  projectOptions: shallowRef([]),
  selectedProjectId: shallowRef<string | null>(null),
  selectedTaskId: shallowRef<string | null>(null),
  setCreateTaskTitle,
  setSelectedProjectId,
  setSelectedTaskId,
  summaryErrorMessage: shallowRef<string | null>(null),
  taskOptions: shallowRef([]),
  tasksErrorMessage: shallowRef<string | null>(null),
  timerContextLabel: shallowRef("Project Orion / Improve reports filters"),
  timerStatusLabel: shallowRef("Last tracked task"),
};

const mountedWrappers: VueWrapper[] = [];

vi.mock("@/composables/timer/useTopBarTimer", () => ({
  useTopBarTimer: () => composableState,
}));

function mountTopBarTimer(options: { attachTo?: HTMLElement } = {}) {
  const wrapper = mount(TopBarTimer, {
    attachTo: options.attachTo,
    global: {
      plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      stubs: {
        TopBarTimerTaskDialog: true,
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
    expect(wrapper.get('[data-testid="top-bar-timer-mobile-context"]').text()).toContain(
      "Last tracked task",
    );
    expect(wrapper.get('[data-testid="top-bar-timer-mobile-context"]').text()).toContain(
      "Project Orion / Improve reports filters",
    );
    expect(
      wrapper.get('[data-testid="top-bar-timer-mobile-context"]').attributes("aria-label"),
    ).toBe("Change timer task");
    expect(wrapper.find('[data-testid="top-bar-timer-context"]').exists()).toBe(false);
  });

  it("keeps the mobile Change action available for task selection", async () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer();

    await wrapper.get('[data-testid="top-bar-timer-change-task"]').trigger("click");

    expect(openDialog).toHaveBeenCalledTimes(1);
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
    ).toBe("Change timer task");
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
});
