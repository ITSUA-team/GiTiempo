import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import type * as VueRouter from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import { useAuthStore } from '@/stores/auth';

const testMocks = vi.hoisted(() => ({
  assignMember: vi.fn(),
  backfillProjectBillableDefault: vi.fn(),
  errorToast: vi.fn(),
  getManagementSummary: vi.fn(),
  listProjectTasks: vi.fn(),
  listProjectTimeEntries: vi.fn(),
  listMembers: vi.fn(),
  listProjects: vi.fn(),
  removeAssignment: vi.fn(),
  requireConfirmation: vi.fn(),
  routerPush: vi.fn(),
  successToast: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof VueRouter>();

  return {
    ...actual,
    useRouter: () => ({ push: testMocks.routerPush }),
  };
});

vi.mock('@/services/admin-members-client', () => ({
  adminMembersClient: {
    listMembers: testMocks.listMembers,
  },
}));

vi.mock('@/services/admin-projects-client', () => ({
  adminProjectsClient: {
    assignMember: testMocks.assignMember,
    backfillProjectBillableDefault: testMocks.backfillProjectBillableDefault,
    getManagementSummary: testMocks.getManagementSummary,
    listProjectTasks: testMocks.listProjectTasks,
    listProjectTimeEntries: testMocks.listProjectTimeEntries,
    listProjects: testMocks.listProjects,
    removeAssignment: testMocks.removeAssignment,
    updateProject: testMocks.updateProject,
  },
}));

vi.mock('@/composables/feedback/useConfirmation', () => ({
  useConfirmation: () => ({
    requireConfirmation: testMocks.requireConfirmation,
  }),
}));

vi.mock('@/composables/feedback/useToasts', () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
    successToast: testMocks.successToast,
  }),
}));

import ProjectsView from './ProjectsView.vue';

function createDeferred<T>() {
  // eslint-disable-next-line no-unused-vars
  const deferred = {} as { promise: Promise<T>; resolve: (..._args: [T]) => void };

  deferred.promise = new Promise<T>((res) => {
    deferred.resolve = res;
  });

  return deferred;
}

function createProject(
  options: {
    defaultBillableForTasks?: boolean;
    isActive?: boolean;
    name?: string;
  } = {},
) {
  const isActive = options.isActive ?? true;

  return {
    color: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    defaultBillableForTasks: options.defaultBillableForTasks ?? true,
    description: null,
    id: isActive ? 'project-active' : 'project-archived',
    isActive,
    members: [],
    name: options.name ?? (isActive ? 'Project Orion' : 'Legacy Project'),
    source: 'manual',
    totalSeconds: 0,
    updatedAt: '2026-05-01T10:00:00.000Z',
    visibility: 'public',
    workspaceId: '33333333-3333-4333-8333-333333333333',
  };
}

const ProjectsTableStub = {
  name: 'ProjectsTable',
  emits: [
    'edit-project',
    'new-project',
    'update:expandedRows',
    'update:filters',
  ],
  props: {
    emptyDescription: { type: String, required: true },
    expandedRows: { type: Object, required: true },
    filters: { type: Object, required: true },
    hoursFilterOptions: { type: Array, required: true },
    isMobileViewport: { type: Boolean, required: true },
    loading: { type: Boolean, required: true },
    memberFilterOptions: { type: Array, required: true },
    rows: { type: Array, required: true },
    sourceFilterOptions: { type: Array, required: true },
    visibilityFilterOptions: { type: Array, required: true },
  },
  template: `<div data-testid="projects-table">
    {{ rows.length }} rows | {{ memberFilterOptions.length }} member filters | loading={{ loading }} | search={{ filters.global }} | empty={{ emptyDescription }}
    <button
      v-if="rows[0]"
      data-testid="project-edit-intent"
      @click="$emit('edit-project', rows[0].project)"
    />
    <button
      data-testid="project-filter-intent"
      @click="$emit('update:filters', { global: 'orion' })"
    />
    <button
      data-testid="project-new-intent"
      @click="$emit('new-project')"
    />
    <slot v-if="rows[0]" name="row-expansion" :row="rows[0]" />
  </div>`,
};

const ProjectEditFormStub = {
  name: 'ProjectEditForm',
  props: {
    allMembers: { type: Array, required: true },
    project: { type: Object, required: true },
    saving: { type: Boolean, default: false },
  },
  template: `
    <div data-testid="project-edit-form">
      Edit {{ project.name }} with {{ allMembers.length }} members | saving={{ saving }}
      <button
        data-testid="project-edit-save"
        @click="$emit('save', { defaultBillableForTasks: project.defaultBillableForTasks, visibility: 'private', memberIds: ['user-3'] })"
      />
      <button
        data-testid="project-edit-save-default-change"
        @click="$emit('save', { defaultBillableForTasks: !project.defaultBillableForTasks, visibility: project.visibility, memberIds: [] })"
      />
      <button
        v-if="project.isActive"
        data-testid="project-edit-archive"
        @click="$emit('archive')"
      />
      <button
        v-else
        data-testid="project-edit-unarchive"
        @click="$emit('unarchive')"
      />
      <button data-testid="project-edit-cancel" @click="$emit('cancelled')" />
    </div>
  `,
};

const BillableDefaultBackfillDialogStub = {
  name: 'BillableDefaultBackfillDialog',
  emits: [
    'close',
    'submit',
    'update:updateTasks',
    'update:updateTimeEntries',
  ],
  props: {
    entityName: { type: String, required: true },
    hasTasks: { type: Boolean, required: true },
    hasTimeEntries: { type: Boolean, required: true },
    isOpen: { type: Boolean, required: true },
    isSubmitting: { type: Boolean, default: false },
    updateTasks: { type: Boolean, default: false },
    updateTimeEntries: { type: Boolean, required: true },
    variant: { type: String, required: true },
  },
  template: `
    <div data-testid="project-backfill-dialog">
      {{ entityName }} | tasks={{ hasTasks }} | entries={{ hasTimeEntries }} | updateTasks={{ updateTasks }} | updateEntries={{ updateTimeEntries }} | submitting={{ isSubmitting }} | {{ variant }}
      <button data-testid="project-backfill-submit" @click="$emit('submit')" />
      <button data-testid="project-backfill-close" @click="$emit('close')" />
      <button data-testid="project-backfill-disable-tasks" @click="$emit('update:updateTasks', false)" />
    </div>
  `,
};

const SkeletonStub = {
  name: 'Skeleton',
  template: '<div data-testid="skeleton" />',
};

function mountProjectsView() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const authStore = useAuthStore(pinia);
  authStore.accessToken = 'access-token';

  return mount(ProjectsView, {
    global: {
      plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
      stubs: {
        BillableDefaultBackfillDialog: BillableDefaultBackfillDialogStub,
        ProjectEditForm: ProjectEditFormStub,
        ProjectsTable: ProjectsTableStub,
        Skeleton: SkeletonStub,
      },
    },
  });
}

describe('ProjectsView', () => {
  beforeEach(() => {
    testMocks.assignMember.mockReset();
    testMocks.backfillProjectBillableDefault.mockReset();
    testMocks.errorToast.mockReset();
    testMocks.getManagementSummary.mockReset();
    testMocks.listProjectTasks.mockReset();
    testMocks.listProjectTimeEntries.mockReset();
    testMocks.listMembers.mockReset();
    testMocks.listProjects.mockReset();
    testMocks.removeAssignment.mockReset();
    testMocks.requireConfirmation.mockReset();
    testMocks.routerPush.mockReset();
    testMocks.successToast.mockReset();
    testMocks.updateProject.mockReset();

    testMocks.getManagementSummary.mockResolvedValue({
      activeProjects: 0,
      privateProjects: 0,
      publicProjects: 0,
    });
    testMocks.listMembers.mockResolvedValue([]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listProjectTasks.mockResolvedValue([]);
    testMocks.listProjectTimeEntries.mockResolvedValue({
      items: [],
      meta: { limit: 1, page: 1, total: 0, totalPages: 0 },
    });
    testMocks.assignMember.mockResolvedValue(undefined);
    testMocks.backfillProjectBillableDefault.mockResolvedValue({
      tasksUpdated: 0,
      timeEntriesUpdated: 0,
    });
    testMocks.removeAssignment.mockResolvedValue(undefined);
    testMocks.updateProject.mockImplementation(
      (projectId: string, input: Partial<ReturnType<typeof createProject>> = {}) =>
        Promise.resolve({
          ...createProject({ isActive: projectId !== 'project-archived' }),
          id: projectId,
          ...input,
        }),
    );
  });

  it('renders request errors with a retry action', async () => {
    testMocks.listProjects
      .mockRejectedValueOnce(new Error('No scope'))
      .mockResolvedValueOnce([]);

    const wrapper = mountProjectsView();

    await flushPromises();

    expect(wrapper.text()).toContain('Failed to load projects');
    expect(wrapper.text()).toContain('No scope');

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(testMocks.listProjects).toHaveBeenCalledTimes(2);
  });

  it('keeps the initial skeleton until workspace member data resolves', async () => {
    const projectsRequest = createDeferred<unknown[]>();
    const membersRequest = createDeferred<unknown[]>();

    testMocks.listProjects.mockReturnValueOnce(projectsRequest.promise);
    testMocks.listMembers.mockReturnValueOnce(membersRequest.promise);

    const wrapper = mountProjectsView();

    expect(wrapper.findAll('[data-testid="skeleton"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-testid="projects-table"]').exists()).toBe(false);

    projectsRequest.resolve([
      {
        color: null,
        createdAt: '2026-05-01T10:00:00.000Z',
        defaultBillableForTasks: true,
        description: null,
        id: 'project-1',
        isActive: true,
        members: [],
        name: 'Project Orion',
        source: 'manual',
        totalSeconds: 0,
        updatedAt: '2026-05-01T10:00:00.000Z',
        visibility: 'public',
        workspaceId: '33333333-3333-4333-8333-333333333333',
      },
    ]);

    await flushPromises();

    expect(wrapper.findAll('[data-testid="skeleton"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-testid="projects-table"]').exists()).toBe(false);

    membersRequest.resolve([
      {
        avatarUrl: null,
        displayName: 'Pat PM',
        email: 'pat@example.com',
        id: '22222222-2222-4222-8222-222222222222',
        joinedAt: '2026-05-01T10:00:00.000Z',
        lastActiveAt: null,
        projectsAssignedCount: 1,
        role: 'pm',
        userId: 'user-2',
        workspaceId: '33333333-3333-4333-8333-333333333333',
      },
    ]);

    await flushPromises();

    expect(wrapper.findAll('[data-testid="skeleton"]')).toHaveLength(0);
    expect(wrapper.get('[data-testid="projects-table"]').text()).toContain(
      '1 rows | 1 member filters | loading=false | search= | empty=No projects match the current filters.',
    );
  });

  it('applies filter updates emitted by the projects table', async () => {
    testMocks.listProjects.mockResolvedValue([
      createProject(),
      createProject({ isActive: false }),
    ]);

    const wrapper = mountProjectsView();

    await flushPromises();
    await wrapper.get('[data-testid="project-filter-intent"]').trigger('click');

    expect(wrapper.get('[data-testid="projects-table"]').text()).toContain(
      '1 rows | 0 member filters | loading=false | search=orion',
    );
  });

  it('navigates to the add-project page from the table header action', async () => {
    const wrapper = mountProjectsView();

    await flushPromises();
    await wrapper.get('[data-testid="project-new-intent"]').trigger('click');

    expect(testMocks.routerPush).toHaveBeenCalledWith({ name: 'admin-add-project' });
  });

  it('confirms project archive, shows success feedback, and refreshes projects', async () => {
    const project = createProject();

    testMocks.listProjects
      .mockResolvedValueOnce([project])
      .mockResolvedValueOnce([]);

    const wrapper = mountProjectsView();

    await flushPromises();
    await wrapper.get('[data-testid="project-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="project-edit-archive"]').trigger('click');

    expect(testMocks.requireConfirmation).toHaveBeenCalledWith(
      '"Project Orion" will be archived and hidden from non-admin users.',
      'Archive project?',
      'Archive',
      expect.any(Function),
    );

    const accept = testMocks.requireConfirmation.mock.calls[0]?.[3] as
      | (() => Promise<void>)
      | undefined;
    await accept?.();
    await flushPromises();

    expect(testMocks.updateProject).toHaveBeenCalledWith('project-active', {
      isActive: false,
    });
    expect(testMocks.listProjects).toHaveBeenCalledTimes(2);
    expect(testMocks.getManagementSummary).toHaveBeenCalledTimes(2);
    expect(testMocks.successToast).toHaveBeenCalledWith('Project Orion has been archived.');
  });

  it('does not archive a project before the confirmation accept callback runs', async () => {
    testMocks.listProjects.mockResolvedValue([createProject()]);

    const wrapper = mountProjectsView();

    await flushPromises();
    await wrapper.get('[data-testid="project-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="project-edit-archive"]').trigger('click');

    expect(testMocks.requireConfirmation).toHaveBeenCalledTimes(1);
    expect(testMocks.updateProject).not.toHaveBeenCalled();
  });

  it('keeps project rows loaded when confirmed archive fails', async () => {
    testMocks.listProjects.mockResolvedValue([createProject()]);
    testMocks.updateProject.mockRejectedValueOnce(new Error('Project cannot be archived'));

    const wrapper = mountProjectsView();

    await flushPromises();
    await wrapper.get('[data-testid="project-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="project-edit-archive"]').trigger('click');

    const accept = testMocks.requireConfirmation.mock.calls[0]?.[3] as
      | (() => Promise<void>)
      | undefined;
    await accept?.();
    await flushPromises();

    expect(testMocks.updateProject).toHaveBeenCalledWith('project-active', {
      isActive: false,
    });
    expect(testMocks.listProjects).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="projects-table"]').text()).toContain('1 rows');
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Project cannot be archived',
      expect.objectContaining({
        logContext: { action: 'archive-project', feature: 'projects' },
      }),
    );
    expect(testMocks.successToast).not.toHaveBeenCalled();
  });

  it('unarchives a project, shows success feedback, and refreshes projects', async () => {
    const project = createProject({ isActive: false });

    testMocks.listProjects
      .mockResolvedValueOnce([project])
      .mockResolvedValueOnce([]);

    const wrapper = mountProjectsView();

    await flushPromises();
    await wrapper.get('[data-testid="project-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="project-edit-unarchive"]').trigger('click');
    await flushPromises();

    expect(testMocks.updateProject).toHaveBeenCalledWith('project-archived', {
      isActive: true,
    });
    expect(testMocks.listProjects).toHaveBeenCalledTimes(2);
    expect(testMocks.getManagementSummary).toHaveBeenCalledTimes(2);
    expect(testMocks.successToast).toHaveBeenCalledWith('Legacy Project is now active.');
  });

  it('opens project edit expansion, saves settings, refreshes, and collapses', async () => {
    const project = {
      ...createProject(),
      members: [
        {
          avatarUrl: null,
          displayName: 'Pat PM',
          email: 'pat@example.com',
          role: 'pm' as const,
          userId: 'user-2',
        },
      ],
    };

    testMocks.listProjects
      .mockResolvedValueOnce([project])
      .mockResolvedValueOnce([]);
    const initialMembers = [
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
        workspaceId: '33333333-3333-4333-8333-333333333333',
      },
      {
        avatarUrl: null,
        displayName: 'Nina Keller',
        email: 'nina@example.com',
        id: 'member-3',
        joinedAt: '2026-05-01T10:00:00.000Z',
        lastActiveAt: null,
        projectsAssignedCount: 0,
        role: 'member',
        userId: 'user-3',
        workspaceId: '33333333-3333-4333-8333-333333333333',
      },
    ];

    testMocks.listMembers
      .mockResolvedValueOnce(initialMembers)
      .mockResolvedValueOnce([
        ...initialMembers,
        {
          avatarUrl: null,
          displayName: 'Zoe Analyst',
          email: 'zoe@example.com',
          id: 'member-4',
          joinedAt: '2026-05-01T10:00:00.000Z',
          lastActiveAt: null,
          projectsAssignedCount: 0,
          role: 'member',
          userId: 'user-4',
          workspaceId: '33333333-3333-4333-8333-333333333333',
        },
      ]);

    const wrapper = mountProjectsView();

    await flushPromises();
    await wrapper.get('[data-testid="project-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="project-edit-form"]').text()).toContain(
      'Edit Project Orion with 2 members',
    );

    await wrapper.get('[data-testid="project-edit-save"]').trigger('click');
    await flushPromises();

    expect(testMocks.updateProject).toHaveBeenCalledWith('project-active', {
      defaultBillableForTasks: true,
      visibility: 'private',
    });
    expect(testMocks.assignMember).toHaveBeenCalledWith('project-active', 'user-3');
    expect(testMocks.removeAssignment).toHaveBeenCalledWith('project-active', 'user-2');
    expect(testMocks.listProjects).toHaveBeenCalledTimes(2);
    expect(testMocks.listMembers).toHaveBeenCalledTimes(2);
    expect(testMocks.getManagementSummary).toHaveBeenCalledTimes(2);
    expect(testMocks.successToast).toHaveBeenCalledWith('Project Orion has been updated.');
    expect(wrapper.get('[data-testid="projects-table"]').text()).toContain(
      '3 member filters',
    );
    expect(wrapper.find('[data-testid="project-edit-form"]').exists()).toBe(false);
    expect(testMocks.listProjectTasks).not.toHaveBeenCalled();
    expect(testMocks.backfillProjectBillableDefault).not.toHaveBeenCalled();
  });

  it('opens a billable-default backfill dialog when changed defaults have historical downstream records', async () => {
    const project = createProject({ defaultBillableForTasks: true });

    testMocks.listProjects
      .mockResolvedValueOnce([project])
      .mockResolvedValueOnce([project])
      .mockResolvedValueOnce([project]);
    testMocks.listProjectTasks.mockResolvedValue([
      {
        createdAt: '2026-05-01T10:00:00.000Z',
        defaultBillableForTimeEntries: false,
        githubIssue: null,
        id: 'task-1',
        isActive: false,
        projectId: project.id,
        status: 'open',
        title: 'Improve reports filters',
        updatedAt: '2026-05-01T10:00:00.000Z',
        workspaceId: project.workspaceId,
      },
    ]);
    testMocks.listProjectTimeEntries.mockResolvedValue({
      items: [],
      meta: { limit: 1, page: 1, total: 2, totalPages: 2 },
    });
    testMocks.backfillProjectBillableDefault.mockResolvedValue({
      tasksUpdated: 0,
      timeEntriesUpdated: 2,
    });

    const wrapper = mountProjectsView();

    await flushPromises();
    await wrapper.get('[data-testid="project-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="project-edit-save-default-change"]').trigger('click');
    await flushPromises();

    expect(testMocks.updateProject).toHaveBeenCalledWith('project-active', {
      defaultBillableForTasks: false,
      visibility: 'public',
    });
    expect(testMocks.listProjectTasks).toHaveBeenCalledWith('project-active', {
      includeInactive: true,
    });
    expect(testMocks.listProjectTimeEntries).toHaveBeenCalledWith(
      'project-active',
      { limit: 1 },
    );
    expect(wrapper.get('[data-testid="project-backfill-dialog"]').text()).toContain(
      'Project Orion | tasks=true | entries=true | updateTasks=true | updateEntries=true',
    );

    await wrapper.get('[data-testid="project-backfill-disable-tasks"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="project-backfill-submit"]').trigger('click');
    await flushPromises();

    expect(testMocks.backfillProjectBillableDefault).toHaveBeenCalledWith(
      'project-active',
      { updateTasks: false, updateTimeEntries: true },
    );
    expect(testMocks.successToast).toHaveBeenCalledWith(
      '2 existing records have been updated.',
    );
    expect(wrapper.find('[data-testid="project-backfill-dialog"]').exists()).toBe(false);
  });

  it('opens the billable-default backfill dialog from saved project state when assignment updates fail', async () => {
    const project = {
      ...createProject({ defaultBillableForTasks: true }),
      members: [
        {
          avatarUrl: null,
          displayName: 'Pat PM',
          email: 'pat@example.com',
          role: 'pm' as const,
          userId: 'user-2',
        },
      ],
    };

    testMocks.listProjects.mockResolvedValue([project]);
    testMocks.removeAssignment.mockRejectedValueOnce(new Error('Assignment update failed'));
    testMocks.listProjectTasks.mockResolvedValue([
      {
        createdAt: '2026-05-01T10:00:00.000Z',
        defaultBillableForTimeEntries: false,
        githubIssue: null,
        id: 'task-1',
        isActive: true,
        projectId: project.id,
        status: 'open',
        title: 'Improve reports filters',
        updatedAt: '2026-05-01T10:00:00.000Z',
        workspaceId: project.workspaceId,
      },
    ]);

    const wrapper = mountProjectsView();

    await flushPromises();
    await wrapper.get('[data-testid="project-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="project-edit-save-default-change"]').trigger('click');
    await flushPromises();

    expect(testMocks.updateProject).toHaveBeenCalledWith('project-active', {
      defaultBillableForTasks: false,
      visibility: 'public',
    });
    expect(testMocks.removeAssignment).toHaveBeenCalledWith('project-active', 'user-2');
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Assignment update failed',
      expect.objectContaining({
        logContext: { action: 'update-project', feature: 'projects' },
      }),
    );
    expect(testMocks.listProjectTasks).toHaveBeenCalledWith('project-active', {
      includeInactive: true,
    });
    expect(wrapper.get('[data-testid="project-backfill-dialog"]').text()).toContain(
      'Project Orion | tasks=true | entries=false | updateTasks=true | updateEntries=false',
    );
    expect(testMocks.successToast).not.toHaveBeenCalled();
  });

  it('skips the billable-default backfill dialog when a changed default has no downstream records', async () => {
    const project = createProject({ defaultBillableForTasks: true });

    testMocks.listProjects
      .mockResolvedValueOnce([project])
      .mockResolvedValueOnce([project]);

    const wrapper = mountProjectsView();

    await flushPromises();
    await wrapper.get('[data-testid="project-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="project-edit-save-default-change"]').trigger('click');
    await flushPromises();

    expect(testMocks.updateProject).toHaveBeenCalledWith('project-active', {
      defaultBillableForTasks: false,
      visibility: 'public',
    });
    expect(testMocks.listProjectTasks).toHaveBeenCalledWith('project-active', {
      includeInactive: true,
    });
    expect(wrapper.find('[data-testid="project-backfill-dialog"]').exists()).toBe(false);
    expect(testMocks.backfillProjectBillableDefault).not.toHaveBeenCalled();
  });

  it('dismisses the billable-default backfill dialog without updating existing records', async () => {
    const project = createProject({ defaultBillableForTasks: true });

    testMocks.listProjects
      .mockResolvedValueOnce([project])
      .mockResolvedValueOnce([project]);
    testMocks.listProjectTasks.mockResolvedValue([
      {
        createdAt: '2026-05-01T10:00:00.000Z',
        defaultBillableForTimeEntries: false,
        githubIssue: null,
        id: 'task-1',
        isActive: true,
        projectId: project.id,
        status: 'open',
        title: 'Improve reports filters',
        updatedAt: '2026-05-01T10:00:00.000Z',
        workspaceId: project.workspaceId,
      },
    ]);

    const wrapper = mountProjectsView();

    await flushPromises();
    await wrapper.get('[data-testid="project-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="project-edit-save-default-change"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="project-backfill-dialog"]').exists()).toBe(true);

    await wrapper.get('[data-testid="project-backfill-close"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="project-backfill-dialog"]').exists()).toBe(false);
    expect(testMocks.backfillProjectBillableDefault).not.toHaveBeenCalled();
  });

  it('collapses project edit expansion on cancel without saving', async () => {
    testMocks.listProjects.mockResolvedValue([createProject()]);

    const wrapper = mountProjectsView();

    await flushPromises();
    await wrapper.get('[data-testid="project-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="project-edit-cancel"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(testMocks.updateProject).not.toHaveBeenCalled();
    expect(testMocks.listProjects).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="project-edit-form"]').exists()).toBe(false);
  });

  it('keeps project rows loaded when unarchive fails', async () => {
    testMocks.listProjects.mockResolvedValue([createProject({ isActive: false })]);
    testMocks.updateProject.mockRejectedValueOnce(new Error('Project cannot be restored'));

    const wrapper = mountProjectsView();

    await flushPromises();
    await wrapper.get('[data-testid="project-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="project-edit-unarchive"]').trigger('click');
    await flushPromises();

    expect(testMocks.updateProject).toHaveBeenCalledWith('project-archived', {
      isActive: true,
    });
    expect(testMocks.listProjects).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="projects-table"]').text()).toContain('1 rows');
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Project cannot be restored',
      expect.objectContaining({
        logContext: { action: 'unarchive-project', feature: 'projects' },
      }),
    );
    expect(testMocks.successToast).not.toHaveBeenCalled();
  });

  it('treats workspace member data as required before rendering assigned-member filters', async () => {
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listMembers.mockRejectedValueOnce(new Error('Members unavailable'));

    const wrapper = mountProjectsView();

    await flushPromises();

    expect(wrapper.text()).toContain('Failed to load projects');
    expect(wrapper.text()).toContain('Members unavailable');
    expect(wrapper.find('[data-testid="projects-table"]').exists()).toBe(false);
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Members unavailable',
      expect.objectContaining({
        logContext: { action: 'load-projects', feature: 'projects' },
      }),
    );
  });
});
