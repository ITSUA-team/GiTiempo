import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type {
  ProjectListResponse,
  WorkspaceMemberResponse,
} from '@gitiempo/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MemberEditForm from './MemberEditForm.vue';

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
    totalSeconds: 43200,
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
    totalSeconds: 14400,
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
    totalSeconds: 0,
    updatedAt: '2026-05-01T10:00:00.000Z',
    visibility: 'public',
    workspaceId: 'workspace-1',
  },
];

const stubs = {
  Button: {
    props: ['disabled', 'label', 'loading', 'type'],
    template: '<button v-bind="$attrs" :disabled="disabled" :type="type">{{ label }}</button>',
  },
  Checkbox: {
    props: ['inputId', 'name', 'value'],
    template: '<input :id="inputId" type="checkbox" :name="name" :value="value" />',
  },
  EditFormPanel: {
    props: ['title'],
    template: '<section><h2>{{ title }}</h2><slot /></section>',
  },
  Form: {
    emits: ['submit'],
    props: ['initialValues', 'resolver'],
    template:
      '<form @submit.prevent="$emit(\'submit\', { valid: true, values: initialValues })"><slot /></form>',
  },
};

describe('member inline forms', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders member settings as project checkboxes with the design action row', async () => {
    const wrapper = mount(MemberEditForm, {
      props: { canRemove: true, member, projects },
      global: { plugins: [createPinia()], stubs },
    });

    expect(wrapper.text()).toContain('Member settings');
    expect(wrapper.get('[data-testid="member-edit-form-layout"]').classes()).toEqual(
      expect.arrayContaining(['flex', 'flex-col', 'gap-3']),
    );
    expect(wrapper.get('[data-testid="member-edit-project-list"]').classes()).toEqual(
      expect.arrayContaining(['grid', 'grid-cols-1', 'sm:flex', 'sm:flex-wrap']),
    );
    expect(wrapper.get('[data-testid="member-edit-form-actions"]').classes()).toEqual(
      expect.arrayContaining(['grid', 'grid-cols-1', 'sm:flex', 'sm:justify-end']),
    );
    expect(wrapper.findAll('[name="projectIds"]')).toHaveLength(2);
    expect(wrapper.text()).toContain('Project Orion');
    expect(wrapper.text()).toContain('Project Atlas');
    expect(wrapper.text()).not.toContain('Archived Project');
    expect(wrapper.text()).not.toContain('Name');
    expect(wrapper.text()).not.toContain('Email');
    expect(wrapper.text()).not.toContain('Role');
    expect(wrapper.text()).toContain('Remove member');
    expect(wrapper.text()).toContain('Cancel');
    expect(wrapper.text()).toContain('Save changes');

    const removeButton = wrapper.findAll('button').find((button) =>
      button.text() === 'Remove member',
    );

    expect(removeButton?.classes()).toEqual(
      expect.arrayContaining([
        'bg-surface-primary',
        'border-destructive',
        'rounded-[6px]',
        'text-[13px]',
        'text-destructive',
        'font-semibold',
      ]),
    );

    await wrapper.get('button').trigger('click');

    expect(wrapper.emitted('remove')).toHaveLength(1);
  });

  it('submits selected project assignments from the single settings panel', async () => {
    const wrapper = mount(MemberEditForm, {
      props: { member, projects },
      global: { plugins: [createPinia()], stubs },
    });

    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('save')).toEqual([[{ projectIds: ['project-1'] }]]);
  });

  it('disables member settings actions while the assignment save is pending', () => {
    const wrapper = mount(MemberEditForm, {
      props: { canRemove: true, member, projects, saving: true },
      global: { plugins: [createPinia()], stubs },
    });

    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
  });
});
