import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const githubMocks = vi.hoisted(() => ({
  getConnectionStatus: vi.fn(),
  listOwners: vi.fn(),
  listProjectIssues: vi.fn(),
  listProjects: vi.fn(),
  listRepositories: vi.fn(),
  listRepositoryIssues: vi.fn(),
}));

vi.mock("@/config/clients", () => ({
  createDefaultGitHubBrowsingClient: () => ({
    listOwners: githubMocks.listOwners,
    listProjectIssues: githubMocks.listProjectIssues,
    listProjects: githubMocks.listProjects,
    listRepositories: githubMocks.listRepositories,
    listRepositoryIssues: githubMocks.listRepositoryIssues,
  }),
  createDefaultProfileGitHubClient: () => ({
    getConnectionStatus: githubMocks.getConnectionStatus,
  }),
}));

import ProjectTaskDialog from "./ProjectTaskDialog.vue";

const disconnectedGitHubStatus = {
  account: null,
  status: "disconnected" as const,
};

const connectedGitHubStatus = {
  account: {
    avatarUrl: null,
    connectedAt: "2026-05-01T10:00:00.000Z",
    githubUserId: "123456",
    login: "octo-org",
    updatedAt: "2026-05-01T10:00:00.000Z",
  },
  status: "connected" as const,
};

const githubOwner = {
  avatarUrl: null,
  label: "Octo Org",
  login: "octo-org",
  type: "organization" as const,
  url: "https://github.com/octo-org",
};

const githubRepository = {
  description: "Repository project",
  fullName: "octo-org/repo",
  id: "repo-1",
  isArchived: false,
  name: "repo",
  nodeId: "R_kwDO",
  owner: "octo-org",
  updatedAt: "2026-05-02T10:00:00.000Z",
  url: "https://github.com/octo-org/repo",
  visibility: "private" as const,
};

const githubProject = {
  description: null,
  id: "PVT_kwDO",
  number: 7,
  owner: "octo-org",
  state: "open" as const,
  title: "Roadmap",
  updatedAt: "2026-05-03T10:00:00.000Z",
  url: "https://github.com/orgs/octo-org/projects/7",
};

const githubIssue = {
  id: "issue-1",
  nodeId: "I_kwDO",
  number: 42,
  repository: {
    fullName: "octo-org/repo",
    name: "repo",
    owner: "octo-org",
  },
  state: "open" as const,
  title: "Track project work",
  updatedAt: "2026-05-04T10:00:00.000Z",
  url: "https://github.com/octo-org/repo/issues/42",
};

function createDeferred<T>() {
  // eslint-disable-next-line no-unused-vars
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

function findButtonByLabel(
  wrapper: ReturnType<typeof mountDialog>,
  label: string,
) {
  return wrapper.findAll("button").find((button) => button.text() === label);
}

function mountDialog(
  overrides: Partial<InstanceType<typeof ProjectTaskDialog>["$props"]> = {},
) {
  return mount(ProjectTaskDialog, {
    props: {
      errors: {
        projectId: null,
        status: null,
        title: null,
      },
      defaultBillableForTimeEntries: true,
      isDeleting: false,
      isOpen: true,
      isSaving: false,
      mode: "create",
      projectId: null,
      projects: [
        {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
          defaultBillableForTasks: true,
          description: null,
          id: "project-1",
          isActive: true,
          members: [],
          name: "Project Orion",
          source: "manual",
          totalSeconds: 43200,
          updatedAt: "2026-04-20T12:00:00.000Z",
          visibility: "public",
          workspaceId: "workspace-1",
        },
        {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
          defaultBillableForTasks: true,
          description: null,
          id: "project-2",
          isActive: true,
          members: [],
          name: "Admin Web",
          source: "manual",
          totalSeconds: 3600,
          updatedAt: "2026-04-20T12:00:00.000Z",
          visibility: "private",
          workspaceId: "workspace-1",
        },
      ],
      requestErrorMessage: null,
      saveLabel: "Create task",
      status: "open",
      subtitle: "Create a task in one of your visible projects.",
      title: "New task",
      valueTitle: "",
      ...overrides,
    },
    global: {
      stubs: {
        AutoComplete: {
          name: "AutoComplete",
          props: [
            "completeOnFocus",
            "dataKey",
            "disabled",
            "dropdown",
            "dropdownMode",
            "forceSelection",
            "inputId",
            "minLength",
            "modelValue",
            "optionLabel",
            "suggestions",
          ],
          emits: ["complete", "update:modelValue"],
          methods: {
            getOptionKey(option: Record<string, unknown>): string {
              const issue = option.issue as Record<string, unknown> | undefined;

              return String(
                option[this.dataKey] ??
                  option.id ??
                  option.projectItemId ??
                  issue?.id ??
                  option.login ??
                  option.label ??
                  option.title,
              );
            },
            getOptionLabel(option: Record<string, unknown>): string {
              if (typeof this.optionLabel === "function") {
                return this.optionLabel(option);
              }
              if (typeof this.optionLabel === "string") {
                return String(option[this.optionLabel] ?? "");
              }

              return String(option.label ?? option.title ?? option.name ?? "");
            },
          },
          computed: {
            displayValue(): string {
              return typeof this.modelValue === "string"
                ? this.modelValue
                : this.modelValue
                  ? this.getOptionLabel(this.modelValue)
                  : "";
            },
          },
          template: `
            <div :data-testid="inputId">
              <input
                :data-complete-on-focus="String(completeOnFocus === true || completeOnFocus === '')"
                :data-dropdown="String(dropdown !== undefined && dropdown !== false)"
                :data-dropdown-mode="dropdownMode ?? ''"
                :data-force-selection="String(forceSelection !== undefined && forceSelection !== false)"
                :data-min-length="String(minLength)"
                :disabled="disabled"
                :value="displayValue"
                @input="$emit('update:modelValue', $event.target.value)"
              />
              <button :data-testid="inputId + '-complete-empty'" type="button" @click="$emit('complete', { query: '' })">Complete empty</button>
              <button :data-testid="inputId + '-complete-admin'" type="button" @click="$emit('complete', { query: 'admin' })">Complete admin</button>
              <button
                v-for="suggestion in suggestions"
                :key="getOptionKey(suggestion)"
                :data-testid="inputId + '-option-' + getOptionKey(suggestion)"
                type="button"
                @click="$emit('update:modelValue', suggestion)"
              >{{ getOptionLabel(suggestion) }}</button>
            </div>
          `,
        },
        Button: {
          props: ["disabled", "label", "loading", "severity", "variant"],
          emits: ["click"],
          template:
            '<button :data-loading="String(loading)" :data-severity="severity" :data-variant="variant" :disabled="disabled" type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Checkbox: {
          props: ["disabled", "modelValue"],
          emits: ["update:modelValue"],
          template:
            '<input :checked="modelValue" :disabled="disabled" type="checkbox" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
        },
        Dialog: {
          props: ["closable", "dismissableMask", "visible"],
          emits: ["update:visible"],
          template:
            '<div v-if="visible" :data-closable="closable" :data-dismissable-mask="dismissableMask"><button data-testid="dialog-close" type="button" @click="$emit(\'update:visible\', false)">Close</button><slot name="header" /><slot /><slot name="footer" /></div>',
        },
        InputText: {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template:
            '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        Select: {
          props: ["disabled", "modelValue", "optionLabel", "optionValue", "options"],
          emits: ["update:modelValue"],
          template:
            '<select :disabled="disabled" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option[optionValue] ?? option.id" :value="option[optionValue] ?? option.id">{{ option[optionLabel] ?? option.name }}</option></select>',
        },
      },
    },
  });
}

describe("ProjectTaskDialog", () => {
  beforeEach(() => {
    githubMocks.getConnectionStatus.mockReset();
    githubMocks.listOwners.mockReset();
    githubMocks.listProjectIssues.mockReset();
    githubMocks.listProjects.mockReset();
    githubMocks.listRepositories.mockReset();
    githubMocks.listRepositoryIssues.mockReset();

    githubMocks.getConnectionStatus.mockResolvedValue(disconnectedGitHubStatus);
    githubMocks.listOwners.mockResolvedValue({ items: [githubOwner] });
    githubMocks.listRepositories.mockResolvedValue({
      items: [githubRepository],
      pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
    });
    githubMocks.listProjects.mockResolvedValue({
      items: [githubProject],
      pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
    });
    githubMocks.listRepositoryIssues.mockResolvedValue({
      items: [githubIssue],
      pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
    });
    githubMocks.listProjectIssues.mockResolvedValue({
      items: [{ isArchived: false, issue: githubIssue, projectItemId: "PVTI_kwDO" }],
      pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
      skipped: { draftIssues: 0, pullRequests: 0, redacted: 0, unknown: 0 },
    });
  });

  it("renders the create form and emits project and title updates", async () => {
    const wrapper = mountDialog();
    const titleInput = wrapper.findAll("input")[1]!;

    await wrapper.get('[data-testid="project-task-project-option-project-1"]').trigger("click");
    await titleInput.setValue("Write release checklist");

    expect(wrapper.emitted("update:projectId")?.[0]).toEqual(["project-1"]);
    expect(wrapper.emitted("update:title")?.[0]).toEqual([
      "Write release checklist",
    ]);
    expect(wrapper.text()).toContain("Create task");
    expect(wrapper.text()).toContain("Default billable for time entries");
    expect(wrapper.text()).toContain("New time entries for this task inherit this value.");
    expect(wrapper.text()).not.toContain("Cancel");
  });

  it("emits default billable updates", async () => {
    const wrapper = mountDialog({ defaultBillableForTimeEntries: false });

    await wrapper.get('input[type="checkbox"]').setValue(true);

    expect(wrapper.emitted("update:defaultBillableForTimeEntries")?.[0]).toEqual([
      true,
    ]);
  });

  it("uses project autocomplete and shows all projects on empty dropdown query", async () => {
    const wrapper = mountDialog();
    const projectAutoComplete = wrapper.get('[data-testid="project-task-project"]');
    const projectInput = projectAutoComplete.get("input");

    expect(projectInput.attributes("data-complete-on-focus")).toBe("true");
    expect(projectInput.attributes("data-dropdown")).toBe("true");
    expect(projectInput.attributes("data-dropdown-mode")).toBe("blank");
    expect(projectInput.attributes("data-force-selection")).toBe("true");
    expect(projectInput.attributes("data-min-length")).toBe("0");
    expect(wrapper.find("select").exists()).toBe(false);

    await wrapper.get('[data-testid="project-task-project-complete-admin"]').trigger("click");
    expect(projectAutoComplete.text()).toContain("Admin Web");
    expect(projectAutoComplete.text()).not.toContain("Project Orion");

    await wrapper.get('[data-testid="project-task-project-complete-empty"]').trigger("click");
    expect(projectAutoComplete.text()).toContain("Admin Web");
    expect(projectAutoComplete.text()).toContain("Project Orion");
  });

  it("loads connected GitHub repository issues and emits provider metadata", async () => {
    githubMocks.getConnectionStatus.mockResolvedValue(connectedGitHubStatus);
    const wrapper = mountDialog({ projectId: "project-1" });

    await flushPromises();

    expect(githubMocks.listOwners).toHaveBeenCalledWith({ type: "all" });
    expect(githubMocks.listRepositories).toHaveBeenCalledWith({
      limit: 100,
      owner: "octo-org",
      ownerType: "organization",
    });
    expect(wrapper.text()).toContain("GitHub issue source");

    await wrapper.get('[data-testid="project-task-github-repository-option-repo-1"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="project-task-github-issue-option-issue-1"]').trigger("click");

    expect(wrapper.emitted("update:title")?.at(-1)).toEqual(["Track project work"]);
    expect(wrapper.emitted("update:providerReference")?.at(-1)).toEqual([
      expect.objectContaining({
        externalKey: "octo-org/repo#42",
        externalType: "issue",
        provider: "github",
        sourceType: "repository_issue",
      }),
    ]);
    expect(wrapper.text()).toContain("Selected GitHub repository issue");
  });

  it("emits Project V2 issue-item metadata and can clear it for manual entry", async () => {
    githubMocks.getConnectionStatus.mockResolvedValue(connectedGitHubStatus);
    const wrapper = mountDialog({ projectId: "project-1" });

    await flushPromises();
    await wrapper.get('[data-testid="project-task-github-project-option-PVT_kwDO"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="project-task-github-issue-option-PVTI_kwDO"]').trigger("click");
    await flushPromises();

    expect(wrapper.emitted("update:providerReference")?.at(-1)).toEqual([
      expect.objectContaining({
        externalKey: "octo-org/repo#42",
        projectItemId: "PVTI_kwDO",
        sourceType: "project_v2_issue_item",
      }),
    ]);

    await wrapper.get('[data-testid="github-task-selected-source"] button').trigger("click");

    expect(wrapper.emitted("update:providerReference")?.at(-1)).toEqual([null]);
  });

  it("clears GitHub metadata when the manual title field is edited", async () => {
    githubMocks.getConnectionStatus.mockResolvedValue(connectedGitHubStatus);
    const wrapper = mountDialog({ projectId: "project-1" });

    await flushPromises();
    await wrapper.get('[data-testid="project-task-github-repository-option-repo-1"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="project-task-github-issue-option-issue-1"]').trigger("click");
    await wrapper.get('[data-testid="project-task-title-input"]').setValue("Manual follow-up");

    expect(wrapper.emitted("update:providerReference")?.at(-1)).toEqual([null]);
    expect(wrapper.emitted("update:title")?.at(-1)).toEqual(["Manual follow-up"]);
  });

  it("clears GitHub metadata when the issue candidate field receives raw text", async () => {
    githubMocks.getConnectionStatus.mockResolvedValue(connectedGitHubStatus);
    const wrapper = mountDialog({ projectId: "project-1" });

    await flushPromises();
    await wrapper.get('[data-testid="project-task-github-repository-option-repo-1"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="project-task-github-issue-option-issue-1"]').trigger("click");

    expect(wrapper.emitted("update:providerReference")?.at(-1)).toEqual([
      expect.objectContaining({ externalKey: "octo-org/repo#42" }),
    ]);

    await wrapper.get('[data-testid="project-task-github-issue"] input').setValue("Manual follow-up");

    expect(wrapper.emitted("update:providerReference")?.at(-1)).toEqual([null]);
    expect(wrapper.find('[data-testid="github-task-selected-source"]').exists()).toBe(false);
  });

  it("clears GitHub issue metadata when a selected scope field receives raw text", async () => {
    githubMocks.getConnectionStatus.mockResolvedValue(connectedGitHubStatus);
    const wrapper = mountDialog({ projectId: "project-1" });

    await flushPromises();
    await wrapper.get('[data-testid="project-task-github-repository-option-repo-1"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="project-task-github-issue-option-issue-1"]').trigger("click");

    expect(wrapper.emitted("update:providerReference")?.at(-1)).toEqual([
      expect.objectContaining({ externalKey: "octo-org/repo#42" }),
    ]);

    await wrapper.get('[data-testid="project-task-github-repository"] input').setValue("octo-org/other");

    expect(wrapper.emitted("update:providerReference")?.at(-1)).toEqual([null]);
    expect(wrapper.find('[data-testid="github-task-selected-source"]').exists()).toBe(false);
  });

  it("keeps manual creation available when GitHub is disconnected", async () => {
    const wrapper = mountDialog();

    await flushPromises();

    expect(wrapper.text()).toContain("You can still create a manual task now.");
    expect(wrapper.text()).toContain("Task title");
    expect(githubMocks.listOwners).not.toHaveBeenCalled();
  });

  it("renders GitHub loading, empty, and retryable error states", async () => {
    const connectionRequest = createDeferred<typeof connectedGitHubStatus>();
    githubMocks.getConnectionStatus.mockReturnValueOnce(connectionRequest.promise);
    const wrapper = mountDialog({ projectId: "project-1" });

    await flushPromises();

    expect(wrapper.text()).toContain("Checking GitHub connection...");

    connectionRequest.resolve(connectedGitHubStatus);
    githubMocks.listRepositoryIssues
      .mockRejectedValueOnce(new Error("Issues unavailable"))
      .mockResolvedValueOnce({
        items: [],
        pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
      });
    await flushPromises();

    await wrapper.get('[data-testid="project-task-github-repository-option-repo-1"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Issues unavailable");
    expect(wrapper.emitted("githubLoadError")?.at(-1)).toEqual([
      "Issues unavailable",
      expect.any(Error),
    ]);

    await wrapper.get('[data-testid="github-task-issues-retry"]').trigger("click");
    await flushPromises();

    expect(githubMocks.listRepositoryIssues).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("No issues are available for this scope.");
  });

  it("renders edit mode with a display-only project field and status select", () => {
    const wrapper = mountDialog({
      mode: "edit",
      projectId: "project-1",
      saveLabel: "Save changes",
      status: "closed",
      title: "Edit task",
      valueTitle: "Improve reports filters",
    });

    const selects = wrapper.findAll("select");
    const projectField = wrapper.get('[role="textbox"][aria-readonly="true"]');

    expect(selects).toHaveLength(1);
    expect(projectField.attributes("aria-labelledby")).toBe("project-task-project-label");
    expect(wrapper.text()).toContain("Project Orion");
    expect(wrapper.text()).toContain("Delete task");
    expect(wrapper.text()).toContain("Save changes");
    expect(wrapper.find('[data-testid="github-task-candidate-controls"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Cancel");
  });

  it("renders create mode without the edit-only delete action", () => {
    const wrapper = mountDialog();

    expect(wrapper.text()).toContain("Create task");
    expect(wrapper.text()).not.toContain("Delete task");
    expect(wrapper.text()).not.toContain("Cancel");
  });

  it("emits close from dialog dismissal and save from the primary footer action", async () => {
    const wrapper = mountDialog();

    await wrapper.get('[data-testid="dialog-close"]').trigger("click");
    await findButtonByLabel(wrapper, "Create task")?.trigger("click");

    expect(wrapper.emitted("close")?.length).toBeGreaterThan(0);
    expect(wrapper.emitted("save")?.length).toBeGreaterThan(0);
  });

  it("keeps the dialog shell non-closable while saving", () => {
    const wrapper = mountDialog({ isSaving: true });

    const dialogShell = wrapper.get("div[data-closable][data-dismissable-mask]");

    expect(dialogShell.attributes("data-closable")).toBe("false");
    expect(dialogShell.attributes("data-dismissable-mask")).toBe("false");
  });

  it("emits delete from the edit-only destructive action", async () => {
    const wrapper = mountDialog({
      mode: "edit",
      projectId: "project-1",
      saveLabel: "Save changes",
      title: "Edit task",
      valueTitle: "Improve reports filters",
    });
    const deleteButton = findButtonByLabel(wrapper, "Delete task");

    expect(deleteButton?.attributes("data-severity")).toBe("danger");
    expect(deleteButton?.attributes("data-variant")).toBe("outlined");

    await deleteButton?.trigger("click");

    expect(wrapper.emitted("deleteTask")?.length).toBe(1);
  });
});
