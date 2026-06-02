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

// eslint-disable-next-line no-unused-vars
type ProjectsTableValueSetter<TValue> = (value: TValue) => void;

export interface ProjectsTableFilterHandlers {
  setGlobal: ProjectsTableValueSetter<string | undefined>;
  setHours: ProjectsTableValueSetter<ProjectHoursFilter | undefined>;
  setMemberIds: ProjectsTableValueSetter<string[] | undefined>;
  setProjectQuery: ProjectsTableValueSetter<string | undefined>;
  setSource: ProjectsTableValueSetter<
    ProjectResponse['source'] | null | undefined
  >;
  setVisibility: ProjectsTableValueSetter<
    ProjectResponse['visibility'] | null | undefined
  >;
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
export type ProjectsTableExpandedRowsSetter = ProjectsTableValueSetter<
  ProjectsTableExpandedRows | undefined
>;
