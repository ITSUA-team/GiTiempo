import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type {
  ProjectResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectEditForm from './ProjectEditForm.vue';

vi.mock('@/composables/feedback/useToasts', () => ({
  useToasts: () => ({
    errorToast: vi.fn(),
    successToast: vi.fn(),
  }),
}));

vi.mock('@/services/admin-projects-client', () => ({
  adminProjectsClient: {
    assignMember: vi.fn(),
    removeAssignment: vi.fn(),
    updateProject: vi.fn(),
  },
}));

const project: ProjectResponse = {
  color: null,
  createdAt: '2026-05-01T10:00:00.000Z',
  description: null,
  id: 'project-1',
  isActive: true,
  members: [
    {
      avatarUrl: null,
      displayName: 'Pat PM',
      email: 'pat@example.com',
      role: 'pm',
      userId: 'user-2',
    },
  ],
  name: 'Project Orion',
  source: 'manual',
  totalSeconds: 43200,
  updatedAt: '2026-05-01T10:00:00.000Z',
  visibility: 'public',
  workspaceId: 'workspace-1',
};

const members: WorkspaceMemberListResponse = [
  {
    avatarUrl: null,
    displayName: 'Alex Admin',
    email: 'alex@example.com',
    id: 'member-1',
    joinedAt: '2026-05-01T10:00:00.000Z',
    lastActiveAt: null,
    projectsAssignedCount: 0,
    role: 'admin',
    userId: 'user-1',
    workspaceId: 'workspace-1',
  },
  {
    avatarUrl: null,
    displayName: 'Pat PM',
    email: 'pat@example.com',
    id: 'member-2',
    joinedAt: '2026-05-01T10:00:00.000Z',
    lastActiveAt: null,
    projectsAssignedCount: 1,
    role: 'pm',
    userId: 'user-2',
    workspaceId: 'workspace-1',
  },
  {
    avatarUrl: null,
    displayName: null,
    email: 'member@example.com',
    id: 'member-3',
    joinedAt: '2026-05-01T10:00:00.000Z',
    lastActiveAt: null,
    projectsAssignedCount: 0,
    role: 'member',
    userId: 'user-3',
    workspaceId: 'workspace-1',
  },
];

const stubs = {
  Button: {
    props: ['label', 'type'],
    template: '<button :type="type">{{ label }}</button>',
  },
  EditFormPanel: {
    props: ['title'],
    template: '<section><h2>{{ title }}</h2><slot /></section>',
  },
  Form: {
    template:
      '<form><slot :memberIds="{ invalid: false }" :visibility="{ invalid: false }" /></form>',
  },
  MultiSelect: {
    props: ['id', 'name', 'options'],
    template:
      '<select :id="id" :name="name"><option v-for="option in options" :key="option.value">{{ option.label }}</option></select>',
  },
  Select: {
    props: ['id', 'name'],
    template: '<select :id="id" :name="name" />',
  },
};

describe('ProjectEditForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('keeps project settings in a desktop row with a mobile stack', () => {
    const wrapper = mount(ProjectEditForm, {
      props: { allMembers: members, project },
      global: { plugins: [createPinia()], stubs },
    });

    expect(wrapper.get('[data-testid="project-edit-form-layout"]').classes()).toEqual(
      expect.arrayContaining(['flex-col', 'sm:flex-row', 'sm:items-end']),
    );
    expect(wrapper.get('[data-testid="project-edit-form-actions"]').classes()).toEqual(
      expect.arrayContaining(['grid', 'w-full', 'sm:flex', 'sm:w-auto']),
    );
    expect(wrapper.get('label[for="edit-members"]').text()).toBe('Select members');
    expect(wrapper.get('label[for="edit-visibility"]').text()).toBe('Visibility');
    expect(wrapper.text()).toContain('Pat PM');
    expect(wrapper.text()).toContain('member@example.com');
    expect(wrapper.text()).not.toContain('Alex Admin');
    expect(wrapper.text()).toContain('Cancel');
    expect(wrapper.text()).toContain('Save');
  });
});
