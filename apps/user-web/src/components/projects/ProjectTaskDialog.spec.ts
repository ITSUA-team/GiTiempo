import { mount } from "@vue/test-utils";
import type { ProjectResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";

import ProjectTaskDialog from "./ProjectTaskDialog.vue";
import {
  GITHUB_ISSUE_SUGGESTION_AVAILABILITY,
  type GitHubIssueTaskSuggestion,
} from "@/lib/github-issue-task-suggestions";

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
      gitHubIssueSuggestionAvailability:
        GITHUB_ISSUE_SUGGESTION_AVAILABILITY.AVAILABLE,
      gitHubIssueSuggestionErrorMessage: null,
      gitHubIssueSuggestions: [],
      isDeleting: false,
      isLoadingGitHubIssueSuggestions: false,
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
      selectedGitHubIssueSuggestionId: null,
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
            "appendTo",
            "dataKey",
            "disabled",
            "dropdown",
            "dropdownMode",
            "forceSelection",
            "inputId",
            "loading",
            "minLength",
            "modelValue",
            "optionLabel",
            "overlayClass",
            "suggestions",
          ],
          emits: ["complete", "update:modelValue"],
          computed: {
            displayValue(): string {
              return typeof this.modelValue === "string"
                ? this.modelValue
                : this.modelValue?.[this.optionLabel] ?? "";
            },
          },
          template: `
            <div :data-testid="inputId">
              <input
                :data-complete-on-focus="String(completeOnFocus === true || completeOnFocus === '')"
                :data-append-to="appendTo ?? ''"
                :data-dropdown="String(dropdown !== undefined && dropdown !== false)"
                :data-dropdown-mode="dropdownMode ?? ''"
                :data-force-selection="String(forceSelection !== undefined && forceSelection !== false)"
                :data-loading="String(loading)"
                :data-min-length="String(minLength)"
                :data-overlay-class="overlayClass ?? ''"
                :disabled="disabled"
                :value="displayValue"
                @input="$emit('update:modelValue', $event.target.value)"
              />
              <button :data-testid="inputId + '-complete-empty'" type="button" @click="$emit('complete', { query: '' })">Complete empty</button>
              <button :data-testid="inputId + '-complete-admin'" type="button" @click="$emit('complete', { query: 'admin' })">Complete admin</button>
              <button
                v-for="suggestion in suggestions"
                :key="suggestion[dataKey]"
                :data-testid="inputId + '-option-' + suggestion[dataKey]"
                type="button"
                @click="$emit('update:modelValue', suggestion)"
              >
                <slot name="option" :option="suggestion">
                  {{ suggestion[optionLabel] }}
                </slot>
              </button>
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
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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
  const githubProject = {
    color: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    defaultBillableForTasks: true,
    description: null,
    id: "project-github",
    isActive: true,
    members: [],
    name: "octo/repo",
    source: "github",
    totalSeconds: 3600,
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "public",
    workspaceId: "workspace-1",
  } satisfies ProjectResponse;
  const githubIssueSuggestion = {
    id: "github-issue-octo-repo-184",
    isGitHubIssueProposal: true,
    issue: {
      id: "github-issue-184",
      nodeId: null,
      number: 184,
      repository: {
        fullName: "octo/repo",
        name: "repo",
        owner: "octo",
      },
      state: "open",
      title: "Write release checklist",
      updatedAt: "2026-04-21T10:00:00.000Z",
      url: "https://github.com/octo/repo/issues/184",
    },
    repositoryLabel: "octo/repo",
    title: "Write release checklist",
  } satisfies GitHubIssueTaskSuggestion;

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
    expect(wrapper.text()).not.toContain("GitHub issue");
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
    expect(wrapper.text()).not.toContain("GitHub issue");
    expect(wrapper.text()).not.toContain("Cancel");
  });

  it("renders GitHub issue suggestions in create mode for GitHub projects", async () => {
    const wrapper = mountDialog({
      gitHubIssueSuggestions: [githubIssueSuggestion],
      projectId: "project-github",
      projects: [githubProject],
      selectedGitHubIssueSuggestionId: null,
    });
    const githubAutoComplete = wrapper.get('[data-testid="project-task-github-issue"]');

    expect(wrapper.text()).toContain("GitHub issue");
    expect(githubAutoComplete.get("input").attributes("data-dropdown")).toBe("true");
    expect(githubAutoComplete.get("input").attributes("data-force-selection")).toBe("true");
    expect(githubAutoComplete.get("input").attributes("data-append-to")).toBe("self");
    expect(githubAutoComplete.get("input").attributes("data-overlay-class")).toBe(
      "w-full max-w-full",
    );
    expect(wrapper.text()).toContain("Select an issue to prefill the local task title.");
    expect(wrapper.text()).toContain("octo/repo #184");
    expect(wrapper.text()).toContain("Write release checklist");

    await wrapper
      .get('[data-testid="project-task-github-issue-option-github-issue-octo-repo-184"]')
      .trigger("click");

    expect(wrapper.emitted("update:selectedGitHubIssueSuggestionId")?.[0]).toEqual([
      "github-issue-octo-repo-184",
    ]);
  });

  it("renders GitHub issue suggestion loading, error, and empty helper states", () => {
    const loadingWrapper = mountDialog({
      isLoadingGitHubIssueSuggestions: true,
      projectId: "project-github",
      projects: [githubProject],
    });

    expect(loadingWrapper.text()).toContain("Loading GitHub issue suggestions...");
    expect(
      loadingWrapper
        .get('[data-testid="project-task-github-issue"]')
        .get("input")
        .attributes("data-loading"),
    ).toBe("true");

    const errorWrapper = mountDialog({
      gitHubIssueSuggestionErrorMessage: "GitHub connection required",
      projectId: "project-github",
      projects: [githubProject],
    });

    expect(errorWrapper.text()).toContain(
      "GitHub issue suggestions are unavailable: GitHub connection required",
    );

    const emptyWrapper = mountDialog({
      projectId: "project-github",
      projects: [githubProject],
    });

    expect(emptyWrapper.text()).toContain(
      "No open GitHub issues are available for this project.",
    );
  });

  it("renders owner-unavailable GitHub issue copy separately from empty results", () => {
    const wrapper = mountDialog({
      gitHubIssueSuggestionAvailability:
        GITHUB_ISSUE_SUGGESTION_AVAILABILITY.OWNER_UNAVAILABLE,
      projectId: "project-github",
      projects: [githubProject],
    });

    expect(wrapper.text()).toContain(
      "GitHub issue suggestions are unavailable for this repository owner in this workspace.",
    );
    expect(wrapper.text()).toContain("You can still create a local task.");
    expect(wrapper.text()).not.toContain(
      "No open GitHub issues are available for this project.",
    );
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
