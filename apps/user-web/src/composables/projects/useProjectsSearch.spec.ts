import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { computed, defineComponent, h, ref } from "vue";
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import { useProjectsSearch } from "./useProjectsSearch";

function project(id: string): ProjectResponse {
  return { id, name: `Project ${id}` } as ProjectResponse;
}

function task(id: string, projectId: string): TaskResponse {
  return { id, projectId, title: `Task ${id}` } as TaskResponse;
}

describe("useProjectsSearch", () => {
  it("removes revoked project and task suggestions without clearing valid selections", async () => {
    const projects = ref([project("project-a"), project("project-b")]);
    const tasksByProjectId = ref<Record<string, TaskResponse[]>>({
      "project-a": [task("task-a", "project-a")],
      "project-b": [task("task-b", "project-b")],
    });
    let search!: ReturnType<typeof useProjectsSearch>;
    const Host = defineComponent({
      setup() {
        search = useProjectsSearch(
          computed(() => projects.value),
          computed(() => tasksByProjectId.value),
        );
        return () => h("div");
      },
    });
    const wrapper = mount(Host);

    search.handleSearchComplete("");
    const revokedTask = search.searchSuggestions.value.find(
      (suggestion) => suggestion.id === "task:task-a",
    );
    const validProject = search.searchSuggestions.value.find(
      (suggestion) => suggestion.id === "project:project-b",
    );
    expect(revokedTask).toBeDefined();
    expect(validProject).toBeDefined();

    search.setSearchValue(revokedTask ?? null);
    projects.value = [project("project-b")];
    tasksByProjectId.value = { "project-b": [task("task-b", "project-b")] };
    await wrapper.vm.$nextTick();

    expect(search.selectedSearchValue.value).toBeNull();
    expect(search.searchSuggestions.value.map((suggestion) => suggestion.id)).toEqual([
      "project:project-b",
      "task:task-b",
    ]);

    search.setSearchValue(validProject ?? null);
    await wrapper.vm.$nextTick();
    expect(search.selectedSearchValue.value).toEqual(validProject);
    wrapper.unmount();
  });
});
