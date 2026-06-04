import type { ProjectResponse } from '@gitiempo/shared';

export type ProjectHoursFilter = 'any' | 'tracked' | 'gte40' | 'zero';

export interface ProjectsTableFilters {
  global: string;
  hours: ProjectHoursFilter;
  memberIds: string[];
  projectQuery: string;
  source: ProjectResponse['source'] | null;
  visibility: ProjectResponse['visibility'] | null;
}

export interface ProjectsTableFilterOption<TValue extends string = string> {
  label: string;
  value: TValue;
}

export interface ProjectsTableFilterUpdate {
  global?: string | undefined;
  hours?: ProjectHoursFilter | undefined;
  memberIds?: string[] | undefined;
  projectQuery?: string | undefined;
  source?: ProjectResponse['source'] | null | undefined;
  visibility?: ProjectResponse['visibility'] | null | undefined;
}

export interface ProjectsTableRow {
  assignedMembersLabel: string;
  hoursLabel: string;
  id: string;
  isActive: boolean;
  name: string;
  nameClass: string;
  project: ProjectResponse;
  sourceLabel: string;
  visibility: ProjectResponse['visibility'];
  visibilityLabel: string;
}

export type ProjectsTableExpandedRows = Record<string, boolean>;
