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

// eslint-disable-next-line no-unused-vars
type MembersTableValueSetter<TValue> = (value: TValue) => void;

export interface MembersTableFilterHandlers {
  setGlobal: MembersTableValueSetter<string | undefined>;
  setLastActive: MembersTableValueSetter<MemberLastActiveFilter | undefined>;
  setMemberQuery: MembersTableValueSetter<string | undefined>;
  setProjectIds: MembersTableValueSetter<string[] | undefined>;
  setRole: MembersTableValueSetter<WorkspaceRole | null | undefined>;
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
export type MembersTableExpandedRowsSetter = MembersTableValueSetter<
  MembersTableExpandedRows | undefined
>;
