import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { computed, ref, shallowRef, toValue, type MaybeRefOrGetter } from "vue";

import {
  buildProjectSearchSuggestions,
  buildProjectTaskGroups,
  filterProjectTaskGroups,
  type ProjectsSearchSuggestion,
} from "@/lib/projects-page-helpers";

interface UseProjectsSearchOptions {
  projects: MaybeRefOrGetter<ProjectResponse[]>;
  tasksByProjectId: MaybeRefOrGetter<Record<string, TaskResponse[]>>;
}

export function useProjectsSearch(options: UseProjectsSearchOptions) {
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
    buildProjectTaskGroups(
      toValue(options.projects),
      toValue(options.tasksByProjectId),
    ),
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
    allProjectGroups,
    filteredProjectGroups,
    handleSearchComplete,
    searchSuggestions,
    selectedSearchValue,
    setSearchValue,
  };
}
