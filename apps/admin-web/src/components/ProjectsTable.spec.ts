// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import type { ProjectListResponse, WorkspaceMemberListResponse } from '@gitiempo/shared';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const confirmationMock = vi.hoisted(() => ({
  requireConfirmation: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  errorToast: vi.fn(),
  successToast: vi.fn(),
}));

const projectClientMock = vi.hoisted(() => ({
  updateProject: vi.fn(),
}));

vi.mock('@/composables/feedback/useConfirmation', () => ({
  useConfirmation: () => confirmationMock,
}));

vi.mock('@/composables/feedback/useToasts', () => ({
  useToasts: () => toastMock,
}));

vi.mock('@/services/admin-projects-client', () => ({
  adminProjectsClient: projectClientMock,
}));

import ProjectsTable from './ProjectsTable.vue';

const SelectStub = { template: '<div data-testid="select-stub" />' };

function mockMatchMedia(matches = false): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

function createMembers(): WorkspaceMemberListResponse {
  return [
    {
      avatarUrl: null,
      displayName: 'Alex Admin',
      email: 'alex@example.com',
      id: 'member-1',
      joinedAt: '2026-05-01T10:00:00.000Z',
      lastActiveAt: null,
      projectsAssignedCount: 1,
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
      displayName: 'Nina Keller',
      email: 'nina@example.com',
      id: 'member-3',
      joinedAt: '2026-05-01T10:00:00.000Z',
      lastActiveAt: null,
      projectsAssignedCount: 1,
      role: 'member',
      userId: 'user-3',
      workspaceId: 'workspace-1',
    },
  ];
}

function createProjects(): ProjectListResponse {
  return [
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      description: null,
      id: 'project-active',
      isActive: true,
      members: [
        {
          avatarUrl: null,
          displayName: 'Alex Admin',
          email: 'alex@example.com',
          role: 'admin',
          userId: 'user-1',
        },
        {
          avatarUrl: null,
          displayName: 'Pat PM',
          email: 'pat@example.com',
          role: 'pm',
          userId: 'user-2',
        },
      ],
      name: 'Project Orion',
      source: 'github',
      totalHours: 148,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'public',
      workspaceId: 'workspace-1',
    },
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      description: null,
      id: 'project-private',
      isActive: true,
      members: [
        {
          avatarUrl: null,
          displayName: 'Nina Keller',
          email: 'nina@example.com',
          role: 'member',
          userId: 'user-3',
        },
      ],
      name: 'Billing API',
      source: 'manual',
      totalHours: 86,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'private',
      workspaceId: 'workspace-1',
    },
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      description: null,
      id: 'project-empty',
      isActive: true,
      members: [],
      name: 'Dev Portal',
      source: 'manual',
      totalHours: 0,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'public',
      workspaceId: 'workspace-1',
    },
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      description: null,
      id: 'project-inactive',
      isActive: false,
      members: [],
      name: 'Legacy Project',
      source: 'manual',
      totalHours: 4,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'private',
      workspaceId: 'workspace-1',
    },
  ];
}

function mountProjectsTable(options: {
  loading?: boolean;
  members?: WorkspaceMemberListResponse;
  projects?: ProjectListResponse;
} = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  return mount(ProjectsTable, {
    props: {
      loading: options.loading ?? false,
      members: options.members ?? createMembers(),
      projects: options.projects ?? createProjects(),
    },
    global: {
      directives: {
        tooltip: {
          mounted(el, binding) {
            el.setAttribute('data-tooltip', String(binding.value));
          },
        },
      },
      plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
      stubs: {
        ProjectEditForm: { template: '<div data-testid="project-edit-form" />' },
      },
    },
  });
}

function expectVisibleProjects(wrapper: ReturnType<typeof mountProjectsTable>, names: string[]) {
  const allNames = createProjects().map((project) => project.name);

  for (const name of names) {
    expect(wrapper.text()).toContain(name);
  }

  for (const name of allNames.filter((projectName) => !names.includes(projectName))) {
    expect(wrapper.text()).not.toContain(name);
  }
}

describe('ProjectsTable', () => {
  beforeEach(() => {
    confirmationMock.requireConfirmation.mockReset();
    toastMock.errorToast.mockReset();
    toastMock.successToast.mockReset();
    projectClientMock.updateProject.mockReset();
    mockMatchMedia();
  });

  it('renders icon-only edit, archive, and unarchive row actions with accessible labels', () => {
    const wrapper = mountProjectsTable({
      members: [createMembers()[0]!],
      projects: [createProjects()[0]!, createProjects()[3]!],
    });

    const editButton = wrapper.get('[data-testid="project-edit-project-active"]');
    const archiveButton = wrapper.get('[data-testid="project-archive-project-active"]');
    const unarchiveButton = wrapper.get('[data-testid="project-unarchive-project-inactive"]');

    expect(editButton.attributes('aria-label')).toBe('Edit');
    expect(editButton.text()).toBe('');
    expect(archiveButton.attributes('aria-label')).toBe('Archive');
    expect(archiveButton.attributes('data-tooltip')).toBe('Archive');
    expect(archiveButton.text()).toBe('');
    expect(unarchiveButton.attributes('aria-label')).toBe('Unarchive');
    expect(unarchiveButton.text()).toBe('');
    expect(wrapper.findAll('[data-testid="project-mobile-card"]')).toHaveLength(0);
  });

  it('filters projects by global search, project, source, assigned member, hours, and visibility', async () => {
    const wrapper = mountProjectsTable();

    expect(wrapper.get('input[aria-label="Search projects"]').attributes('placeholder')).toBe(
      'Search projects',
    );
    expect(wrapper.get('input[aria-label="Filter projects by name"]').attributes('placeholder')).toBe(
      'Filter project',
    );
    expect(wrapper.text()).toContain('All sources');
    expect(wrapper.text()).toContain('All members');
    expect(wrapper.text()).toContain('Any');
    expect(wrapper.text()).toContain('All');
    expectVisibleProjects(wrapper, [
      'Project Orion',
      'Billing API',
      'Dev Portal',
      'Legacy Project',
    ]);

    await wrapper.get('input[aria-label="Search projects"]').setValue('archived');
    expectVisibleProjects(wrapper, ['Legacy Project']);

    await wrapper.get('input[aria-label="Search projects"]').setValue('');
    await wrapper.get('input[aria-label="Filter projects by name"]').setValue('billing');
    expectVisibleProjects(wrapper, ['Billing API']);

    await wrapper.get('input[aria-label="Filter projects by name"]').setValue('');
    const projectSelectFilters = wrapper.findAllComponents(Select);
    const sourceFilter = projectSelectFilters[0];
    expect(sourceFilter).toBeDefined();
    await sourceFilter!.vm.$emit('update:modelValue', 'manual');
    await wrapper.vm.$nextTick();
    expectVisibleProjects(wrapper, ['Billing API', 'Dev Portal', 'Legacy Project']);

    await sourceFilter!.vm.$emit('update:modelValue', null);
    await wrapper.vm.$nextTick();
    const memberFilter = wrapper.findAllComponents(MultiSelect)[0];
    expect(memberFilter).toBeDefined();
    await memberFilter!.vm.$emit('update:modelValue', ['user-3']);
    await wrapper.vm.$nextTick();
    expectVisibleProjects(wrapper, ['Billing API']);

    await memberFilter!.vm.$emit('update:modelValue', []);
    await wrapper.vm.$nextTick();
    const hoursFilter = projectSelectFilters[1];
    expect(hoursFilter).toBeDefined();
    await hoursFilter!.vm.$emit('update:modelValue', 'zero');
    await wrapper.vm.$nextTick();
    expectVisibleProjects(wrapper, ['Dev Portal']);

    await hoursFilter!.vm.$emit('update:modelValue', 'any');
    await wrapper.vm.$nextTick();
    const visibilityFilter = projectSelectFilters[2];
    expect(visibilityFilter).toBeDefined();
    await visibilityFilter!.vm.$emit('update:modelValue', 'private');
    await wrapper.vm.$nextTick();
    expectVisibleProjects(wrapper, ['Billing API', 'Legacy Project']);

    await visibilityFilter!.vm.$emit('update:modelValue', null);
    await wrapper.vm.$nextTick();
    expectVisibleProjects(wrapper, [
      'Project Orion',
      'Billing API',
      'Dev Portal',
      'Legacy Project',
    ]);
  });

  it('renders the mobile loading shell without desktop actions on small viewports', () => {
    mockMatchMedia(true);

    const wrapper = mountProjectsTable({
      loading: true,
      members: [],
      projects: [createProjects()[0]!],
    });

    expect(wrapper.findAll('[data-testid="projects-mobile-loading-card"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="project-mobile-card"]')).toHaveLength(0);
    expect(wrapper.findAll('[data-testid="project-edit-project-active"]')).toHaveLength(0);
  });

  it('renders non-loading mobile cards with shared fields and actions on small viewports', async () => {
    mockMatchMedia(true);

    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(ProjectsTable, {
      props: {
        loading: false,
        members: [
          {
            avatarUrl: null,
            displayName: 'Alex Admin',
            email: 'alex@example.com',
            id: 'member-1',
            joinedAt: '2026-05-01T10:00:00.000Z',
            lastActiveAt: null,
            projectsAssignedCount: 1,
            role: 'admin',
            userId: 'user-1',
            workspaceId: 'workspace-1',
          },
        ],
        projects: [
          {
            color: null,
            createdAt: '2026-05-01T10:00:00.000Z',
            description: null,
            id: 'project-active',
            isActive: true,
            members: [],
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
            id: 'project-inactive',
            isActive: false,
            members: [],
            name: 'Legacy Project',
            source: 'manual',
            totalHours: 4,
            updatedAt: '2026-05-01T10:00:00.000Z',
            visibility: 'private',
            workspaceId: 'workspace-1',
          },
        ],
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute('data-tooltip', String(binding.value));
            },
          },
        },
        plugins: [pinia, PrimeVue],
        stubs: {
          ProjectEditForm: { template: '<div data-testid="project-edit-form" />' },
          Select: SelectStub,
        },
      },
    });

    const mobileCards = wrapper.findAll('[data-testid="project-mobile-card"]');

    expect(mobileCards).toHaveLength(2);
    expect(mobileCards[0]?.text()).toContain('Project Orion');
    expect(mobileCards[0]?.text()).toContain('Manual');
    expect(mobileCards[0]?.text()).toContain('Public');
    expect(mobileCards[0]?.text()).toContain('12h');
    expect(mobileCards[1]?.text()).toContain('Legacy Project');
    expect(mobileCards[1]?.text()).toContain('Private');

    await wrapper.get('[data-testid="project-mobile-edit-project-active"]').trigger('click');

    expect(wrapper.find('[data-testid="project-edit-form"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="project-mobile-archive-project-active"]').attributes('aria-label')).toBe('Archive');
    expect(wrapper.get('[data-testid="project-mobile-unarchive-project-inactive"]').attributes('aria-label')).toBe('Unarchive');
  });

  it('preserves edit, archive, and unarchive flows behind the icon-only actions', async () => {
    projectClientMock.updateProject.mockResolvedValue(undefined);

    const wrapper = mountProjectsTable({
      members: [createMembers()[0]!],
      projects: [createProjects()[0]!, createProjects()[3]!],
    });
    const authStore = (await import('@/stores/auth')).useAuthStore();
    authStore.accessToken = 'admin-access-token';

    await wrapper.get('[data-testid="project-edit-project-active"]').trigger('click');
    expect(wrapper.find('[data-testid="project-edit-form"]').exists()).toBe(true);

    await wrapper.get('[data-testid="project-archive-project-active"]').trigger('click');
    expect(confirmationMock.requireConfirmation).toHaveBeenCalledTimes(1);

    await wrapper.get('[data-testid="project-unarchive-project-inactive"]').trigger('click');
    await flushPromises();

    expect(projectClientMock.updateProject).toHaveBeenCalledWith(
      'admin-access-token',
      'project-inactive',
      { isActive: true },
    );
  });

  it('hides an expanded project panel when filters exclude that row', async () => {
    const wrapper = mountProjectsTable();

    await wrapper.get('[data-testid="project-edit-project-active"]').trigger('click');
    expect(wrapper.find('[data-testid="project-edit-form"]').exists()).toBe(true);

    await wrapper.get('input[aria-label="Search projects"]').setValue('billing');

    expectVisibleProjects(wrapper, ['Billing API']);
    expect(wrapper.find('[data-testid="project-edit-form"]').exists()).toBe(false);
  });
});
