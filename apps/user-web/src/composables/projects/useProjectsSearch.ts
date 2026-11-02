import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { computed, ref, shallowRef, watch, type ComputedRef } from "vue";

import {
  ALL_PROJECT_STATUSES_FILTER,
  ANY_PROJECT_UPDATED_FILTER,
  buildProjectSearchSuggestions,
  buildProjectTaskGroups,
  filterProjectTaskGroups,
  PROJECT_STATUS_FILTER_OPTIONS,
  PROJECT_UPDATED_FILTER_OPTIONS,
  type ProjectStatusFilterOption,
  type ProjectUpdatedFilterOption,
  type ProjectsSearchSuggestion,
} from "@/lib/projects-page-helpers";

export function useProjectsSearch(
  visibleProjects: ComputedRef<ProjectResponse[]>,
  tasksByProjectId: ComputedRef<Record<string, TaskResponse[]>>,
) {
  const selectedSearchValue = shallowRef<ProjectsSearchSuggestion | string | null>(
    null,
  );
  const selectedStatusFilter = shallowRef<ProjectStatusFilterOption>(
    ALL_PROJECT_STATUSES_FILTER,
  );
  const selectedUpdatedFilter = shallowRef<ProjectUpdatedFilterOption>(
    ANY_PROJECT_UPDATED_FILTER,
  );
  const searchSuggestions = ref<ProjectsSearchSuggestion[]>([]);
  const statusFilterOptions = PROJECT_STATUS_FILTER_OPTIONS;
  const updatedFilterOptions = PROJECT_UPDATED_FILTER_OPTIONS;
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
    filterProjectTaskGroups(allProjectGroups.value, searchText.value, {
      status: selectedStatusFilter.value.value,
      updated: selectedUpdatedFilter.value.value,
    }),
  );

  watch(allProjectGroups, (nextGroups, previousGroups) => {
    const nextSuggestions = buildProjectSearchSuggestions(nextGroups, "");
    const nextSuggestionIds = new Set(nextSuggestions.map((suggestion) => suggestion.id));
    const previousSuggestionIds = new Set(
      buildProjectSearchSuggestions(previousGroups, "").map(
        (suggestion) => suggestion.id,
      ),
    );

    searchSuggestions.value = searchSuggestions.value.filter((suggestion) =>
      nextSuggestionIds.has(suggestion.id),
    );

    if (
      typeof selectedSearchValue.value !== "string" &&
      selectedSearchValue.value !== null &&
      previousSuggestionIds.has(selectedSearchValue.value.id) &&
      !nextSuggestionIds.has(selectedSearchValue.value.id)
    ) {
      selectedSearchValue.value = null;
    }
  });

  function handleSearchComplete(query: string): void {
    searchSuggestions.value = buildProjectSearchSuggestions(allProjectGroups.value, query);
  }

  function setSearchValue(value: ProjectsSearchSuggestion | string | null): void {
    selectedSearchValue.value = value ?? null;
  }

  function setStatusFilterValue(
    value: ProjectStatusFilterOption | string | null,
  ): void {
    selectedStatusFilter.value = resolveFilterOption(
      PROJECT_STATUS_FILTER_OPTIONS,
      value,
      ALL_PROJECT_STATUSES_FILTER,
    );
  }

  function setUpdatedFilterValue(
    value: ProjectUpdatedFilterOption | string | null,
  ): void {
    selectedUpdatedFilter.value = resolveFilterOption(
      PROJECT_UPDATED_FILTER_OPTIONS,
      value,
      ANY_PROJECT_UPDATED_FILTER,
    );
  }

  return {
    filteredProjectGroups,
    handleSearchComplete,
    searchSuggestions,
    selectedSearchValue,
    selectedStatusFilter,
    selectedUpdatedFilter,
    setSearchValue,
    setStatusFilterValue,
    setUpdatedFilterValue,
    statusFilterOptions,
    updatedFilterOptions,
  };
}

interface FilterOption {
  label: string;
  value: string;
}

function resolveFilterOption<Option extends FilterOption>(
  options: Option[],
  value: Option | string | null,
  fallback: Option,
): Option {
  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    return (
      options.find((option) => option.label.toLowerCase() === normalizedValue) ??
      fallback
    );
  }

  if (value) {
    return options.find((option) => option.value === value.value) ?? fallback;
  }

  return fallback;
}
