import { describe, expect, it } from "vitest";

import {
  getGitHubProjectIssueTaskOptionId,
  isGitHubProjectIssueSelectedTaskContext,
} from "@/lib/top-bar-timer-helpers";

import {
  isTopBarGitHubProjectIssueTaskOption,
  useTopBarTaskPicker,
  type GitHubProjectOption,
  type TopBarTaskOption,
} from "./useTopBarTaskPicker";

const board: GitHubProjectOption = {
  id: "PVT_GiTimpo",
  number: 7,
  title: "GiTimpo",
  owner: "ITSUA-team",
  state: "open",
  description: null,
  url: "https://github.com/orgs/ITSUA-team/projects/7",
  updatedAt: "2026-08-03T10:00:00.000Z",
  isGitHubProjectOption: true,
};

const githubIssue = { githubRepo: "ITSUA-team/GiTiempo", issueNumber: 343 };

function boardIssueOption(): TopBarTaskOption {
  return {
    createdAt: "2026-08-03T10:00:00.000Z",
    defaultBillableForTimeEntries: true,
    githubIssue,
    id: getGitHubProjectIssueTaskOptionId(githubIssue),
    isActive: true,
    isGitHubProjectIssueOption: true,
    issueTitle: "Timer pulls projects",
    projectId: "",
    status: "open",
    title: "Timer pulls projects",
    updatedAt: "2026-08-03T10:00:00.000Z",
    workspaceId: "",
  } as TopBarTaskOption;
}

const project = {
  id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
  workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
  name: "Internal Platform",
  description: null,
  color: null,
  visibility: "private" as const,
  defaultBillableForTasks: true,
  source: "manual" as const,
  totalSeconds: 0,
  members: [],
  isActive: true,
  createdAt: "2026-08-03T10:00:00.000Z",
  updatedAt: "2026-08-03T10:00:00.000Z",
};

describe("timer picker board targets", () => {
  it("keeps boards out of the project list entirely", () => {
    const picker = useTopBarTaskPicker();

    picker.setProjects([project]);
    picker.setGitHubProjects([board]);

    expect(picker.projects.value.map((p) => p.id)).toEqual([project.id]);
    expect(picker.activeProjects.value.map((p) => p.id)).toEqual([project.id]);
    expect(picker.githubProjects.value.map((p) => p.id)).toEqual([board.id]);
  });

  it("clears the selected project when a board is chosen", () => {
    const picker = useTopBarTaskPicker();

    picker.setProjects([project]);
    picker.setGitHubProjects([board]);
    picker.setSelectedProjectId(project.id);
    picker.setSelectedGitHubProjectId(board.id);

    expect(picker.selectedProjectId.value).toBeNull();
    expect(picker.selectedProject.value).toBeNull();
    expect(picker.selectedGitHubProject.value?.id).toBe(board.id);
  });

  it("clears the selected board when a project is chosen", () => {
    const picker = useTopBarTaskPicker();

    picker.setProjects([project]);
    picker.setGitHubProjects([board]);
    picker.setSelectedGitHubProjectId(board.id);
    picker.setSelectedProjectId(project.id);

    expect(picker.selectedGitHubProjectId.value).toBeNull();
    expect(picker.selectedProject.value?.id).toBe(project.id);
  });

  it("allows confirming a board issue selection without a project", () => {
    const picker = useTopBarTaskPicker();
    const option = boardIssueOption();

    picker.setGitHubProjects([board]);
    picker.setSelectedGitHubProjectId(board.id);
    picker.setTasks([option]);
    picker.setSelectedTaskId(option.id);

    expect(picker.selectedProject.value).toBeNull();
    expect(picker.isConfirmSelectionDisabled.value).toBe(false);
  });

  it("builds a board issue context carrying the issue repository", () => {
    const picker = useTopBarTaskPicker();
    const option = boardIssueOption();

    picker.setGitHubProjects([board]);
    picker.setSelectedGitHubProjectId(board.id);
    picker.setTasks([option]);
    picker.setSelectedTaskId(option.id);

    const context = picker.getSelectedTaskContext();

    expect(context).not.toBeNull();
    expect(isGitHubProjectIssueSelectedTaskContext(context!)).toBe(true);
    expect(context).toMatchObject({
      githubIssue,
      issueTitle: "Timer pulls projects",
      projectName: "GiTimpo",
      source: "github-project-issue",
    });
  });

  it("refuses a board issue selection paired with a real project", () => {
    const picker = useTopBarTaskPicker();
    const option = boardIssueOption();

    picker.setProjects([project]);
    picker.setSelectedProjectId(project.id);
    picker.setTasks([option]);
    picker.setSelectedTaskId(option.id);

    expect(picker.getSelectedTaskContext()).toMatchObject({
      projectId: project.id,
      source: "local",
    });
  });

  it("recognises board issue options", () => {
    expect(isTopBarGitHubProjectIssueTaskOption(boardIssueOption())).toBe(true);
  });

  it("tracks board availability, truncation and draft counts", () => {
    const picker = useTopBarTaskPicker();

    picker.setGitHubProjectAvailability("no-connection");
    picker.setGitHubProjectsTruncated(true);
    picker.setGitHubProjectDraftCount(4);

    expect(picker.githubProjectAvailability.value).toBe("no-connection");
    expect(picker.githubProjectsTruncated.value).toBe(true);
    expect(picker.githubProjectDraftCount.value).toBe(4);
  });

  it("resets the draft count when the board changes", () => {
    const picker = useTopBarTaskPicker();

    picker.setGitHubProjects([board]);
    picker.setSelectedGitHubProjectId(board.id);
    picker.setGitHubProjectDraftCount(4);
    picker.setSelectedGitHubProjectId(null);

    expect(picker.githubProjectDraftCount.value).toBe(0);
  });
});
