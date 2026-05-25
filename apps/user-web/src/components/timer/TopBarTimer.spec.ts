// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, shallowRef } from "vue";
import PrimeVue from "primevue/config";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import TopBarTimer from "./TopBarTimer.vue";

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

vi.mock("@/composables/timer/useTopBarTimer", () => ({
  useTopBarTimer: () => composableState,
}));

describe("TopBarTimer", () => {
  beforeEach(() => {
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
    composableState.isLoadingSummary.value = false;
    composableState.summaryErrorMessage.value = null;
    composableState.timerStatusLabel.value = "Last tracked task";
    composableState.isPrimaryActionDisabled = computed(() => false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the timer context field clickable", async () => {
    const wrapper = mount(TopBarTimer, {
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          TopBarTimerTaskDialog: true,
        },
      },
    });

    await wrapper.get('[data-testid="top-bar-timer-context"]').trigger("click");

    expect(openDialog).toHaveBeenCalledTimes(1);
  });

  it("disables the primary action when the state is not actionable", () => {
    composableState.isPrimaryActionDisabled = computed(() => true);

    const wrapper = mount(TopBarTimer, {
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          TopBarTimerTaskDialog: true,
        },
      },
    });

    expect(wrapper.get("button.p-button").attributes("disabled")).toBeDefined();
  });

  it("routes start and stop button clicks through the composable", async () => {
    const wrapper = mount(TopBarTimer, {
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          TopBarTimerTaskDialog: true,
        },
      },
    });

    await wrapper.get("button.p-button").trigger("click");

    expect(handlePrimaryAction).toHaveBeenCalledTimes(1);

    composableState.primaryActionLabel.value = "Stop";
    await wrapper.vm.$nextTick();
    await wrapper.get("button.p-button").trigger("click");

    expect(handlePrimaryAction).toHaveBeenCalledTimes(2);
  });

  it("keeps the compact surface visible and disables the action while loading", () => {
    composableState.isLoadingSummary.value = true;
    composableState.isPrimaryActionDisabled = computed(() => true);

    const wrapper = mount(TopBarTimer, {
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          TopBarTimerTaskDialog: true,
        },
      },
    });

    expect(wrapper.find('[data-testid="top-bar-timer"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="top-bar-timer-context"]').text()).toBe(
      "Project Orion / Improve reports filters",
    );
    expect(wrapper.get("button.p-button").attributes("disabled")).toBeDefined();
    expect(wrapper.text()).not.toContain("01:00:00");
  });

  it("keeps the compact surface visible and disables the action after a summary failure", () => {
    composableState.summaryErrorMessage.value = "network down";
    composableState.isPrimaryActionDisabled = computed(() => true);
    composableState.timerStatusLabel.value = "No eligible task";
    composableState.timerContextLabel.value =
      "Choose a visible project and task to start tracking time.";

    const wrapper = mount(TopBarTimer, {
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          TopBarTimerTaskDialog: true,
        },
      },
    });

    expect(wrapper.find('[data-testid="top-bar-timer"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("No eligible task");
    expect(wrapper.find('[data-testid="top-bar-timer-context"]').exists()).toBe(true);
    expect(wrapper.get("button.p-button").attributes("disabled")).toBeDefined();
  });

  it("renders the live elapsed label only in the running stop state", async () => {
    composableState.primaryActionLabel.value = "Stop";

    const wrapper = mount(TopBarTimer, {
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          TopBarTimerTaskDialog: true,
        },
      },
    });

    expect(wrapper.text()).toContain("01:00:00");

    composableState.primaryActionLabel.value = "Start";
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain("01:00:00");
  });
});
