import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
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
  defaultBillableForTasks: true,
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
  AutoComplete: {
    name: 'AutoComplete',
    props: {
      completeOnFocus: Boolean,
      dropdown: Boolean,
      dropdownMode: String,
      fluid: Boolean,
      forceSelection: Boolean,
      inputId: String,
      invalid: Boolean,
      minLength: Number,
      multiple: Boolean,
      name: String,
      optionLabel: Function,
      placeholder: String,
      pt: Object,
      suggestions: Array,
    },
    template: `<div>
      <input :id="inputId" :name="name" :placeholder="placeholder" />
      <span v-for="suggestion in suggestions" :key="suggestion">
        {{ optionLabel ? optionLabel(suggestion) : suggestion }}
      </span>
    </div>`,
  },
  Button: {
    props: ['disabled', 'label', 'loading', 'type', 'unstyled'],
    template:
      '<button v-bind="$attrs" :disabled="disabled" :type="type"><slot>{{ label }}</slot></button>',
  },
  EditFormPanel: {
    props: ['title'],
    template: '<section><h2>{{ title }}</h2><slot /></section>',
  },
  Form: {
    template:
      '<form><slot :defaultBillableForTasks="{ invalid: false }" :memberIds="{ invalid: false }" :visibility="{ invalid: false }" /></form>',
  },
  Checkbox: {
    props: ['inputId', 'name'],
    template: '<input :id="inputId" :name="name" type="checkbox" />',
  },
  Select: {
    name: 'Select',
    props: {
      fluid: Boolean,
      inputId: String,
      invalid: Boolean,
      name: String,
      optionLabel: String,
      optionValue: String,
      options: Array,
      pt: Object,
    },
    template:
      '<select :id="inputId" :name="name"><option v-for="option in options" :key="option.value">{{ option.label }}</option></select>',
  },
};

describe('ProjectEditForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('keeps project settings controls at the same edit-form height', async () => {
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
    expect(wrapper.text()).toContain('New task billable default');
    const billableInput = wrapper.find('input[name="defaultBillableForTasks"]');
    const billableControl = wrapper.get('label[for="edit-default-billable-for-tasks"]');

    expect(billableInput.exists()).toBe(true);
    expect(billableControl.classes()).toContain('h-[42px]');
    expect(wrapper.text()).toContain('Billable by default');
    const memberInput = wrapper.getComponent({ name: 'AutoComplete' });
    const visibilityInput = wrapper.getComponent({ name: 'Select' });

    expect(memberInput.props('multiple')).toBe(true);
    expect(memberInput.props('dropdown')).toBe(true);
    expect(memberInput.props('dropdownMode')).toBe('blank');
    expect(memberInput.props('forceSelection')).toBe(true);
    expect(memberInput.props('completeOnFocus')).toBe(true);
    expect(memberInput.props('minLength')).toBe(0);
    expect(memberInput.props('suggestions')).toEqual(['user-2', 'user-3']);

    memberInput.vm.$emit('complete', { query: 'pat' });
    await nextTick();

    expect(memberInput.props('suggestions')).toEqual(['user-2']);

    memberInput.vm.$emit('complete', { query: '' });
    await nextTick();

    expect(memberInput.props('suggestions')).toEqual(['user-2', 'user-3']);
    expect(memberInput.props('placeholder')).toBe('Search members...');
    const memberInputPt = memberInput.props('pt');

    expect(memberInputPt?.inputMultiple?.class).toEqual(
      expect.stringContaining('min-h-[38px]'),
    );
    expect(memberInputPt?.root?.class).toEqual(
      expect.stringContaining('border-divider'),
    );
    expect(memberInputPt).toMatchObject({
      pcChip: {
        root: {
          class: expect.stringContaining('bg-accent-tint'),
        },
      },
    });
    expect(visibilityInput.props('pt')).toMatchObject({
      root: { class: expect.stringContaining('h-[38px]') },
    });
    expect(visibilityInput.props('optionLabel')).toBe('label');
    expect(visibilityInput.props('optionValue')).toBe('value');
    expect(visibilityInput.props('options')).toEqual([
      { label: 'Public', value: 'public' },
      { label: 'Private', value: 'private' },
    ]);
    expect(wrapper.text()).toContain('Pat PM');
    expect(wrapper.text()).toContain('member@example.com');
    expect(wrapper.text()).not.toContain('Alex Admin');
    expect(wrapper.text()).toContain('Archive project');
    expect(wrapper.text()).toContain('Cancel');
    expect(wrapper.text()).toContain('Save');

    const archiveButton = wrapper.findAll('button').find((button) =>
      button.text() === 'Archive project',
    );
    const cancelButton = wrapper.findAll('button').find((button) =>
      button.text() === 'Cancel',
    );
    const saveButton = wrapper.findAll('button').find((button) =>
      button.text() === 'Save',
    );

    expect(archiveButton?.attributes('severity')).toBe('danger');
    expect(archiveButton?.attributes('variant')).toBe('outlined');
    expect(cancelButton?.attributes('severity')).toBe('secondary');
    expect(cancelButton?.attributes('variant')).toBe('outlined');
    // The save action stays the default primary button (no severity override).
    expect(saveButton?.attributes('severity')).toBeUndefined();
    expect(saveButton?.attributes('type')).toBe('submit');
  });

  it('emits the status-specific action from the inline project settings panel', async () => {
    const wrapper = mount(ProjectEditForm, {
      props: { allMembers: members, project },
      global: { plugins: [createPinia()], stubs },
    });

    await wrapper.get('button').trigger('click');

    expect(wrapper.emitted('archive')).toHaveLength(1);
  });

  it('uses unarchive copy for archived projects', async () => {
    const wrapper = mount(ProjectEditForm, {
      props: { allMembers: members, project: { ...project, isActive: false } },
      global: { plugins: [createPinia()], stubs },
    });

    await wrapper.get('button').trigger('click');

    expect(wrapper.text()).toContain('Unarchive project');
    expect(wrapper.emitted('unarchive')).toHaveLength(1);
  });

  it('disables project status actions while the inline save is pending', () => {
    const activeWrapper = mount(ProjectEditForm, {
      props: { allMembers: members, project, saving: true },
      global: { plugins: [createPinia()], stubs },
    });
    const archivedWrapper = mount(ProjectEditForm, {
      props: { allMembers: members, project: { ...project, isActive: false }, saving: true },
      global: { plugins: [createPinia()], stubs },
    });

    expect(activeWrapper.get('button').text()).toBe('Archive project');
    expect(activeWrapper.get('button').attributes('disabled')).toBeDefined();
    expect(archivedWrapper.get('button').text()).toBe('Unarchive project');
    expect(archivedWrapper.get('button').attributes('disabled')).toBeDefined();
  });
});
