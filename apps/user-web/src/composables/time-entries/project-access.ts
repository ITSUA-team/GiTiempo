import type { ProjectResponse } from "@gitiempo/shared";

export function getRemovedProjectIds(
  previousProjects: readonly ProjectResponse[],
  nextProjects: readonly ProjectResponse[],
): Set<string> {
  const nextProjectIds = new Set(nextProjects.map((project) => project.id));

  return new Set(
    previousProjects
      .filter((project) => !nextProjectIds.has(project.id))
      .map((project) => project.id),
  );
}
