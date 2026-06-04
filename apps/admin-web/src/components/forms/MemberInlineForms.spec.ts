import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type {
  ProjectListResponse,
  WorkspaceMemberResponse,
} from '@gitiempo/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MemberAssignPmPanel from './MemberAssignPmPanel.vue';
import MemberEditForm from './MemberEditForm.vue';

vi.mock('@/composables/feedback/useToasts', () => ({
  useToasts: () => ({
    errorToast: vi.fn(),
    successToast: vi.fn(),
  }),
}));

vi.mock('@/services/admin-members-client', () => ({
  adminMembersClient: {
    updateMemberRole: vi.fn(),
  },
}));

vi.mock('@/services/admin-projects-client', () => ({
  adminProjectsClient: {
    assignMember: vi.fn(),
    removeAssignment: vi.fn(),
  },
}));

const member: WorkspaceMemberResponse = {
  avatarUrl: null,
  displayName: 'Pat PM',
  email: 'pat@example.com',
  id: 'member-1',
  joinedAt: '2026-05-01T10:00:00.000Z',
  lastActiveAt: '2026-05-02T11:00:00.000Z',
  projectsAssignedCount: 2,
  role: 'pm',
  userId: 'user-2',
  workspaceId: 'workspace-1',
};

const projects: ProjectListResponse = [
  {
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
    totalHours: 12,
    updatedAt: '2026-05-01T10:00:00.000Z',
    visibility: 'public',
    workspaceId: 'workspace-1',
  },
  {
    color: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    description: null,
    id: 'project-2',
    isActive: true,
    members: [],
    name: 'Project Atlas',
    source: 'manual',
    totalHours: 4,
    updatedAt: '2026-05-01T10:00:00.000Z',
    visibility: 'private',
    workspaceId: 'workspace-1',
  },
  {
    color: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    description: null,
    id: 'project-3',
    isActive: false,
    members: [],
    name: 'Archived Project',
    source: 'manual',
    totalHours: 0,
    updatedAt: '2026-05-01T10:00:00.000Z',
    visibility: 'public',
    workspaceId: 'workspace-1',
  },
];

const stubs = {
  Button: {
    props: ['label', 'type'],
    template: '<button :type="type">{{ label }}</button>',
  },
  Checkbox: {
    props: ['inputId', 'name', 'value'],
    template: '<input :id="inputId" type="checkbox" :name="name" :value="value" />',
  },
  EditFormPanel: {
    props: ['title'],
    template: '<section><h2>{{ title }}</h2><slot /></section>',
  },
  Form: { template: '<form><slot /></form>' },
  InputText: {
    props: ['id', 'modelValue'],
    template: '<input :id="id" :value="modelValue" v-bind="$attrs" />',
  },
  Select: {
    props: ['id', 'name'],
    template: '<select :id="id" :name="name" />',
  },
};

describe('member inline forms', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('keeps the member edit controls in a desktop row with a mobile stack', () => {
    const wrapper = mount(MemberEditForm, {
      props: { member },
      global: { plugins: [createPinia()], stubs },
    });

    expect(wrapper.get('[data-testid="member-edit-form-layout"]').classes()).toEqual(
      expect.arrayContaining(['flex', 'flex-col', 'gap-2.5']),
    );
    expect(wrapper.get('[data-testid="member-edit-form-fields"]').classes()).toEqual(
      expect.arrayContaining(['flex-col', 'sm:flex-row', 'sm:items-end']),
    );
    expect(wrapper.get('[data-testid="member-edit-form-actions"]').classes()).toEqual(
      expect.arrayContaining(['grid', 'w-full', 'sm:flex', 'sm:w-auto']),
    );
    expect(wrapper.get('label[for="edit-member-name"]').text()).toBe('Name');
    expect(wrapper.get('label[for="edit-member-email"]').text()).toBe('Email');
    expect(wrapper.get('label[for="edit-member-role"]').text()).toBe('Role');
    expect(wrapper.get('#edit-member-name').attributes('readonly')).toBeDefined();
    expect(wrapper.get('#edit-member-email').attributes('readonly')).toBeDefined();
    expect(wrapper.get('#edit-member-name').attributes('aria-describedby')).toBe(
      'member-readonly-fields-note',
    );
    expect(wrapper.get('#edit-member-email').attributes('aria-describedby')).toBe(
      'member-readonly-fields-note',
    );
    expect(wrapper.get('#member-readonly-fields-note').text()).toBe(
      'Editing name and email is not yet supported.',
    );
    expect(wrapper.text()).toContain('Cancel');
    expect(wrapper.text()).toContain('Save');
  });

  it('stacks PM assignment choices and actions on mobile while keeping desktop wrapping', () => {
    const wrapper = mount(MemberAssignPmPanel, {
      props: { member, projects },
      global: { plugins: [createPinia()], stubs },
    });

    const projectList = wrapper.get('[data-testid="member-assign-project-list"]');
    const activeProjectLabels = projectList.findAll('label');

    expect(projectList.classes()).toEqual(
      expect.arrayContaining(['grid', 'grid-cols-1', 'sm:flex', 'sm:flex-wrap']),
    );
    expect(activeProjectLabels).toHaveLength(2);
    expect(activeProjectLabels[0].classes()).toEqual(
      expect.arrayContaining(['min-h-11', 'w-full', 'sm:w-auto']),
    );
    expect(wrapper.text()).toContain('Project Orion');
    expect(wrapper.text()).toContain('Project Atlas');
    expect(wrapper.text()).not.toContain('Archived Project');
    expect(wrapper.get('[data-testid="member-assign-actions"]').classes()).toEqual(
      expect.arrayContaining(['grid', 'grid-cols-1', 'sm:flex', 'sm:justify-end']),
    );
  });
});
