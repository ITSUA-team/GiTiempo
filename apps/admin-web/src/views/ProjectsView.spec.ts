import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import type * as VueRouter from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import { useAuthStore } from '@/stores/auth';

const testMocks = vi.hoisted(() => ({
  errorToast: vi.fn(),
  getManagementSummary: vi.fn(),
  listMembers: vi.fn(),
  listProjects: vi.fn(),
  routerPush: vi.fn(),
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
    getManagementSummary: testMocks.getManagementSummary,
    listProjects: testMocks.listProjects,
  },
}));

vi.mock('@/composables/useToasts', () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
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

const ProjectsTableStub = {
  name: 'ProjectsTable',
  props: {
    loading: { type: Boolean, required: true },
    members: { type: Array, required: true },
    projects: { type: Array, required: true },
  },
  template:
    '<div data-testid="projects-table">{{ projects.length }} projects | {{ members.length }} members | loading={{ loading }}</div>',
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
        ProjectsTable: ProjectsTableStub,
        Skeleton: SkeletonStub,
      },
    },
  });
}

describe('ProjectsView', () => {
  beforeEach(() => {
    testMocks.errorToast.mockReset();
    testMocks.getManagementSummary.mockReset();
    testMocks.listMembers.mockReset();
    testMocks.listProjects.mockReset();
    testMocks.routerPush.mockReset();

    testMocks.getManagementSummary.mockResolvedValue({
      activeProjects: 0,
      privateProjects: 0,
      publicProjects: 0,
    });
    testMocks.listMembers.mockResolvedValue([]);
    testMocks.listProjects.mockResolvedValue([]);
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
        id: 'project-1',
        isActive: true,
        members: [],
        name: 'Project Orion',
        source: 'manual',
        totalHours: 0,
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
      '1 projects | 1 members | loading=false',
    );
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
