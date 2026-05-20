// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { defineComponent } from 'vue';
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

vi.mock('@/composables/useConfirmation', () => ({
  useConfirmation: () => confirmationMock,
}));

vi.mock('@/composables/useToasts', () => ({
  useToasts: () => toastMock,
}));

vi.mock('@/services/admin-projects-client', () => ({
  adminProjectsClient: projectClientMock,
}));

import ProjectsTable from './ProjectsTable.vue';

const SelectStub = defineComponent({
  props: {
    placeholder: {
      default: undefined,
      type: String,
    },
  },
  template: '<div data-testid="select-stub">{{ placeholder }}</div>',
});

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

describe('ProjectsTable', () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  it('renders icon-only edit, archive, and unarchive row actions with accessible labels', () => {
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
          ProjectEditForm: { template: '<div />' },
          Select: SelectStub,
        },
      },
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

  it('renders the mobile loading shell without desktop actions on small viewports', () => {
    mockMatchMedia(true);

    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(ProjectsTable, {
      props: {
        loading: true,
        members: [],
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
          ProjectEditForm: { template: '<div />' },
          Select: SelectStub,
        },
      },
    });

    expect(wrapper.findAll('[data-testid="projects-mobile-loading-card"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="project-mobile-card"]')).toHaveLength(0);
    expect(wrapper.findAll('[data-testid="project-edit-project-active"]')).toHaveLength(0);
  });

  it('preserves edit, archive, and unarchive flows behind the icon-only actions', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    projectClientMock.updateProject.mockResolvedValue(undefined);

    const authStore = (await import('@/stores/auth')).useAuthStore(pinia);
    authStore.accessToken = 'admin-access-token';

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
});
