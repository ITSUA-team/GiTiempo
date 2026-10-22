import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import type {
  ProjectResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import type { ProjectEditFormInput } from '@gitiempo/web-shared';
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
  accessScope: 'project',
  capabilities: { canManageTasks: true },
  color: null,
  createdAt: '2026-05-01T10:00:00.000Z',
  defaultBillableForTasks: true,
  timeRoundingStepMinutes: null,
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
  referenceProvenance: null,
  trackingMode: 'managed',
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

let submitOptions: Record<string, unknown> = {};

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
    name: 'Form',
    props: ['initialValues'],
    computed: {
      values(): Record<string, unknown> {
        const self = this as unknown as {
          initialValues?: Record<string, unknown>;
        };

        return { ...(self.initialValues ?? {}), ...submitOptions };
      },
    },
    template:
      '<form><slot :defaultBillableForTasks="{ invalid: false }" :managerUserId="{ invalid: false }" :memberIds="{ invalid: false }" :timeRoundingStepMinutes="{ invalid: false }" :visibility="{ invalid: false }" />' +
      '<button type="button" data-testid="project-edit-form-submit" @click="$emit(\'submit\', { valid: true, values })" /></form>',
  },
  Checkbox: {
    props: ['inputId', 'name'],
    template: '<input :id="inputId" :name="name" type="checkbox" />',
  },
  Select: {
    name: 'Select',
    props: {
      disabled: Boolean,
      fluid: Boolean,
      inputId: String,
      invalid: Boolean,
      name: String,
      optionLabel: String,
      optionValue: String,
      options: Array,
      placeholder: String,
      pt: Object,
      showClear: Boolean,
    },
    template:
      '<select :id="inputId" :name="name" :data-show-clear="showClear" :data-placeholder="placeholder"><option v-if="placeholder" :value="null">{{ placeholder }}</option><option v-for="option in options" :key="option.value">{{ option.label }}</option></select>',
  },
};

describe('ProjectEditForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    submitOptions = {};
  });

  function mountProjectEditForm(
    options: {
      project?: Partial<ProjectResponse>;
      saving?: boolean;
      workspaceRoundingStepMinutes?: number;
    } = {},
  ) {
    return mount(ProjectEditForm, {
      props: {
        allMembers: members,
        project: { ...project, ...options.project },
        saving: options.saving,
        workspaceRoundingStepMinutes:
          options.workspaceRoundingStepMinutes ?? 5,
      },
      global: { plugins: [createPinia()], stubs },
    });
  }

  it('keeps project settings controls at the same edit-form height', async () => {
    const wrapper = mountProjectEditForm();

    // The members field gets the full panel width like Member settings; only
    // visibility and the billable default share a row.
    expect(wrapper.get('[data-testid="project-edit-form-layout"]').classes()).toEqual(
      expect.arrayContaining(['flex', 'flex-col', 'gap-3']),
    );
    expect(wrapper.get('[data-testid="project-edit-form-actions"]').classes()).toEqual(
      expect.arrayContaining(['grid', 'w-full', 'grid-cols-1', 'sm:flex', 'sm:justify-between']),
    );
    // Archive sits in its own destructive group, apart from Cancel/Save.
    expect(
      wrapper.get('[data-footer-actions="destructive"]').text(),
    ).toContain('Archive project');
    expect(wrapper.get('[data-footer-actions="primary"]').text()).toContain('Cancel');
    expect(wrapper.get('[data-footer-actions="primary"]').text()).toContain('Save');
    expect(wrapper.get('label[for="edit-members"]').text()).toBe('Select members');
    expect(wrapper.get('label[for="edit-project-manager"]').text()).toBe('Project manager');
    expect(wrapper.get('label[for="edit-visibility"]').text()).toBe('Visibility');
    expect(wrapper.get('label[for="edit-rounding-step"]').text()).toBe('Time rounding step');
    expect(wrapper.text()).toContain('New task billable default');
    const billableInput = wrapper.find('input[name="defaultBillableForTasks"]');
    const billableControl = wrapper.get('label[for="edit-default-billable-for-tasks"]');

    expect(billableInput.exists()).toBe(true);
    expect(billableControl.classes()).toContain('h-[42px]');
    expect(wrapper.text()).toContain('Billable by default');
    const memberInput = wrapper.getComponent({ name: 'AutoComplete' });
    const allSelects = wrapper.findAllComponents({ name: 'Select' });
    const managerInput = allSelects.find((c) => c.props('inputId') === 'edit-project-manager')!;
    const visibilityInput = allSelects.find((c) => c.props('inputId') === 'edit-visibility')!;

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
    expect(managerInput.props('showClear')).toBe(true);
    expect(managerInput.props('placeholder')).toBe('Unassigned');
    expect(managerInput.props('optionLabel')).toBe('label');
    expect(managerInput.props('optionValue')).toBe('value');
    expect(managerInput.props('options')).toEqual([
      { label: 'Pat PM', value: 'user-2' },
    ]);
    const roundingSelect = allSelects.find(
      (c) => c.props('inputId') === 'edit-rounding-step',
    )!;

    expect(roundingSelect.props('name')).toBe('timeRoundingStepMinutes');
    expect(roundingSelect.props('invalid')).toBe(false);
    expect(roundingSelect.props('optionLabel')).toBe('label');
    expect(roundingSelect.props('optionValue')).toBe('value');
    expect(roundingSelect.props('options')).toEqual([
      { label: 'Inherit from workspace (5 min)', value: null },
      { label: '1 min', value: 1 },
      { label: '5 min', value: 5 },
      { label: '10 min', value: 10 },
      { label: '15 min', value: 15 },
      { label: '30 min', value: 30 },
      { label: '60 min', value: 60 },
    ]);
    const roundingField = wrapper.get('label[for="edit-rounding-step"]').element;

    expect(
      (billableControl.element.compareDocumentPosition(roundingField) &
        Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    ).toBe(true);
    expect(
      (roundingField.compareDocumentPosition(
        wrapper.get('[data-testid="project-edit-form-actions"]').element,
      ) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    ).toBe(true);
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
    const wrapper = mountProjectEditForm();

    await wrapper.get('button').trigger('click');

    expect(wrapper.emitted('archive')).toHaveLength(1);
  });

  it('uses unarchive copy for archived projects', async () => {
    const wrapper = mountProjectEditForm({
      project: { ...project, isActive: false },
    });

    await wrapper.get('button').trigger('click');

    expect(wrapper.text()).toContain('Unarchive project');
    expect(wrapper.emitted('unarchive')).toHaveLength(1);
  });

  it('disables project status actions while the inline save is pending', () => {
    const activeWrapper = mountProjectEditForm({ saving: true });
    const archivedWrapper = mountProjectEditForm({
      project: { ...project, isActive: false },
      saving: true,
    });

    const savingRoundingSelect = activeWrapper
      .findAllComponents({ name: 'Select' })
      .find((c) => c.props('inputId') === 'edit-rounding-step')!;

    expect(savingRoundingSelect.props('disabled')).toBe(true);
    expect(activeWrapper.get('button').text()).toBe('Archive project');
    expect(activeWrapper.get('button').attributes('disabled')).toBeDefined();
    expect(archivedWrapper.get('button').text()).toBe('Unarchive project');
    expect(archivedWrapper.get('button').attributes('disabled')).toBeDefined();
  });

  it('initializes the rounding step to inherit when the project has no own step', () => {
    const wrapper = mountProjectEditForm();

    expect(wrapper.getComponent({ name: 'Form' }).props('initialValues')).toMatchObject({
      timeRoundingStepMinutes: null,
    });
  });

  it('initializes the rounding step from the project value', () => {
    const wrapper = mountProjectEditForm({ project: { timeRoundingStepMinutes: 15 } });

    expect(wrapper.getComponent({ name: 'Form' }).props('initialValues')).toMatchObject({
      timeRoundingStepMinutes: 15,
    });
  });

  it('saves the selected rounding step value', async () => {
    const wrapper = mountProjectEditForm();
    submitOptions = { timeRoundingStepMinutes: 10 };

    await wrapper.get('[data-testid="project-edit-form-submit"]').trigger('click');

    expect(wrapper.emitted('save')?.[0]).toEqual([
      {
        defaultBillableForTasks: true,
        timeRoundingStepMinutes: 10,
        managerUserId: 'user-2',
        visibility: 'public',
        memberIds: ['user-2'],
      },
    ]);
  });

  it('saves null when the rounding step is cleared back to inherit', async () => {
    const wrapper = mountProjectEditForm({ project: { timeRoundingStepMinutes: 15 } });
    submitOptions = { timeRoundingStepMinutes: null };

    await wrapper.get('[data-testid="project-edit-form-submit"]').trigger('click');

    expect(wrapper.emitted('save')?.[0]).toEqual([
      {
        defaultBillableForTasks: true,
        timeRoundingStepMinutes: null,
        managerUserId: 'user-2',
        visibility: 'public',
        memberIds: ['user-2'],
      },
    ]);
  });

  it('saves the initialized rounding step unchanged when it was not touched', async () => {
    const wrapper = mountProjectEditForm({ project: { timeRoundingStepMinutes: 30 } });

    await wrapper.get('[data-testid="project-edit-form-submit"]').trigger('click');

    const savePayload = wrapper.emitted('save')?.[0]?.[0] as
      | ProjectEditFormInput
      | undefined;

    expect(savePayload).toMatchObject({ timeRoundingStepMinutes: 30 });
  });
});
