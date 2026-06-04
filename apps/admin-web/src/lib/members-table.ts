import type {
  WorkspaceMemberResponse,
  WorkspaceRole,
} from '@gitiempo/shared';

export type MemberLastActiveFilter = 'any' | 'today' | 'thisWeek' | 'inactive';
export type MemberExpansionMode = 'assign' | 'edit';

export interface MembersTableFilters {
  global: string;
  lastActive: MemberLastActiveFilter;
  memberQuery: string;
  projectIds: string[];
  role: WorkspaceRole | null;
}

export interface MembersTableFilterOption<TValue extends string = string> {
  label: string;
  value: TValue;
}

export interface MembersTableFilterUpdate {
  global?: string | undefined;
  lastActive?: MemberLastActiveFilter | undefined;
  memberQuery?: string | undefined;
  projectIds?: string[] | undefined;
  role?: WorkspaceRole | null | undefined;
}

export interface MembersTableRow {
  avatarImage: string | undefined;
  avatarLabel: string | undefined;
  canAssignPm: boolean;
  canManage: boolean;
  email: string;
  id: string;
  lastActiveLabel: string;
  member: WorkspaceMemberResponse;
  primaryLabel: string;
  projectsAssignedLabel: string;
  roleLabel: string;
  secondaryLabel: string | null;
}

export type MembersTableExpandedRows = Record<string, boolean>;
export type MembersTableExpansionModes = Record<string, MemberExpansionMode>;
