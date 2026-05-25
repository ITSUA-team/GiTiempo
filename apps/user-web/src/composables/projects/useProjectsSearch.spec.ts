import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";
import { ref } from "vue";

import { useProjectsSearch } from "./useProjectsSearch";

function createProject(id: string, name: string): ProjectResponse {
  return {
    color: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    description: null,
    id,
    isActive: true,
    members: [],
    name,
    source: "manual",
    totalHours: 12,
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "public",
    workspaceId: "workspace-1",
  };
}

function createTask(id: string, projectId: string, title: string): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    id,
    isActive: true,
    projectId,
    status: "open",
    title,
    updatedAt: "2026-04-21T10:00:00.000Z",
    workspaceId: "workspace-1",
  };
}

describe("useProjectsSearch", () => {
  it("derives filtered project groups from search state", () => {
    const projects = ref([
      createProject("project-1", "Project Orion"),
      createProject("project-2", "Billing API"),
    ]);
    const tasksByProjectId = ref<Record<string, TaskResponse[]>>({
      "project-1": [createTask("task-1", "project-1", "Review PM scope rules")],
      "project-2": [createTask("task-2", "project-2", "Finalize invoice webhook")],
    });
    const search = useProjectsSearch({ projects, tasksByProjectId });

    search.setSearchValue("invoice");

    expect(search.filteredProjectGroups.value).toEqual([
      {
        project: expect.objectContaining({ id: "project-2" }),
        tasks: [expect.objectContaining({ id: "task-2" })],
      },
    ]);

    search.setSearchValue({
      id: "project:project-1",
      kind: "project",
      label: "Project Orion",
      projectId: "project-1",
    });

    expect(search.filteredProjectGroups.value).toHaveLength(1);
    expect(search.filteredProjectGroups.value[0]?.project.id).toBe("project-1");
  });

  it("builds search suggestions from current project groups", () => {
    const projects = ref([createProject("project-1", "Project Orion")]);
    const tasksByProjectId = ref<Record<string, TaskResponse[]>>({
      "project-1": [createTask("task-1", "project-1", "Review PM scope rules")],
    });
    const search = useProjectsSearch({ projects, tasksByProjectId });

    search.handleSearchComplete("review");

    expect(search.searchSuggestions.value).toEqual([
      {
        id: "task:task-1",
        kind: "task",
        label: "Review PM scope rules",
        projectId: "project-1",
      },
    ]);
  });
});
