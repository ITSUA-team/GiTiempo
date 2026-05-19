// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const confirmationMock = vi.hoisted(() => ({
  requireConfirmation: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  errorToast: vi.fn(),
  successToast: vi.fn(),
}));

vi.mock('@/composables/useConfirmation', () => ({
  useConfirmation: () => confirmationMock,
}));

vi.mock('@/composables/useToasts', () => ({
  useToasts: () => toastMock,
}));

vi.mock('@/services/admin-members-client', () => ({
  adminMembersClient: {
    removeMember: vi.fn(),
  },
}));

import MembersTable from './MembersTable.vue';

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

describe('MembersTable', () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  it('renders icon-only assign, edit, and remove row actions with accessible labels', () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(MembersTable, {
      props: {
        currentUserId: 'current-user',
        loading: false,
        members: [
          {
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
          },
        ],
        projects: [
          {
            color: null,
            createdAt: '2026-05-01T10:00:00.000Z',
            description: null,
            id: 'project-1',
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
          MemberAssignPmPanel: { template: '<div />' },
          MemberEditForm: { template: '<div />' },
        },
      },
    });

    const assignButton = wrapper.get('[data-testid="member-assign-pm-member-1"]');
    const editButton = wrapper.get('[data-testid="member-edit-member-1"]');
    const removeButton = wrapper.get('[data-testid="member-remove-member-1"]');

    expect(assignButton.attributes('aria-label')).toBe('Assign PM');
    expect(assignButton.attributes('data-tooltip')).toBe('Assign PM');
    expect(assignButton.text()).toBe('');
    expect(editButton.attributes('aria-label')).toBe('Edit');
    expect(editButton.text()).toBe('');
    expect(removeButton.attributes('aria-label')).toBe('Remove');
    expect(removeButton.text()).toBe('');
    expect(wrapper.findAll('[data-testid="member-mobile-card"]')).toHaveLength(0);
  });

  it('renders mobile cards and a loading shell only on mobile viewports', () => {
    mockMatchMedia(true);

    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(MembersTable, {
      props: {
        currentUserId: 'current-user',
        loading: true,
        members: [
          {
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
          },
        ],
        projects: [],
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
          MemberAssignPmPanel: { template: '<div />' },
          MemberEditForm: { template: '<div />' },
        },
      },
    });

    expect(wrapper.findAll('[data-testid="members-mobile-loading-card"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="member-mobile-card"]')).toHaveLength(0);
    expect(wrapper.findAll('[data-testid="member-edit-member-1"]')).toHaveLength(0);
  });

  it('preserves assign, edit, and remove flows behind the icon-only actions', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(MembersTable, {
      props: {
        currentUserId: 'current-user',
        loading: false,
        members: [
          {
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
          },
        ],
        projects: [
          {
            color: null,
            createdAt: '2026-05-01T10:00:00.000Z',
            description: null,
            id: 'project-1',
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
          MemberAssignPmPanel: { template: '<div data-testid="assign-panel" />' },
          MemberEditForm: { template: '<div data-testid="edit-panel" />' },
        },
      },
    });

    await wrapper.get('[data-testid="member-assign-pm-member-1"]').trigger('click');
    expect(wrapper.find('[data-testid="assign-panel"]').exists()).toBe(true);

    await wrapper.get('[data-testid="member-edit-member-1"]').trigger('click');
    expect(wrapper.find('[data-testid="edit-panel"]').exists()).toBe(true);

    await wrapper.get('[data-testid="member-remove-member-1"]').trigger('click');
    await flushPromises();

    expect(confirmationMock.requireConfirmation).toHaveBeenCalledTimes(1);
  });
});
