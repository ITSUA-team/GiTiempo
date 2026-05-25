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

vi.mock('@/composables/feedback/useToasts', () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
  }),
}));

import ProjectsView from './ProjectsView.vue';

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
});
