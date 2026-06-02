import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import { useAuthStore } from '@/stores/auth';

const testMocks = vi.hoisted(() => ({
  assignMember: vi.fn(),
  cancelInvite: vi.fn(),
  errorToast: vi.fn(),
  requireConfirmation: vi.fn(),
  removeMember: vi.fn(),
  removeAssignment: vi.fn(),
  resendInvite: vi.fn(),
  successToast: vi.fn(),
  listInvites: vi.fn(),
  listMembers: vi.fn(),
  listProjects: vi.fn(),
  updateMemberRole: vi.fn(),
}));

vi.mock('@/services/admin-members-client', () => ({
  adminMembersClient: {
    cancelInvite: testMocks.cancelInvite,
    listInvites: testMocks.listInvites,
    listMembers: testMocks.listMembers,
    removeMember: testMocks.removeMember,
    resendInvite: testMocks.resendInvite,
    updateMemberRole: testMocks.updateMemberRole,
  },
}));

vi.mock('@/services/admin-projects-client', () => ({
  adminProjectsClient: {
    assignMember: testMocks.assignMember,
    listProjects: testMocks.listProjects,
    removeAssignment: testMocks.removeAssignment,
  },
}));

vi.mock('@/composables/feedback/useToasts', () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
    successToast: testMocks.successToast,
  }),
}));

vi.mock('@/composables/feedback/useConfirmation', () => ({
  useConfirmation: () => ({
    requireConfirmation: testMocks.requireConfirmation,
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

function createMember() {
  return {
    avatarUrl: null,
    displayName: 'Pat PM',
    email: 'pat@example.com',
    id: 'member-remove',
    joinedAt: '2026-05-01T10:00:00.000Z',
    lastActiveAt: null,
    projectsAssignedCount: 1,
    role: 'pm',
    userId: 'user-2',
    workspaceId: '33333333-3333-4333-8333-333333333333',
  };
}

const MembersTableStub = {
  name: 'MembersTable',
  emits: [
    'assign-member',
    'edit-member',
    'remove-member',
    'update:expandedRows',
    'update:filters',
  ],
  props: {
    emptyDescription: { type: String, required: true },
    expandedRows: { type: Object, required: true },
    filters: { type: Object, required: true },
    isMobileViewport: { type: Boolean, required: true },
    lastActiveFilterOptions: { type: Array, required: true },
    loading: { type: Boolean, required: true },
    projectFilterOptions: { type: Array, required: true },
    roleFilterOptions: { type: Array, required: true },
    rows: { type: Array, required: true },
  },
  template:
    `<div data-testid="members-table">
      {{ rows.length }} rows | {{ projectFilterOptions.length }} project filters | loading={{ loading }} | search={{ filters.global }} | empty={{ emptyDescription }}
      <button
        v-if="rows[0]"
        data-testid="member-assign-intent"
        @click="$emit('assign-member', rows[0].member)"
      />
      <button
        v-if="rows[0]"
        data-testid="member-edit-intent"
        @click="$emit('edit-member', rows[0].member)"
      />
      <button
        v-if="rows[0]"
        data-testid="member-remove-intent"
        @click="$emit('remove-member', rows[0].member)"
      />
      <slot v-if="rows[0]" name="row-expansion" :row="rows[0]" />
    </div>`,
};

const MemberAssignPmPanelStub = {
  name: 'MemberAssignPmPanel',
  props: {
    member: { type: Object, required: true },
    projects: { type: Array, required: true },
    saving: { type: Boolean, default: false },
  },
  template: `
    <div data-testid="member-assign-panel">
      Assign {{ member.email }} across {{ projects.length }} projects | saving={{ saving }}
      <button data-testid="member-assign-save" @click="$emit('save', { projectIds: [] })" />
      <button data-testid="member-assign-cancel" @click="$emit('cancelled')" />
    </div>
  `,
};

const MemberEditFormStub = {
  name: 'MemberEditForm',
  props: {
    member: { type: Object, required: true },
    saving: { type: Boolean, default: false },
  },
  template: `
    <div data-testid="member-edit-panel">
      Edit {{ member.email }} | saving={{ saving }}
      <button data-testid="member-edit-save" @click="$emit('save', 'member')" />
      <button data-testid="member-edit-cancel" @click="$emit('cancelled')" />
    </div>
  `,
};

const MemberInviteDialogStub = {
  name: 'MemberInviteDialog',
  props: {
    visible: { type: Boolean, default: false },
  },
  template: '<div data-testid="member-invite-dialog" />',
};

const PendingInvitationsCardStub = {
  name: 'PendingInvitationsCard',
  props: {
    cancelingInviteId: { type: String, default: null },
    errorMessage: { type: String, default: null },
    loading: { type: Boolean, required: true },
    pendingInvites: { type: Array, required: true },
    resendingInviteId: { type: String, default: null },
  },
  template: `
    <div data-testid="pending-invitations-card">
      {{ pendingInvites.length }} invites | loading={{ loading }} | error={{ errorMessage ?? 'none' }}
      <button
        v-if="pendingInvites[0]"
        data-testid="pending-invite-resend"
        @click="$emit('resend', pendingInvites[0])"
      />
      <button
        v-if="pendingInvites[0]"
        data-testid="pending-invite-cancel"
        @click="$emit('cancel', pendingInvites[0])"
      />
      <button
        data-testid="pending-invite-retry"
        @click="$emit('retry')"
      />
    </div>
  `,
};

const SkeletonStub = {
  name: 'Skeleton',
  template: '<div data-testid="skeleton" />',
};

const membersViewStubs = {
  MemberAssignPmPanel: MemberAssignPmPanelStub,
  MemberEditForm: MemberEditFormStub,
  MemberInviteDialog: MemberInviteDialogStub,
  MembersTable: MembersTableStub,
  PendingInvitationsCard: PendingInvitationsCardStub,
  Skeleton: SkeletonStub,
};

function mountMembersView() {
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

  return mount(MembersView, {
    global: {
      plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
      stubs: membersViewStubs,
    },
  });
}

describe('MembersView', () => {
  beforeEach(() => {
    testMocks.assignMember.mockReset();
    testMocks.cancelInvite.mockReset();
    testMocks.listMembers.mockReset();
    testMocks.listInvites.mockReset();
    testMocks.listProjects.mockReset();
    testMocks.errorToast.mockReset();
    testMocks.removeMember.mockReset();
    testMocks.removeAssignment.mockReset();
    testMocks.requireConfirmation.mockReset();
    testMocks.resendInvite.mockReset();
    testMocks.successToast.mockReset();
    testMocks.updateMemberRole.mockReset();

    testMocks.assignMember.mockResolvedValue(undefined);
    testMocks.removeAssignment.mockResolvedValue(undefined);
    testMocks.updateMemberRole.mockResolvedValue(undefined);
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
        stubs: membersViewStubs,
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
      '2 rows | 1 project filters | loading=false | search= | empty=No members match the current filters.',
    );
    expect(wrapper.get('[data-testid="pending-invitations-card"]').text()).toContain(
      '1 invites | loading=false | error=none',
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
        stubs: membersViewStubs,
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
        stubs: membersViewStubs,
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

  it('confirms member removal, shows success feedback, and refreshes members', async () => {
    const member = createMember();

    testMocks.listMembers
      .mockResolvedValueOnce([member])
      .mockResolvedValueOnce([]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.removeMember.mockResolvedValue(undefined);

    const wrapper = mountMembersView();

    await flushPromises();
    await wrapper.get('[data-testid="member-remove-intent"]').trigger('click');

    expect(testMocks.requireConfirmation).toHaveBeenCalledWith(
      'Pat PM will be removed from this workspace. This action cannot be undone.',
      'Remove member?',
      'Remove',
      expect.any(Function),
    );

    const accept = testMocks.requireConfirmation.mock.calls[0]?.[3] as
      | (() => Promise<void>)
      | undefined;
    await accept?.();
    await flushPromises();

    expect(testMocks.removeMember).toHaveBeenCalledWith('member-remove');
    expect(testMocks.listMembers).toHaveBeenCalledTimes(2);
    expect(testMocks.successToast).toHaveBeenCalledWith('Pat PM has been removed.');
  });

  it('does not remove a member before the confirmation accept callback runs', async () => {
    testMocks.listMembers.mockResolvedValue([createMember()]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);

    const wrapper = mountMembersView();

    await flushPromises();
    await wrapper.get('[data-testid="member-remove-intent"]').trigger('click');

    expect(testMocks.requireConfirmation).toHaveBeenCalledTimes(1);
    expect(testMocks.removeMember).not.toHaveBeenCalled();
  });

  it('keeps member data loaded when confirmed removal fails', async () => {
    testMocks.listMembers.mockResolvedValue([createMember()]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.removeMember.mockRejectedValueOnce(new Error('Last admin cannot be removed'));

    const wrapper = mountMembersView();

    await flushPromises();
    await wrapper.get('[data-testid="member-remove-intent"]').trigger('click');

    const accept = testMocks.requireConfirmation.mock.calls[0]?.[3] as
      | (() => Promise<void>)
      | undefined;
    await accept?.();
    await flushPromises();

    expect(testMocks.removeMember).toHaveBeenCalledWith('member-remove');
    expect(testMocks.listMembers).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="members-table"]').text()).toContain('1 rows');
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Last admin cannot be removed',
      expect.objectContaining({
        logContext: { action: 'remove-member', feature: 'members' },
      }),
    );
    expect(testMocks.successToast).not.toHaveBeenCalled();
  });

  it('opens assignment expansion from a table intent, saves, refreshes, and collapses', async () => {
    const member = createMember();
    const project = {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      description: null,
      id: 'project-1',
      isActive: true,
      members: [
        {
          avatarUrl: null,
          displayName: member.displayName,
          email: member.email,
          role: member.role,
          userId: member.userId,
        },
      ],
      name: 'Project Orion',
      source: 'manual',
      totalHours: 12,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'public',
      workspaceId: member.workspaceId,
    };

    testMocks.listMembers
      .mockResolvedValueOnce([member])
      .mockResolvedValueOnce([member]);
    testMocks.listProjects.mockResolvedValue([project]);
    testMocks.listInvites.mockResolvedValue([]);

    const wrapper = mountMembersView();

    await flushPromises();
    await wrapper.get('[data-testid="member-assign-intent"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="member-assign-panel"]').text()).toContain(
      'Assign pat@example.com across 1 projects',
    );

    await wrapper.get('[data-testid="member-assign-save"]').trigger('click');
    await flushPromises();

    expect(testMocks.removeAssignment).toHaveBeenCalledWith('project-1', 'user-2');
    expect(testMocks.listMembers).toHaveBeenCalledTimes(2);
    expect(testMocks.successToast).toHaveBeenCalledWith(
      'Project assignments for Pat PM saved.',
    );
    expect(wrapper.find('[data-testid="member-assign-panel"]').exists()).toBe(false);
  });

  it('opens edit expansion from a table intent, saves role, refreshes, and collapses', async () => {
    testMocks.listMembers
      .mockResolvedValueOnce([createMember()])
      .mockResolvedValueOnce([createMember()]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);

    const wrapper = mountMembersView();

    await flushPromises();
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();

    await wrapper.get('[data-testid="member-edit-save"]').trigger('click');
    await flushPromises();

    expect(testMocks.updateMemberRole).toHaveBeenCalledWith('member-remove', {
      role: 'member',
    });
    expect(testMocks.listMembers).toHaveBeenCalledTimes(2);
    expect(testMocks.successToast).toHaveBeenCalledWith(
      'Role for Pat PM changed to member.',
    );
    expect(wrapper.find('[data-testid="member-edit-panel"]').exists()).toBe(false);
  });

  it('opens edit expansion from a table intent and cancel collapses without refresh', async () => {
    testMocks.listMembers.mockResolvedValue([createMember()]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);

    const wrapper = mountMembersView();

    await flushPromises();
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="member-edit-panel"]').text()).toContain(
      'Edit pat@example.com',
    );

    await wrapper.get('[data-testid="member-edit-cancel"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(testMocks.listMembers).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="member-edit-panel"]').exists()).toBe(false);
  });

  it('keeps pending invite request failures scoped to the pending invitations card', async () => {
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
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockRejectedValueOnce(new Error('Invite service unavailable'));

    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.accessToken = 'access-token';

    const wrapper = mount(MembersView, {
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: membersViewStubs,
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Members');
    expect(wrapper.find('[data-testid="members-table"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="pending-invitations-card"]').text()).toContain(
      '0 invites | loading=false | error=Invite service unavailable',
    );
    expect(wrapper.text()).toContain('Pending Invites');
    expect(wrapper.text()).toContain('—');
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Invite service unavailable',
      expect.objectContaining({
        logContext: { action: 'load-pending-invites', feature: 'members' },
      }),
    );
  });

  it('resends a pending invite, shows success feedback, and refreshes pending invitations', async () => {
    testMocks.listMembers.mockResolvedValue([]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites
      .mockResolvedValueOnce([
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
      ])
      .mockResolvedValueOnce([
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
      ]);
    testMocks.resendInvite.mockResolvedValue({
      createdAt: '2026-05-01T10:00:00.000Z',
      email: 'invitee@example.com',
      expiresAt: '2026-05-08T10:00:00.000Z',
      id: '44444444-4444-4444-8444-444444444444',
      invitedBy: '55555555-5555-4555-8555-555555555555',
      role: 'member',
      status: 'pending',
      workspaceId: '33333333-3333-4333-8333-333333333333',
    });

    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.accessToken = 'access-token';

    const wrapper = mount(MembersView, {
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: membersViewStubs,
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="pending-invite-resend"]').trigger('click');
    await flushPromises();

    expect(testMocks.resendInvite).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
    );
    expect(testMocks.listInvites).toHaveBeenCalledTimes(2);
    expect(testMocks.successToast).toHaveBeenCalledWith(
      'Invitation resent to invitee@example.com.',
    );
  });

  it('keeps the pending invite visible when resend fails', async () => {
    testMocks.listMembers.mockResolvedValue([]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([
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
    ]);
    testMocks.resendInvite.mockRejectedValueOnce(new Error('Invite has expired'));

    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.accessToken = 'access-token';

    const wrapper = mount(MembersView, {
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: membersViewStubs,
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="pending-invite-resend"]').trigger('click');
    await flushPromises();

    expect(testMocks.listInvites).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="pending-invitations-card"]').text()).toContain(
      '1 invites | loading=false | error=none',
    );
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Invite has expired',
      expect.objectContaining({
        logContext: { action: 'resend-invite', feature: 'members' },
      }),
    );
  });

  it('confirms invite cancellation before refreshing pending invitations', async () => {
    testMocks.listMembers.mockResolvedValue([]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites
      .mockResolvedValueOnce([
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
      ])
      .mockResolvedValueOnce([]);
    testMocks.cancelInvite.mockResolvedValue(undefined);

    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.accessToken = 'access-token';

    const wrapper = mount(MembersView, {
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: membersViewStubs,
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="pending-invite-cancel"]').trigger('click');

    expect(testMocks.requireConfirmation).toHaveBeenCalledWith(
      'invitee@example.com will lose access to this invitation. This action cannot be undone.',
      'Cancel invite?',
      'Cancel invite',
      expect.any(Function),
    );

    const accept = testMocks.requireConfirmation.mock.calls[0]?.[3] as
      | (() => Promise<void>)
      | undefined;
    await accept?.();
    await flushPromises();

    expect(testMocks.cancelInvite).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
    );
    expect(testMocks.listInvites).toHaveBeenCalledTimes(2);
    expect(testMocks.successToast).toHaveBeenCalledWith(
      'Invitation canceled for invitee@example.com.',
    );
  });

  it('keeps the pending invite visible when confirmed cancellation fails', async () => {
    testMocks.listMembers.mockResolvedValue([]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([
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
    ]);
    testMocks.cancelInvite.mockRejectedValueOnce(
      new Error('Pending invite not found'),
    );

    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.accessToken = 'access-token';

    const wrapper = mount(MembersView, {
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: membersViewStubs,
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="pending-invite-cancel"]').trigger('click');

    const accept = testMocks.requireConfirmation.mock.calls[0]?.[3] as
      | (() => Promise<void>)
      | undefined;
    await accept?.();
    await flushPromises();

    expect(testMocks.cancelInvite).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
    );
    expect(testMocks.listInvites).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="pending-invitations-card"]').text()).toContain(
      '1 invites | loading=false | error=none',
    );
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Pending invite not found',
      expect.objectContaining({
        logContext: { action: 'cancel-invite', feature: 'members' },
      }),
    );
    expect(testMocks.successToast).not.toHaveBeenCalled();
  });
});
