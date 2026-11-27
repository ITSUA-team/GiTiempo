import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Tooltip from 'primevue/tooltip';
import { routerKey } from 'vue-router';
import { ApiError } from '@gitiempo/web-shared/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import { useAuthStore } from '@/stores/auth';

const testMocks = vi.hoisted(() => ({
  replaceRoute: vi.fn(),
  assignMember: vi.fn(),
  cancelInvite: vi.fn(),
  errorToast: vi.fn(),
  requireConfirmation: vi.fn(),
  removeMember: vi.fn(),
  removeAssignment: vi.fn(),
  resendInvite: vi.fn(),
  successToast: vi.fn(),
  updateMemberRole: vi.fn(),
  updateMemberPermissions: vi.fn(),
  listInvites: vi.fn(),
  listMembers: vi.fn(),
  listProjects: vi.fn(),
}));

vi.mock('@/services/admin-members-client', () => ({
  adminMembersClient: {
    cancelInvite: testMocks.cancelInvite,
    listInvites: testMocks.listInvites,
    listMembers: testMocks.listMembers,
    removeMember: testMocks.removeMember,
    resendInvite: testMocks.resendInvite,
    updateMemberRole: testMocks.updateMemberRole,
    updateMemberPermissions: testMocks.updateMemberPermissions,
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
  const deferred = {} as { promise: Promise<T>; resolve: (..._args: [T]) => void };

  deferred.promise = new Promise<T>((res) => {
    deferred.resolve = res;
  });

  return deferred;
}

function createMember() {
  return {
    avatarUrl: null,
    canViewInvoices: false,
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
    'edit-member',
    'invite-member',
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
        data-testid="member-edit-intent"
        @click="$emit('edit-member', rows[0].member)"
      />
      <button
        data-testid="member-invite-intent"
        @click="$emit('invite-member')"
      />
      <button
        data-testid="member-filter-intent"
        @click="$emit('update:filters', { global: 'pat' })"
      />
      <slot v-if="rows[0]" name="row-expansion" :row="rows[0]" />
    </div>`,
};

const MemberEditFormStub = {
  name: 'MemberEditForm',
  props: {
    canAssignPm: { type: Boolean, default: false },
    canRemove: { type: Boolean, default: false },
    member: { type: Object, required: true },
    projects: { type: Array, required: true },
    saving: { type: Boolean, default: false },
  },
  template: `
    <div data-testid="member-edit-panel">
      Member settings for {{ member.email }} across {{ projects.length }} projects | assign={{ canAssignPm }} | saving={{ saving }}
      <button v-if="canRemove" data-testid="member-edit-remove" @click="$emit('remove')" />
      <button v-if="canAssignPm" data-testid="member-edit-save" @click="$emit('save', { projectIds: [] })" />
      <button
        v-if="member.role === 'pm'"
        data-testid="member-edit-invoice-permission-toggle"
        @click="$emit('update:canViewInvoices', true)"
      />
      <button data-testid="member-edit-cancel" @click="$emit('cancelled')" />
    </div>
  `,
};

const MemberInviteDialogStub = {
  name: 'MemberInviteDialog',
  props: {
    visible: { type: Boolean, default: false },
  },
  template: '<div data-testid="member-invite-dialog">visible={{ visible }}</div>',
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
  MemberEditForm: MemberEditFormStub,
  MemberInviteDialog: MemberInviteDialogStub,
  MembersTable: MembersTableStub,
  PendingInvitationsCard: PendingInvitationsCardStub,
  Skeleton: SkeletonStub,
};

function workspaceToken(workspaceId: string, expires = 1, userId = 'user-1'): string {
  return `header.${btoa(JSON.stringify({ sub: userId, role: 'admin', workspaceId, exp: expires }))}.signature`;
}

const adminProfile = {
  avatarUrl: null,
  canViewInvoices: true,
  createdAt: '2026-05-01T10:00:00.000Z',
  displayName: 'Alex Admin',
  email: 'alex@example.com',
  id: 'user-1',
  role: 'admin' as const,
  updatedAt: '2026-05-01T10:00:00.000Z',
};

function mountMembersView(token = workspaceToken('A'), realEditor = false) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const authStore = useAuthStore(pinia);
  authStore.accessToken = token;
  authStore.profile = { ...adminProfile };

  return mount(MembersView, {
    global: {
      directives: { tooltip: Tooltip },
      plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
      provide: { [routerKey as symbol]: { replace: testMocks.replaceRoute } },
      stubs: realEditor ? { ...membersViewStubs, MembersTable: false, MemberEditForm: false } : membersViewStubs,
    },
  });
}

describe('MembersView', () => {
  beforeEach(() => {
    testMocks.replaceRoute.mockReset();
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
    testMocks.updateMemberPermissions.mockReset();
    testMocks.updateMemberRole.mockReset();

    testMocks.assignMember.mockResolvedValue(undefined);
    testMocks.removeAssignment.mockResolvedValue(undefined);
  });

  it.each([false, true])('promotes another member and retains their admin role until a demotion succeeds (mobile=%s)', async (mobile) => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: mobile && query === '(max-width: 639px)', media: query,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
    }));
    const member = { ...createMember(), workspaceId: 'A' };
    const updated = { ...member, role: 'admin' };
    testMocks.listMembers.mockResolvedValue([member]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.updateMemberRole.mockResolvedValueOnce(updated).mockRejectedValueOnce(
      new ApiError('Workspace must have at least one admin', { status: 409 }),
    );
    const wrapper = mountMembersView(workspaceToken('A'), true);
    try {
      await flushPromises();
      const name = `[data-testid="member-${mobile ? 'mobile-' : ''}name-${member.id}"]`;
      async function editRole(role: string) {
        await wrapper.get(name).trigger('click');
        const form = wrapper.getComponent({ name: 'MemberEditForm' });
        form.getComponent({ name: 'Select' }).vm.$emit('update:modelValue', role);
        await flushPromises();
        expect(form.get('button[type="submit"]').text()).toBe('Save changes');
        await form.get('form').trigger('submit');
        await flushPromises();
      }
      await editRole('admin');
      expect(testMocks.updateMemberRole).toHaveBeenNthCalledWith(1, member.id, { role: 'admin' });
      expect(wrapper.findComponent({ name: 'MemberEditForm' }).exists()).toBe(false);
      expect(testMocks.listMembers).toHaveBeenCalledOnce();
      expect(testMocks.listProjects).toHaveBeenCalledOnce();
      expect(wrapper.text()).toMatch(/PMs Assigned\s*0/);
      await editRole('member');
      expect(wrapper.getComponent({ name: 'MemberEditForm' }).text()).toContain('Has access to all projects');
      expect(testMocks.errorToast).toHaveBeenCalledWith('Workspace must have at least one admin', expect.anything());
      const table = wrapper.getComponent({ name: 'MembersTable' });
      expect(table.props('rows')[0].member.role).toBe('admin');

      testMocks.updateMemberRole.mockResolvedValueOnce({ ...member, role: 'member' });
      await wrapper.getComponent({ name: 'MemberEditForm' }).get('form').trigger('submit');
      await flushPromises();
      expect(testMocks.updateMemberRole).toHaveBeenNthCalledWith(3, member.id, { role: 'member' });
      expect(table.props('rows')[0].member.role).toBe('member');
      expect(wrapper.findComponent({ name: 'MemberEditForm' }).exists()).toBe(false);
      expect(testMocks.listMembers).toHaveBeenCalledOnce();
      expect(testMocks.listProjects).toHaveBeenCalledOnce();
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
    }
  });

  it.each([false, true])('keeps the sole admin session and self-demotion draft after a 409 (mobile=%s)', async (mobile) => {
    vi.stubGlobal('matchMedia', (media: string) => ({
      matches: mobile && media === '(max-width: 639px)', media,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
    }));
    const token = workspaceToken('A');
    const self = { ...createMember(), userId: adminProfile.id, workspaceId: 'A', role: 'admin' };
    const message = 'Workspace must have at least one admin';
    testMocks.listMembers.mockResolvedValue([self]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.updateMemberRole.mockRejectedValueOnce(new ApiError(message, { status: 409 }));
    const wrapper = mountMembersView(token, true);
    try {
      const auth = useAuthStore();
      const reconcile = vi.spyOn(auth, 'reconcileOwnRoleChange');
      await flushPromises();
      await wrapper.get(`[data-testid="member-${mobile ? 'mobile-' : ''}name-${self.id}"]`).trigger('click');
      const editor = () => wrapper.getComponent({ name: 'MemberEditForm' });
      editor().getComponent({ name: 'Select' }).vm.$emit('update:modelValue', 'pm');
      await editor().get('form').trigger('submit');
      await flushPromises();

      expect(testMocks.updateMemberRole).toHaveBeenCalledWith(self.id, { role: 'pm' });
      expect(testMocks.errorToast).toHaveBeenCalledWith(message, expect.anything());
      expect(reconcile).not.toHaveBeenCalled();
      expect(testMocks.replaceRoute).not.toHaveBeenCalled();
      expect(auth.accessToken).toBe(token);
      expect(auth.profile).toEqual(adminProfile);
      expect(editor().getComponent({ name: 'Select' }).props('modelValue')).toBe('pm');
      expect(wrapper.getComponent({ name: 'MembersTable' }).props('rows')[0].member.role).toBe('admin');
      expect(testMocks.listMembers).toHaveBeenCalledOnce();
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
    }
  });

  it.each(['member', 'pm'])('reconciles a self-demotion to %s before any member list reload', async (role) => {
    const self = { ...createMember(), userId: 'user-1', workspaceId: 'A', role: 'admin' };
    testMocks.listMembers.mockResolvedValue([self]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.updateMemberRole.mockResolvedValue({ ...self, role });
    const wrapper = mountMembersView();
    const sync = vi.spyOn(useAuthStore(), 'reconcileOwnRoleChange').mockResolvedValue('restricted');
    await flushPromises();
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    wrapper.getComponent({ name: 'MemberEditForm' }).vm.$emit('save', { role });
    await flushPromises();
    expect(sync).toHaveBeenCalledWith({ userId: 'user-1', workspaceId: 'A' }, role);
    expect(testMocks.replaceRoute).toHaveBeenCalledWith({ name: 'admin-forbidden' });
    expect(testMocks.listMembers).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it.each([false, true])('blocks opening another editor during a save and retains the failed draft (mobile=%s)', async (mobile) => {
    vi.stubGlobal('matchMedia', (media: string) => ({
      matches: mobile && media === '(max-width: 639px)', media,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
    }));
    const member = { ...createMember(), workspaceId: 'A', projectsAssignedCount: 2 };
    const otherMember = {
      ...member,
      id: 'member-other',
      userId: 'user-3',
      displayName: 'Morgan PM',
      email: 'morgan@example.com',
      projectsAssignedCount: 0,
    };
    const updated = { ...member, role: 'member' };
    const roleSave = createDeferred<typeof updated>();
    const assignmentSave = createDeferred<void>();
    const projects = ['Orion', 'Vega'].map((name) => ({
      id: name, name, isActive: true, members: [member],
    }));
    testMocks.listMembers.mockResolvedValueOnce([member, otherMember]).mockResolvedValue([
      { ...updated, projectsAssignedCount: 1 }, otherMember,
    ]);
    testMocks.listProjects.mockResolvedValueOnce(projects).mockResolvedValue([
      { ...projects[0], members: [] }, projects[1],
    ]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.removeAssignment.mockResolvedValueOnce(undefined).mockImplementationOnce(async () => {
      await assignmentSave.promise;
      throw new Error('Project unavailable');
    });
    const wrapper = mountMembersView(workspaceToken('A'), true);
    try {
      await flushPromises();
      const roleFilter = wrapper.getComponent({ name: 'MembersTable' }).findAllComponents({ name: 'Select' })
        .find((select) => mobile
          ? select.attributes('id') === 'mobile-member-role-filter'
          : select.props('ariaLabel') === 'Filter members by role')!;
      roleFilter.vm.$emit('update:modelValue', 'pm');
      await flushPromises();
      const nameSelector = (id: string) => `[data-testid="member-${mobile ? 'mobile-' : ''}name-${id}"]`;
      const activeName = () => wrapper.get<HTMLButtonElement>(nameSelector(member.id));
      const otherName = () => wrapper.get<HTMLButtonElement>(nameSelector(otherMember.id));
      await activeName().trigger('click');
      const editor = () => wrapper.getComponent({ name: 'MemberEditForm' });
      editor().getComponent({ name: 'Select' }).vm.$emit('update:modelValue', 'member');
      for (const project of projects) {
        await editor().get(`[data-pc-section="chipitem"][aria-label="${project.name}"] [data-pc-section="removeicon"]`).trigger('click');
      }
      const table = wrapper.getComponent({ name: 'MembersTable' });
      testMocks.updateMemberRole.mockImplementationOnce(() => {
        expect(table.props('memberEditingDisabled')).toBe(false);
        roleFilter.vm.$emit('update:modelValue', 'admin');
        table.vm.$emit('update:expandedRows', {});
        otherName().element.click();
        return roleSave.promise;
      });
      await editor().get('form').trigger('submit');
      await flushPromises();
      expect(editor().props('saving')).toBe(true);
      expect(activeName().element.disabled).toBe(true);
      expect(otherName().element.disabled).toBe(true);
      expect(roleFilter.props('disabled')).toBe(true);
      activeName().element.click();
      otherName().element.click();
      await flushPromises();
      expect(activeName().attributes('aria-expanded')).toBe('true');
      expect(otherName().attributes('aria-expanded')).toBe('false');
      expect(editor().props('member')).toMatchObject({ id: member.id });

      roleSave.resolve(updated);
      await flushPromises();
      expect(testMocks.updateMemberRole).toHaveBeenCalledBefore(testMocks.removeAssignment);
      expect(otherName().element.disabled).toBe(true);
      otherName().element.click();
      await flushPromises();
      expect(editor().props('member')).toMatchObject({ id: member.id });
      expect(editor().props('saving')).toBe(true);

      assignmentSave.resolve();
      await flushPromises();
      expect(testMocks.errorToast).toHaveBeenCalledWith('Project unavailable', expect.anything());
      expect(otherName().element.disabled).toBe(false);
      expect(editor().props('saving')).toBe(false);
      expect(editor().getComponent({ name: 'Select' }).props('modelValue')).toBe('member');
      expect(editor().findAll('[data-pc-section="chipitem"]').map(chip => chip.text())).toEqual([]);
      expect(roleFilter.props('modelValue')).toBe('pm');

      await editor().get('form').trigger('submit');
      await flushPromises();
      expect(testMocks.updateMemberRole).toHaveBeenCalledOnce();
      expect(testMocks.removeAssignment.mock.calls).toEqual([
        ['Orion', member.userId], ['Vega', member.userId], ['Vega', member.userId],
      ]);
      expect(testMocks.listProjects).toHaveBeenCalledTimes(2);
      expect(wrapper.findComponent({ name: 'MemberEditForm' }).exists()).toBe(false);
      expect(wrapper.find(nameSelector(member.id)).exists()).toBe(false);
      await otherName().trigger('click');
      expect(editor().props('member')).toMatchObject({ id: otherMember.id });
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
    }
  });

  it('reconciles an uncertain self-update before retrying and routes to recovery if renewal failed', async () => {
    const self = { ...createMember(), userId: 'user-1', workspaceId: 'A', role: 'admin' };
    testMocks.listMembers.mockResolvedValue([self]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.updateMemberRole.mockRejectedValue(new Error('Connection interrupted'));
    const wrapper = mountMembersView();
    const store = useAuthStore();
    const sync = vi.spyOn(store, 'reconcileOwnRoleChange').mockImplementation(async () => {
      store.accessToken = null;
      store.profile = null;
      return 'unavailable';
    });
    await flushPromises();
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    wrapper.getComponent({ name: 'MemberEditForm' }).vm.$emit('save', { role: 'pm' });
    await flushPromises();
    expect(sync).toHaveBeenCalledWith({ userId: 'user-1', workspaceId: 'A' }, 'pm');
    expect(testMocks.replaceRoute).toHaveBeenCalledWith({ name: 'admin-login' });
    expect(wrapper.find('[data-testid="members-table"]').exists()).toBe(false);
    expect(testMocks.updateMemberRole).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it('clears permission saving on a workspace switch and isolates the next save', async () => {
    const member = { ...createMember(), workspaceId: 'A' };
    const oldSave = createDeferred<typeof member>();
    const newSave = createDeferred<typeof member>();
    testMocks.listMembers.mockResolvedValue([member]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.updateMemberPermissions.mockReturnValueOnce(oldSave.promise).mockReturnValueOnce(newSave.promise);
    const wrapper = mountMembersView();
    const openEditor = () => wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    const toggle = () => wrapper.get('[data-testid="member-edit-invoice-permission-toggle"]').trigger('click');
    const saving = () => wrapper.getComponent({ name: 'MemberEditForm' }).props('saving');
    await flushPromises();
    await openEditor();
    await toggle();
    expect(saving()).toBe(true);
    useAuthStore().accessToken = workspaceToken('B');
    useAuthStore().accessToken = workspaceToken('A');
    await flushPromises();
    await openEditor();
    expect(saving()).toBe(false);
    await toggle();
    const reads = testMocks.listMembers.mock.calls.length;
    oldSave.resolve(member);
    await flushPromises();
    expect(saving()).toBe(true);
    expect(testMocks.listMembers).toHaveBeenCalledTimes(reads);
    newSave.resolve(member);
    await flushPromises();
    expect(saving()).toBe(false);
    expect(testMocks.listMembers).toHaveBeenCalledTimes(reads);
    wrapper.unmount();
  });

  it.each(['workspace', 'account'])('discards an update after switching %s away and back', async (change) => {
    const member = { ...createMember(), workspaceId: 'A' };
    const saved = createDeferred<typeof member>();
    testMocks.listMembers.mockResolvedValue([member]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.updateMemberRole.mockReturnValue(saved.promise);
    const wrapper = mountMembersView();
    await flushPromises();
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    wrapper.getComponent({ name: 'MemberEditForm' }).vm.$emit('save', { role: 'admin' });
    await flushPromises();
    useAuthStore().accessToken = change === 'workspace' ? workspaceToken('B') : workspaceToken('A', 1, 'user-2');
    useAuthStore().accessToken = workspaceToken('A');
    await flushPromises();
    const reads = testMocks.listMembers.mock.calls.length;
    saved.resolve({ ...member, role: 'admin' });
    await flushPromises();
    expect(wrapper.getComponent({ name: 'MembersTable' }).props('rows')[0].member.role).toBe('pm');
    expect(testMocks.listMembers).toHaveBeenCalledTimes(reads);
    wrapper.unmount();
  });

  it('keeps self removal unavailable while the destination profile is pending', async () => {
    testMocks.listMembers.mockResolvedValue([{ ...createMember(), userId: 'user-1', role: 'admin' }]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);
    const wrapper = mountMembersView();
    await flushPromises();
    useAuthStore().accessToken = workspaceToken('B');
    useAuthStore().profile = null;
    await flushPromises();
    expect(wrapper.find('[data-testid="members-table"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it.each([
    'opaque-token',
    `header.${btoa(JSON.stringify({ sub: 'user-1', workspaceId: 'A' }))}.signature`,
    `header.${btoa(JSON.stringify({ role: 'admin', workspaceId: 'A' }))}.signature`,
    `header.${btoa(JSON.stringify({ sub: 'user-1', role: 'admin' }))}.signature`,
  ])('does not read protected resources with incomplete claims: %s', async (token) => {
    const wrapper = mountMembersView(token);
    await flushPromises();
    expect(testMocks.listMembers).not.toHaveBeenCalled();
    expect(testMocks.listProjects).not.toHaveBeenCalled();
    expect(testMocks.listInvites).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="member-invite-intent"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="member-invite-dialog"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('removes invitation controls immediately on token role loss with a stale admin profile', async () => {
    testMocks.listMembers.mockResolvedValue([createMember()]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);
    const wrapper = mountMembersView();
    await flushPromises();
    await wrapper.get('[data-testid="member-invite-intent"]').trigger('click');
    expect(wrapper.get('[data-testid="member-invite-dialog"]').text()).toContain('visible=true');
    useAuthStore().accessToken = `header.${btoa(JSON.stringify({ sub: 'user-1', workspaceId: 'A', role: 'member' }))}.signature`;
    await flushPromises();
    expect(useAuthStore().profile?.role).toBe('admin');
    expect(wrapper.find('[data-testid="member-invite-intent"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="member-invite-dialog"]').exists()).toBe(false);
    expect(testMocks.listMembers).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it('keeps current members across an A to B to A switch with a late first response', async () => {
    const oldMembers = createDeferred<ReturnType<typeof createMember>[]>();
    const currentMember = { ...createMember(), email: 'current-a@example.com' };
    const bMember = { ...createMember(), email: 'workspace-b@example.com' };
    testMocks.listMembers
      .mockReturnValueOnce(oldMembers.promise)
      .mockResolvedValueOnce([bMember])
      .mockResolvedValueOnce([currentMember]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);
    const wrapper = mountMembersView(workspaceToken('A'));
    expect(testMocks.listMembers).toHaveBeenCalledOnce();
    useAuthStore().accessToken = workspaceToken('B');
    await flushPromises();
    const table = () => wrapper.getComponent({ name: 'MembersTable' });
    expect(table().props('rows')[0].member.email).toBe('workspace-b@example.com');
    useAuthStore().accessToken = workspaceToken('A');
    await flushPromises();
    expect(table().props('rows')[0].member.email).toBe('current-a@example.com');
    oldMembers.resolve([{ ...createMember(), email: 'obsolete-a@example.com' }]);
    await flushPromises();
    expect(table().props('rows')[0].member.email).toBe('current-a@example.com');
    expect(table().props('loading')).toBe(false);
    expect(testMocks.listMembers).toHaveBeenCalledTimes(3);
    expect(testMocks.listProjects).toHaveBeenCalledTimes(3);
    expect(testMocks.listInvites).toHaveBeenCalledTimes(3);
    wrapper.unmount();
  });

  it('keeps destination members usable when invitations fail and preserves them on token renewal', async () => {
    testMocks.listMembers
      .mockResolvedValueOnce([createMember()])
      .mockResolvedValueOnce([{ ...createMember(), email: 'workspace-b@example.com' }]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('B invitations unavailable'));
    const wrapper = mountMembersView(workspaceToken('A'));
    await flushPromises();
    useAuthStore().accessToken = workspaceToken('B');
    await flushPromises();
    expect(wrapper.getComponent({ name: 'MembersTable' }).props('rows')[0].member.email).toBe('workspace-b@example.com');
    expect(wrapper.get('[data-testid="pending-invitations-card"]').text()).toContain('error=B invitations unavailable');
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    expect(wrapper.find('[data-testid="member-edit-panel"]').exists()).toBe(true);
    useAuthStore().accessToken = workspaceToken('B', 2);
    await flushPromises();
    expect(testMocks.listMembers).toHaveBeenCalledTimes(2);
    expect(testMocks.listProjects).toHaveBeenCalledTimes(2);
    expect(testMocks.listInvites).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="member-edit-panel"]').exists()).toBe(true);
    expect(wrapper.getComponent({ name: 'MembersTable' }).props('rows')[0].member.email).toBe('workspace-b@example.com');
    wrapper.unmount();
  });

  it('rejects a confirmation from a previous workspace visit', async () => {
    testMocks.listMembers.mockResolvedValue([createMember()]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);
    const wrapper = mountMembersView();
    await flushPromises();
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    await wrapper.get('[data-testid="member-edit-remove"]').trigger('click');
    const accept = testMocks.requireConfirmation.mock.calls[0]![3] as () => Promise<void>;
    useAuthStore().accessToken = `header.${btoa(JSON.stringify({ sub: 'user-1', role: 'admin', workspaceId: 'destination' }))}.signature`;
    await flushPromises();
    await accept();
    expect(testMocks.removeMember).not.toHaveBeenCalled();
    expect(testMocks.errorToast).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('ignores an old resend completion after the destination has loaded', async () => {
    testMocks.listMembers.mockResolvedValue([createMember()]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([{
      createdAt: '2026-05-01T10:00:00.000Z',
      email: 'source@example.com', expiresAt: '2026-05-08T10:00:00.000Z',
      id: 'old-invite', invitedBy: 'admin', role: 'member', status: 'pending',
      workspaceId: 'source',
    }]);
    const resend = createDeferred<void>();
    testMocks.resendInvite.mockReturnValueOnce(resend.promise);
    const wrapper = mountMembersView();
    await flushPromises();
    await wrapper.get('[data-testid="pending-invite-resend"]').trigger('click');
    testMocks.listInvites.mockResolvedValue([]);
    useAuthStore().accessToken = `header.${btoa(JSON.stringify({ sub: 'user-1', role: 'admin', workspaceId: 'destination' }))}.signature`;
    await flushPromises();
    resend.resolve();
    await flushPromises();
    expect(testMocks.listInvites).toHaveBeenCalledTimes(2);
    expect(testMocks.successToast).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="pending-invitations-card"]').text()).toContain('0 invites');
    wrapper.unmount();
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
        totalSeconds: 43200,
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
    authStore.accessToken = workspaceToken('A');
    authStore.profile = {
      avatarUrl: null,
      canViewInvoices: true,
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
    expect(wrapper.text()).toContain('Active Members');
    expect(wrapper.text()).toContain('Pending Invites');
    expect(wrapper.text()).toContain('PMs Assigned');
    expect(wrapper.get('[data-testid="members-table"]').text()).toContain(
      '2 rows | 1 project filters | loading=false | search= | empty=No members match the current filters.',
    );
    expect(wrapper.get('[data-testid="pending-invitations-card"]').text()).toContain(
      '1 invites | loading=false | error=none',
    );
    expect(wrapper.get('[data-testid="member-invite-dialog"]').text()).toContain(
      'visible=false',
    );

    await wrapper.get('[data-testid="member-invite-intent"]').trigger('click');

    expect(wrapper.get('[data-testid="member-invite-dialog"]').text()).toContain(
      'visible=true',
    );
    expect(testMocks.errorToast).not.toHaveBeenCalled();
  });

  it('applies filter updates emitted by the members table', async () => {
    testMocks.listMembers.mockResolvedValue([
      createMember(),
      {
        ...createMember(),
        displayName: 'Alex Admin',
        email: 'alex@example.com',
        id: 'member-admin',
        role: 'admin',
        userId: 'user-1',
      },
    ]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.listProjects.mockResolvedValue([]);

    const wrapper = mountMembersView();

    await flushPromises();
    await wrapper.get('[data-testid="member-filter-intent"]').trigger('click');

    expect(wrapper.get('[data-testid="members-table"]').text()).toContain(
      '1 rows | 0 project filters | loading=false | search=pat',
    );
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
    authStore.accessToken = workspaceToken('A');
    authStore.profile = { ...adminProfile };

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
    authStore.accessToken = workspaceToken('A');
    authStore.profile = { ...adminProfile };

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
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="member-edit-remove"]').trigger('click');

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
    expect(testMocks.successToast).not.toHaveBeenCalled();
  });

  it('does not remove a member before the confirmation accept callback runs', async () => {
    testMocks.listMembers.mockResolvedValue([createMember()]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);

    const wrapper = mountMembersView();

    await flushPromises();
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="member-edit-remove"]').trigger('click');

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
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="member-edit-remove"]').trigger('click');

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

  it('updates project counts and filters after saving assignments without a reload', async () => {
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
      totalSeconds: 43200,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'public',
      workspaceId: member.workspaceId,
    };

    testMocks.listMembers.mockResolvedValue([member]);
    testMocks.listProjects.mockResolvedValue([project]);
    testMocks.listInvites.mockResolvedValue([]);

    const wrapper = mountMembersView();

    await flushPromises();
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="member-edit-panel"]').text()).toContain(
      'Member settings for pat@example.com across 1 projects',
    );

    await wrapper.get('[data-testid="member-edit-save"]').trigger('click');
    await flushPromises();

    expect(testMocks.removeAssignment).toHaveBeenCalledWith('project-1', 'user-2');
    const table = wrapper.getComponent({ name: 'MembersTable' });
    expect(table.props('rows')[0]).toMatchObject({
      projectsAssignedLabel: '0 projects',
      member: { projectsAssignedCount: 0 },
    });
    table.vm.$emit('update:filters', { projectIds: ['project-1'] });
    await wrapper.vm.$nextTick();
    expect(table.props('rows')).toHaveLength(0);
    table.vm.$emit('update:filters', { projectIds: [] });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="member-edit-panel"]').exists()).toBe(false);
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    wrapper.getComponent({ name: 'MemberEditForm' }).vm.$emit('save', { projectIds: ['project-1'] });
    await flushPromises();

    expect(testMocks.assignMember).toHaveBeenCalledWith('project-1', 'user-2');
    table.vm.$emit('update:filters', { projectIds: ['project-1'] });
    await wrapper.vm.$nextTick();
    expect(table.props('rows')).toEqual([expect.objectContaining({
      projectsAssignedLabel: '1 project',
      member: expect.objectContaining({ projectsAssignedCount: 1 }),
    })]);
    expect(testMocks.listMembers).toHaveBeenCalledOnce();
    expect(testMocks.listProjects).toHaveBeenCalledOnce();
    expect(testMocks.successToast).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="member-edit-panel"]').exists()).toBe(false);
  });

  it('keeps the editor open when a partial assignment save changes its project filter match', async () => {
    const member = { ...createMember(), projectsAssignedCount: 2 };
    const orion = { id: 'project-1', name: 'Orion', isActive: true, members: [member] };
    const vega = { id: 'project-2', name: 'Vega', isActive: true, members: [member] };
    testMocks.listMembers.mockResolvedValueOnce([member]).mockResolvedValue([{ ...member, projectsAssignedCount: 1 }]);
    testMocks.listProjects.mockResolvedValueOnce([orion, vega]).mockResolvedValue([{ ...orion, members: [] }, vega]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.removeAssignment.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Vega unavailable'));
    const wrapper = mountMembersView();

    try {
      await flushPromises();
      const table = wrapper.getComponent({ name: 'MembersTable' });
      table.vm.$emit('update:filters', { projectIds: [orion.id] });
      await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
      await wrapper.get('[data-testid="member-edit-save"]').trigger('click');
      await flushPromises();

      expect(testMocks.errorToast).toHaveBeenCalledWith('Vega unavailable', expect.anything());
      expect(wrapper.getComponent({ name: 'MemberEditForm' }).props('saving')).toBe(false);
      await wrapper.get('[data-testid="member-edit-save"]').trigger('click');
      await flushPromises();

      expect(testMocks.removeAssignment.mock.calls).toEqual([
        [orion.id, member.userId], [vega.id, member.userId], [vega.id, member.userId],
      ]);
      expect(table.props('rows')).toHaveLength(0);
    } finally {
      wrapper.unmount();
    }
  });

  it('updates the invoice view permission from the member settings toggle without a reload', async () => {
    const member = createMember();

    testMocks.listMembers.mockResolvedValue([member]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.updateMemberPermissions.mockResolvedValue({
      ...member,
      canViewInvoices: true,
    });

    const wrapper = mountMembersView();

    await flushPromises();
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();

    await wrapper
      .get('[data-testid="member-edit-invoice-permission-toggle"]')
      .trigger('click');
    await flushPromises();

    expect(testMocks.updateMemberPermissions).toHaveBeenCalledWith(
      'member-remove',
      { canViewInvoices: true },
    );
    expect(testMocks.successToast).not.toHaveBeenCalled();
    expect(testMocks.listMembers).toHaveBeenCalledOnce();
    expect(testMocks.listProjects).toHaveBeenCalledOnce();
    expect(wrapper.getComponent({ name: 'MemberEditForm' }).props('member').canViewInvoices).toBe(true);
    expect(testMocks.errorToast).not.toHaveBeenCalled();
  });

  it('refreshes member data and toasts an error when the invoice permission update fails', async () => {
    const member = createMember();

    testMocks.listMembers.mockResolvedValue([member]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);
    testMocks.updateMemberPermissions.mockRejectedValueOnce(
      new Error('Admin role required'),
    );

    const wrapper = mountMembersView();

    await flushPromises();
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();

    await wrapper
      .get('[data-testid="member-edit-invoice-permission-toggle"]')
      .trigger('click');
    await flushPromises();

    expect(testMocks.updateMemberPermissions).toHaveBeenCalledWith(
      'member-remove',
      { canViewInvoices: true },
    );
    expect(testMocks.errorToast).toHaveBeenCalledWith('Admin role required', {
      error: expect.any(Error),
      logContext: {
        action: 'update-invoice-permission',
        feature: 'members',
      },
    });
    // The refresh after failure restores the authoritative permission state
    // so the toggle reverts.
    expect(testMocks.listMembers).toHaveBeenCalledTimes(2);
  });

  it('keeps project assignment controls unavailable for admin member rows', async () => {
    testMocks.listMembers.mockResolvedValue([
      {
        ...createMember(),
        displayName: 'Alex Admin',
        email: 'alex@example.com',
        id: 'member-admin',
        role: 'admin',
        userId: 'admin-2',
      },
    ]);
    testMocks.listProjects.mockResolvedValue([]);
    testMocks.listInvites.mockResolvedValue([]);

    const wrapper = mountMembersView();

    await flushPromises();
    await wrapper.get('[data-testid="member-edit-intent"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="member-edit-panel"]').text()).toContain(
      'assign=false',
    );
    expect(wrapper.find('[data-testid="member-edit-save"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="member-edit-remove"]').exists()).toBe(true);
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
      'Member settings for pat@example.com',
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
    authStore.accessToken = workspaceToken('A');
    authStore.profile = { ...adminProfile };

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
    authStore.accessToken = workspaceToken('A');
    authStore.profile = { ...adminProfile };

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
    authStore.accessToken = workspaceToken('A');
    authStore.profile = { ...adminProfile };

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
    authStore.accessToken = workspaceToken('A');
    authStore.profile = { ...adminProfile };

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
    expect(testMocks.successToast).not.toHaveBeenCalled();
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
    authStore.accessToken = workspaceToken('A');
    authStore.profile = { ...adminProfile };

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
