import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, defineComponent, ref, shallowRef } from "vue";
import PrimeVue from "primevue/config";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";
import type { SyncedGitHubIssue } from "@gitiempo/shared";

import TopBarTimer from "./TopBarTimer.vue";
import { mockMatchMedia } from "@/test/mockMatchMedia";

const closeDialog = vi.fn();
const confirmSelectedTask = vi.fn();
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
  createTaskTitle: ref(""),
  elapsedTimeLabel: ref("01:00:00"),
  gitHubIssueProposals: shallowRef([]),
  gitHubProposalErrorMessage: ref<string | null>(null),
  handleDialogPrimaryAction,
  isConfirmingSelection: ref(false),
  isCreateTaskDisabled: computed(() => false),
  isCreatingTask: ref(false),
  isDialogOpen: ref(false),
  isDialogPrimaryActionDisabled: computed(() => false),
  isDialogSecondaryActionDisabled: computed(() => false),
  isLoadingGitHubTaskProposals: ref(false),
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
  timerGitHubIssue: ref<SyncedGitHubIssue | null>(null),
  timerProjectLabel: ref("Project Orion"),
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
    isLoadingGitHubTaskProposals: { type: Boolean, required: true },
    isLoadingProjects: { type: Boolean, required: true },
    isLoadingTasks: { type: Boolean, required: true },
    isOpen: { type: Boolean, required: true },
    isPrimaryActionDisabled: { type: Boolean, required: true },
    isPrimaryActionPending: { type: Boolean, required: true },
    primaryActionLabel: { type: String, required: true },
    gitHubIssueProposals: { type: Array, required: true },
    gitHubProposalErrorMessage: { type: String, default: null },
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

function mountTopBarTimer(options: { attachTo?: HTMLElement; openRequestId?: number } = {}) {
  const wrapper = mount(TopBarTimer, {
    attachTo: options.attachTo,
    props: {
      openRequestId: options.openRequestId ?? 0,
    },
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
      handleDialogPrimaryAction,
      openDialog,
      setCreateTaskTitle,
      setSelectedDescription,
      setSelectedProjectId,
      setSelectedTaskId,
    }).forEach((spy) => spy.mockReset());

    composableState.createTaskErrorMessage.value = null;
    composableState.createTaskTitle.value = "";
    composableState.elapsedTimeLabel.value = "01:00:00";
    composableState.gitHubIssueProposals.value = [];
    composableState.gitHubProposalErrorMessage.value = null;
    composableState.isConfirmingSelection.value = false;
    composableState.isDialogOpen.value = false;
    composableState.isLoadingGitHubTaskProposals.value = false;
    composableState.isLoadingProjects.value = false;
    composableState.isLoadingSummary.value = false;
    composableState.isLoadingTasks.value = false;
    composableState.isTimerRunning.value = false;
    composableState.primaryActionLabel.value = "Start";
    composableState.projectsErrorMessage.value = null;
    composableState.selectedDescription.value = "";
    composableState.selectedProjectId.value = null;
    composableState.selectedTaskId.value = null;
    composableState.selectionUpdateErrorMessage.value = null;
    composableState.summaryErrorMessage.value = null;
    composableState.tasksErrorMessage.value = null;
    composableState.timerActionErrorMessage.value = null;
    composableState.timerGitHubIssue.value = null;
    composableState.timerProjectLabel.value = "Project Orion";
    composableState.timerTaskLabel.value = "Improve reports filters";
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

    const surface = wrapper.get('[data-testid="top-bar-timer"]');
    const context = wrapper.get('[data-testid="top-bar-timer-context"]');

    expect(surface.attributes("data-layout")).toBe("desktop");
    expect(surface.attributes("aria-label")).toBe("Open task and timer");
    expect(surface.classes()).toContain("h-full");
    expect(surface.classes()).toContain("flex-1");
    expect(context.text()).toContain("Project Orion");
    expect(context.text()).toContain("Improve reports filters");
    expect(wrapper.find('[data-testid="top-bar-timer-github-link"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="top-bar-timer-mobile-opener"]').exists()).toBe(
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

  it("renders a separate desktop github issue link without opening the timer dialog", async () => {
    composableState.timerGitHubIssue.value = {
      githubRepo: "octo/repo",
      issueNumber: 184,
    };
    const wrapper = mountTopBarTimer();
    const link = wrapper.get('[data-testid="top-bar-timer-github-link"]');

    expect(link.attributes()).toMatchObject({
      href: "https://github.com/octo/repo/issues/184",
      target: "_blank",
    });

    await link.trigger("click");

    expect(openDialog).not.toHaveBeenCalled();
  });

  it("opens task selection from app-shell dialog requests", async () => {
    const wrapper = mountTopBarTimer();

    await wrapper.setProps({ openRequestId: 1 });

    expect(openDialog).toHaveBeenCalledTimes(1);

    await wrapper.setProps({ openRequestId: 2 });

    expect(openDialog).toHaveBeenCalledTimes(2);
  });

  it("keeps the compact surface visible while loading", () => {
    composableState.isLoadingSummary.value = true;

    const wrapper = mountTopBarTimer();

    expect(wrapper.find('[data-testid="top-bar-timer"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="top-bar-timer-context"]').text()).toContain(
      "Project Orion",
    );
    expect(wrapper.text()).not.toContain("01:00:00");
  });

  it("keeps the compact surface visible and disabled after a summary failure", async () => {
    composableState.summaryErrorMessage.value = "network down";
    composableState.timerProjectLabel.value = "No eligible task";
    composableState.timerTaskLabel.value = "Choose a visible project and task.";

    const wrapper = mountTopBarTimer();
    const surface = wrapper.get('[data-testid="top-bar-timer"]');

    expect(surface.attributes("disabled")).toBeDefined();
    expect(surface.attributes("aria-label")).toBe("Timer summary unavailable");
    expect(surface.classes()).toContain("cursor-not-allowed");
    expect(wrapper.text()).toContain("No eligible task");
    expect(wrapper.text()).toContain("Choose a visible project and task.");

    await surface.trigger("click");
    await wrapper.setProps({ openRequestId: 1 });

    expect(openDialog).not.toHaveBeenCalled();
  });

  it("renders the live elapsed label only in the running state", async () => {
    composableState.isTimerRunning.value = true;
    composableState.primaryActionLabel.value = "Stop";

    const wrapper = mountTopBarTimer();
    const elapsed = wrapper.get('[data-testid="top-bar-timer-elapsed"]');

    expect(wrapper.text()).toContain("01:00:00");
    expect(elapsed.classes()).toContain("text-xl");

    composableState.isTimerRunning.value = false;
    composableState.primaryActionLabel.value = "Start";
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain("01:00:00");
  });

  it("renders the selected mobile timer strip with an opener and right metadata", () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer();
    const opener = wrapper.get('[data-testid="top-bar-timer-mobile-opener"]');
    const metadata = wrapper.get('[data-testid="top-bar-timer-mobile-metadata"]');
    const icon = wrapper.get('[data-testid="top-bar-timer-mobile-opener-icon"]');

    expect(wrapper.get('[data-testid="top-bar-timer"]').attributes("data-layout")).toBe(
      "mobile",
    );
    expect(opener.text()).toContain("Task & timer");
    expect(opener.classes()).toContain("h-[38px]");
    expect(opener.classes()).toContain("w-[132px]");
    expect(opener.classes()).toContain("gap-[5px]");
    expect(opener.classes()).toContain("ring-inset");
    expect(icon.classes()).toContain("size-[13px]");
    expect(icon.attributes("aria-hidden")).toBe("true");
    expect(icon.findAll("path")).toHaveLength(5);
    expect(metadata.text()).toContain("Project Orion");
    expect(metadata.text()).toContain("Improve reports filters");
    expect(metadata.find(".line-clamp-2").exists()).toBe(true);
    expect(wrapper.find('[data-testid="top-bar-timer-context"]').exists()).toBe(false);
  });

  it("keeps the mobile Task & timer opener available for task selection", async () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer();

    await wrapper.get('[data-testid="top-bar-timer-mobile-opener"]').trigger("click");

    expect(openDialog).toHaveBeenCalledTimes(1);
  });

  it("renders the mobile summary failure opener as a disabled fallback", async () => {
    mockMatchMedia(true);
    composableState.summaryErrorMessage.value = "network down";
    composableState.timerProjectLabel.value = "No eligible task";
    composableState.timerTaskLabel.value = "Choose a visible project and task.";

    const wrapper = mountTopBarTimer();
    const opener = wrapper.get('[data-testid="top-bar-timer-mobile-opener"]');

    expect(opener.attributes("disabled")).toBeDefined();
    expect(opener.attributes("aria-label")).toBe("Timer summary unavailable");
    expect(opener.classes()).toContain("cursor-not-allowed");
    expect(wrapper.get('[data-testid="top-bar-timer-mobile-metadata"]').text()).toContain(
      "No eligible task",
    );

    await opener.trigger("click");

    expect(openDialog).not.toHaveBeenCalled();
  });

  it("does not open task selection from mobile timer metadata", async () => {
    mockMatchMedia(true);

    const wrapper = mountTopBarTimer();

    await wrapper.get('[data-testid="top-bar-timer-mobile-metadata"]').trigger("click");

    expect(openDialog).not.toHaveBeenCalled();
  });

  it("renders a separate mobile github issue link in timer metadata", async () => {
    mockMatchMedia(true);
    composableState.timerGitHubIssue.value = {
      githubRepo: "octo/repo",
      issueNumber: 184,
    };

    const wrapper = mountTopBarTimer();
    const link = wrapper.get('[data-testid="top-bar-timer-mobile-github-link"]');

    expect(link.attributes("href")).toBe("https://github.com/octo/repo/issues/184");
    expect(link.attributes("target")).toBe("_blank");
  });

  it("shows the running elapsed label in the mobile strip metadata", () => {
    mockMatchMedia(true);
    composableState.isTimerRunning.value = true;
    composableState.primaryActionLabel.value = "Stop";
    composableState.timerProjectLabel.value = "Project Atlas";
    composableState.timerTaskLabel.value = "Plan kickoff notes";

    const wrapper = mountTopBarTimer();
    const metadata = wrapper.get('[data-testid="top-bar-timer-mobile-metadata"]');

    expect(metadata.text()).toContain("Project Atlas");
    expect(metadata.text()).toContain("Plan kickoff notes");
    expect(metadata.text()).toContain("01:00:00");
    expect(wrapper.get('[data-testid="top-bar-timer-elapsed"]').attributes("aria-live")).toBe(
      "off",
    );
  });

  it("passes dialog state through and handles dialog events", async () => {
    composableState.selectedDescription.value = "Investigate release blocker";

    const wrapper = mountTopBarTimer();
    const dialog = wrapper.getComponent(TopBarTimerTaskDialogStub);

    expect(dialog.props("primaryActionLabel")).toBe("Start");
    expect(dialog.props("gitHubIssueProposals")).toEqual([]);
    expect(dialog.props("selectedDescription")).toBe("Investigate release blocker");

    dialog.vm.$emit("primaryAction");
    dialog.vm.$emit("update:selectedDescription", "Updated description");
    await wrapper.vm.$nextTick();

    expect(handleDialogPrimaryAction).toHaveBeenCalledTimes(1);
    expect(setSelectedDescription).toHaveBeenCalledWith("Updated description");
  });

  it("passes running dialog state through and routes change task", async () => {
    composableState.isTimerRunning.value = true;
    composableState.primaryActionLabel.value = "Stop";

    const wrapper = mountTopBarTimer();
    const dialog = wrapper.getComponent(TopBarTimerTaskDialogStub);

    expect(dialog.props("primaryActionLabel")).toBe("Stop");

    dialog.vm.$emit("confirm");
    dialog.vm.$emit("primaryAction");
    await wrapper.vm.$nextTick();

    expect(confirmSelectedTask).toHaveBeenCalledTimes(1);
    expect(handleDialogPrimaryAction).toHaveBeenCalledTimes(1);
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
});
