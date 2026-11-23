import type { ManagementTableColumn } from '@gitiempo/web-shared';

export const membersTableColumns = {
  member: { key: 'member', label: 'Member', width: 'fill' },
  role: { key: 'role', label: 'Role', width: 152 },
  projects: { key: 'projects', label: 'Projects Assigned', width: 220 },
  lastActive: { key: 'lastActive', label: 'Last Active', width: 184 },
} satisfies Record<string, ManagementTableColumn>;

export const projectsTableColumns = {
  project: { key: 'project', label: 'Project', width: 'fill' },
  source: { key: 'source', label: 'Source', width: 172 },
  members: { key: 'members', label: 'Assigned members', width: 220 },
  hours: { key: 'hours', label: 'Hours', width: 136 },
  visibility: { key: 'visibility', label: 'Visibility', width: 144 },
} satisfies Record<string, ManagementTableColumn>;
