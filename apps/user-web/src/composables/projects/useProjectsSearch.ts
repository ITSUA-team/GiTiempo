import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { computed, ref, shallowRef, type ComputedRef } from "vue";

import {
  buildProjectSearchSuggestions,
  buildProjectTaskGroups,
  filterProjectTaskGroups,
  type ProjectsSearchSuggestion,
} from "@/lib/projects-page-helpers";

export function useProjectsSearch(
  visibleProjects: ComputedRef<ProjectResponse[]>,
  tasksByProjectId: ComputedRef<Record<string, TaskResponse[]>>,
) {
  const selectedSearchValue = shallowRef<ProjectsSearchSuggestion | string | null>(
    null,
  );
  const searchSuggestions = ref<ProjectsSearchSuggestion[]>([]);
  const searchText = computed(() => {
    if (typeof selectedSearchValue.value === "string") {
      return selectedSearchValue.value;
    }

    return selectedSearchValue.value?.label ?? "";
  });
  const allProjectGroups = computed(() =>
    buildProjectTaskGroups(visibleProjects.value, tasksByProjectId.value),
  );
  const filteredProjectGroups = computed(() =>
    filterProjectTaskGroups(allProjectGroups.value, searchText.value),
  );

  function handleSearchComplete(query: string): void {
    searchSuggestions.value = buildProjectSearchSuggestions(allProjectGroups.value, query);
  }

  function setSearchValue(value: ProjectsSearchSuggestion | string | null): void {
    selectedSearchValue.value = value ?? null;
  }

  return {
    filteredProjectGroups,
    handleSearchComplete,
    searchSuggestions,
    selectedSearchValue,
    setSearchValue,
  };
}
