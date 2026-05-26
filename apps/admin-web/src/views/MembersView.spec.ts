import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import { useAuthStore } from '@/stores/auth';

const testMocks = vi.hoisted(() => ({
  errorToast: vi.fn(),
  listInvites: vi.fn(),
  listMembers: vi.fn(),
  listProjects: vi.fn(),
}));

vi.mock('@/services/admin-members-client', () => ({
  adminMembersClient: {
    listInvites: testMocks.listInvites,
    listMembers: testMocks.listMembers,
  },
}));

vi.mock('@/services/admin-projects-client', () => ({
  adminProjectsClient: {
    listProjects: testMocks.listProjects,
  },
}));

vi.mock('@/composables/useToasts', () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
  }),
}));

import MembersView from './MembersView.vue';

function createDeferred<T>() {
  // eslint-disable-next-line no-unused-vars
  const deferred = {} as { promise: Promise<T>; resolve: (..._args: [T]) => void };

  deferred.promise = new Promise<T>((res) => {
    deferred.resolve = res;
  });

  return deferred;
}

const MembersTableStub = {
  name: 'MembersTable',
  props: {
    currentUserId: { type: String, default: null },
    loading: { type: Boolean, required: true },
    members: { type: Array, required: true },
    projects: { type: Array, required: true },
  },
  template:
    '<div data-testid="members-table">{{ members.length }} members | {{ projects.length }} projects | loading={{ loading }} | currentUser={{ currentUserId }}</div>',
};

const MemberInviteDialogStub = {
  name: 'MemberInviteDialog',
  props: {
    visible: { type: Boolean, default: false },
  },
  template: '<div data-testid="member-invite-dialog" />',
};

const SkeletonStub = {
  name: 'Skeleton',
  template: '<div data-testid="skeleton" />',
};

describe('MembersView', () => {
  beforeEach(() => {
    testMocks.listMembers.mockReset();
    testMocks.listInvites.mockReset();
    testMocks.listProjects.mockReset();
    testMocks.errorToast.mockReset();
  });

  it('shows the dedicated skeleton state before the first members load resolves, then renders loaded stats', async () => {
    const membersData = [
      {
        avatarUrl: null,
        displayName: 'Alex Admin',
        email: 'alex@example.com',
        id: '11111111-1111-4111-8111-111111111111',
        joinedAt: '2026-05-01T10:00:00.000Z',
        lastActiveAt: '2026-05-02T11:00:00.000Z',
        projectsAssignedCount: 2,
        role: 'admin',
        userId: 'user-1',
        workspaceId: '33333333-3333-4333-8333-333333333333',
      },
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
    ];
    const invitesData = [
      {
        createdAt: '2026-05-01T10:00:00.000Z',
        email: 'invitee@example.com',
        expiresAt: '2026-05-08T10:00:00.000Z',
        id: '44444444-4444-4444-8444-444444444444',
        invitedBy: '55555555-5555-4555-8555-555555555555',
        role: 'member',
        status: 'pending',
        workspaceId: '33333333-3333-4333-8333-333333333333',
      },
    ];
    const projectsData = [
      {
        color: null,
        createdAt: '2026-05-01T10:00:00.000Z',
        id: 'project-1',
        isActive: true,
        members: [],
        name: 'Project Orion',
        source: 'manual',
        totalHours: 12,
        updatedAt: '2026-05-01T10:00:00.000Z',
        visibility: 'public',
        workspaceId: '33333333-3333-4333-8333-333333333333',
      },
    ];

    const membersRequest = createDeferred<typeof membersData>();
    const invitesRequest = createDeferred<typeof invitesData>();
    const projectsRequest = createDeferred<typeof projectsData>();

    testMocks.listMembers.mockReturnValueOnce(membersRequest.promise);
    testMocks.listInvites.mockReturnValueOnce(invitesRequest.promise);
    testMocks.listProjects.mockReturnValueOnce(projectsRequest.promise);

    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.accessToken = 'access-token';
    authStore.profile = {
      avatarUrl: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      displayName: 'Alex Admin',
      email: 'alex@example.com',
      id: 'user-1',
      role: 'admin',
      updatedAt: '2026-05-01T10:00:00.000Z',
    };

    const wrapper = mount(MembersView, {
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          MemberInviteDialog: MemberInviteDialogStub,
          MembersTable: MembersTableStub,
          Skeleton: SkeletonStub,
        },
      },
    });

    expect(wrapper.findAll('[data-testid="skeleton"]').length).toBeGreaterThan(0);
    expect(wrapper.text()).not.toContain('Invite Member');

    membersRequest.resolve(membersData);
    invitesRequest.resolve(invitesData);

    await flushPromises();

    expect(wrapper.findAll('[data-testid="skeleton"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-testid="members-table"]').exists()).toBe(false);

    projectsRequest.resolve(projectsData);

    await flushPromises();

    expect(wrapper.findAll('[data-testid="skeleton"]')).toHaveLength(0);
    expect(wrapper.text()).toContain('Members');
    expect(wrapper.text()).toContain('Invite Member');
    expect(wrapper.text()).toContain('Active Members');
    expect(wrapper.text()).toContain('Pending Invites');
    expect(wrapper.text()).toContain('PMs Assigned');
    expect(wrapper.get('[data-testid="members-table"]').text()).toContain(
      '2 members | 1 projects | loading=false | currentUser=user-1',
    );
    expect(testMocks.errorToast).not.toHaveBeenCalled();
  });

  it('renders request errors with a retry action', async () => {
    testMocks.listMembers
      .mockRejectedValueOnce(new Error('No scope'))
      .mockResolvedValueOnce([]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.listProjects.mockResolvedValue([]);

    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.accessToken = 'access-token';

    const wrapper = mount(MembersView, {
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          MemberInviteDialog: MemberInviteDialogStub,
          MembersTable: MembersTableStub,
          Skeleton: SkeletonStub,
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Failed to load members');
    expect(wrapper.text()).toContain('No scope');

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(testMocks.listMembers).toHaveBeenCalledTimes(2);
  });

  it('treats project membership data as required before rendering member project filters', async () => {
    testMocks.listMembers.mockResolvedValue([
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
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.listProjects.mockRejectedValueOnce(new Error('Projects unavailable'));

    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.accessToken = 'access-token';

    const wrapper = mount(MembersView, {
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          MemberInviteDialog: MemberInviteDialogStub,
          MembersTable: MembersTableStub,
          Skeleton: SkeletonStub,
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Failed to load members');
    expect(wrapper.text()).toContain('Projects unavailable');
    expect(wrapper.find('[data-testid="members-table"]').exists()).toBe(false);
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Projects unavailable',
      expect.objectContaining({
        logContext: { action: 'load-members', feature: 'members' },
      }),
    );
  });
});
