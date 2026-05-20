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

function createMembers(): WorkspaceMemberListResponse {
  const now = new Date();
  const older = new Date(now);
  older.setDate(older.getDate() - 10);

  return [
    {
      avatarUrl: null,
      displayName: 'Pat PM',
      email: 'pat@example.com',
      id: 'member-1',
      joinedAt: '2026-05-01T10:00:00.000Z',
      lastActiveAt: now.toISOString(),
      projectsAssignedCount: 1,
      role: 'pm',
      userId: 'user-2',
      workspaceId: 'workspace-1',
    },
    {
      avatarUrl: null,
      displayName: 'Alex Admin',
      email: 'alex@example.com',
      id: 'member-2',
      joinedAt: '2026-05-01T10:00:00.000Z',
      lastActiveAt: null,
      projectsAssignedCount: 1,
      role: 'admin',
      userId: 'user-1',
      workspaceId: 'workspace-1',
    },
    {
      avatarUrl: null,
      displayName: 'Nina Keller',
      email: 'nina@example.com',
      id: 'member-3',
      joinedAt: '2026-05-01T10:00:00.000Z',
      lastActiveAt: older.toISOString(),
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
        {
          avatarUrl: null,
          displayName: 'Alex Admin',
          email: 'alex@example.com',
          role: 'admin',
          userId: 'user-1',
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
      totalHours: 8,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'private',
      workspaceId: 'workspace-1',
    },
  ];
}

function mountMembersTable(options: {
  currentUserId?: string | null;
  loading?: boolean;
  members?: WorkspaceMemberListResponse;
  projects?: ProjectListResponse;
} = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  return mount(MembersTable, {
    props: {
      currentUserId: options.currentUserId ?? 'current-user',
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
        MemberAssignPmPanel: { template: '<div data-testid="assign-panel" />' },
        MemberEditForm: { template: '<div data-testid="edit-panel" />' },
      },
    },
  });
}

function expectVisibleMembers(wrapper: ReturnType<typeof mountMembersTable>, names: string[]) {
  const allNames = createMembers().map((member) => member.displayName ?? member.email);

  for (const name of names) {
    expect(wrapper.text()).toContain(name);
  }

  for (const name of allNames.filter((memberName) => !names.includes(memberName))) {
    expect(wrapper.text()).not.toContain(name);
  }
}

describe('MembersTable', () => {
  beforeEach(() => {
    confirmationMock.requireConfirmation.mockReset();
    toastMock.errorToast.mockReset();
    toastMock.successToast.mockReset();
    mockMatchMedia();
  });

  it('renders icon-only assign, edit, and remove row actions with accessible labels', () => {
    const wrapper = mountMembersTable({ members: [createMembers()[0]!], projects: [createProjects()[0]!] });

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

  it('filters members by global search, column filters, project, role, and activity', async () => {
    const wrapper = mountMembersTable();

    expect(wrapper.get('input[aria-label="Search members"]').attributes('placeholder')).toBe(
      'Search members',
    );
    expect(
      wrapper.get('input[aria-label="Filter members by name or email"]').attributes('placeholder'),
    ).toBe('Filter name or email');
    expect(wrapper.text()).toContain('All roles');
    expect(wrapper.text()).toContain('All projects');
    expect(wrapper.text()).toContain('Any activity');
    expectVisibleMembers(wrapper, ['Pat PM', 'Alex Admin', 'Nina Keller']);

    await wrapper.get('input[aria-label="Search members"]').setValue('orion');
    expectVisibleMembers(wrapper, ['Pat PM', 'Alex Admin']);

    await wrapper.get('input[aria-label="Search members"]').setValue('');
    await wrapper.get('input[aria-label="Filter members by name or email"]').setValue('nina');
    expectVisibleMembers(wrapper, ['Nina Keller']);

    await wrapper.get('input[aria-label="Filter members by name or email"]').setValue('');
    const memberSelectFilters = wrapper.findAllComponents(Select);
    const roleFilter = memberSelectFilters[0];
    expect(roleFilter).toBeDefined();
    await roleFilter!.vm.$emit('update:modelValue', 'admin');
    await wrapper.vm.$nextTick();
    expectVisibleMembers(wrapper, ['Alex Admin']);

    await roleFilter!.vm.$emit('update:modelValue', null);
    await wrapper.vm.$nextTick();
    const projectFilter = wrapper.findAllComponents(MultiSelect)[0];
    expect(projectFilter).toBeDefined();
    await projectFilter!.vm.$emit('update:modelValue', ['project-2']);
    await wrapper.vm.$nextTick();
    expectVisibleMembers(wrapper, ['Nina Keller']);

    await projectFilter!.vm.$emit('update:modelValue', []);
    await wrapper.vm.$nextTick();
    const activityFilter = memberSelectFilters[1];
    expect(activityFilter).toBeDefined();
    await activityFilter!.vm.$emit('update:modelValue', 'inactive');
    await wrapper.vm.$nextTick();
    expectVisibleMembers(wrapper, ['Alex Admin']);

    await activityFilter!.vm.$emit('update:modelValue', 'any');
    await wrapper.vm.$nextTick();
    expectVisibleMembers(wrapper, ['Pat PM', 'Alex Admin', 'Nina Keller']);
  });

  it('renders mobile cards and a loading shell only on mobile viewports', () => {
    mockMatchMedia(true);

    const wrapper = mountMembersTable({
      loading: true,
      members: [createMembers()[0]!],
      projects: [],
    });

    expect(wrapper.findAll('[data-testid="members-mobile-loading-card"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="member-mobile-card"]')).toHaveLength(0);
    expect(wrapper.findAll('[data-testid="member-edit-member-1"]')).toHaveLength(0);
  });

  it('preserves assign, edit, and remove flows behind the icon-only actions', async () => {
    const wrapper = mountMembersTable({ members: [createMembers()[0]!], projects: [createProjects()[0]!] });

    await wrapper.get('[data-testid="member-assign-pm-member-1"]').trigger('click');
    expect(wrapper.find('[data-testid="assign-panel"]').exists()).toBe(true);

    await wrapper.get('[data-testid="member-edit-member-1"]').trigger('click');
    expect(wrapper.find('[data-testid="edit-panel"]').exists()).toBe(true);

    await wrapper.get('[data-testid="member-remove-member-1"]').trigger('click');
    await flushPromises();

    expect(confirmationMock.requireConfirmation).toHaveBeenCalledTimes(1);
  });

  it('hides an expanded member panel when filters exclude that row', async () => {
    const wrapper = mountMembersTable();

    await wrapper.get('[data-testid="member-assign-pm-member-1"]').trigger('click');
    expect(wrapper.find('[data-testid="assign-panel"]').exists()).toBe(true);

    await wrapper.get('input[aria-label="Search members"]').setValue('nina');

    expectVisibleMembers(wrapper, ['Nina Keller']);
    expect(wrapper.find('[data-testid="assign-panel"]').exists()).toBe(false);
  });
});
