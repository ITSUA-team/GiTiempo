import { managedTimeEntryConcurrentUpdateCode, managedTimeEntryNotFoundCode, WorkspaceRoles, type TimeEntryResponse } from '@gitiempo/shared';
import * as SharedUi from '@gitiempo/web-shared';
import { ApiError } from '@gitiempo/web-shared/http';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import AutoComplete from 'primevue/autocomplete';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';

import ManagedEntryDialog from '@/components/time-entries/ManagedEntryDialog.vue';
import { adminDashboardKeys, reportsKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth';
import TimeEntriesView from './TimeEntriesView.vue';

const mocks = vi.hoisted(() => ({
  projects: vi.fn(), members: vi.fn(), hasEligibleMembers: vi.fn(), tasks: vi.fn(), list: vi.fn(),
  create: vi.fn(), update: vi.fn(), remove: vi.fn(),
  confirm: vi.fn(), dismiss: vi.fn(),
}));
const mobile = ref(false);
vi.mock('@/services/admin-time-entries-client', () => ({
  createAdminTimeEntriesClient: () => mocks,
}));
vi.mock('@/composables/feedback/useConfirmation', () => ({
  useConfirmation: () => ({ requireConfirmation: mocks.confirm, dismissConfirmation: mocks.dismiss }),
}));
vi.mock('@gitiempo/web-shared', async importOriginal => ({
  ...await importOriginal<typeof SharedUi>(),
  useIsMobileViewport: () => mobile,
}));

const alpha = { id: 'alpha', name: 'Alpha', isActive: true };
const beta = { id: 'beta', name: 'Beta', isActive: false };
const destination = { id: 'destination', name: 'Destination', isActive: true };
const destinationTask = { id: 'destination-task', title: 'Destination task', defaultBillableForTimeEntries: true };
const past = { id: 'past', displayName: 'Former contributor', email: 'past@example.com' };
const active = { id: 'active', displayName: 'Active contributor', email: 'active@example.com' };
const editable: TimeEntryResponse = {
  id: 'entry', task: { id: 'task', title: 'Historical task' }, taskId: 'task',
  project: alpha, projectId: alpha.id, workspaceId: 'workspace',
  workspace: { id: 'workspace', name: 'Workspace' },
  userId: past.id, user: { ...past, avatarUrl: null },
  startedAt: '2026-04-17T10:00:25.000Z', endedAt: '2026-04-17T11:00:25.000Z',
  durationSeconds: 3600, description: 'Historical description',
  isBillable: false, source: 'manual', invoiceId: null, githubIssue: null,
  createdAt: '2026-04-17T12:00:00.000Z', updatedAt: '2026-04-17T12:00:00.000Z',
};
const running = { ...editable, id: 'running', task: { id: 'running-task', title: 'Running task' }, endedAt: null, durationSeconds: null };
const invoiced = { ...editable, id: 'invoiced', task: { id: 'invoiced-task', title: 'Invoiced task' }, invoiceId: 'invoice' };
const otherEditable = { ...editable, id: 'other', task: { id: 'other-task', title: 'Other editable task' } };

function response(items: TimeEntryResponse[] = [], total = items.length, page = 1) {
  return { items, meta: { page, limit: 20, total, totalPages: Math.ceil(total / 20) } };
}

function token(workspaceId: string) {
  return `token.${btoa(JSON.stringify({ sub: 'actor', role: WorkspaceRoles.PM, workspaceId }))}.signature`;
}

const dialogStub = defineComponent({
  props: { visible: Boolean },
  emits: ['after-hide'],
  watch: {
    visible(value: boolean) {
      if (!value) this.$emit('after-hide');
    },
  },
  template: '<section><slot /><slot name="footer" /></section>',
});

function render({ attachToDocument = false } = {}) {
  const pinia = createPinia();
  const auth = useAuthStore(pinia);
  auth.accessToken = token('workspace');
  const queryClient = new QueryClient();
  const wrapper = mount(TimeEntriesView, {
    attachTo: attachToDocument ? document.body : undefined,
    global: {
      directives: { tooltip: {} },
      plugins: [pinia, PrimeVue, ConfirmationService, [VueQueryPlugin, { queryClient }]],
      stubs: { AppDialog: dialogStub, Teleport: true },
    },
  });
  return { wrapper, auth, queryClient };
}

beforeEach(() => {
  mobile.value = false;
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  mocks.projects.mockResolvedValue([alpha, beta]);
  mocks.hasEligibleMembers.mockResolvedValue(true);
  mocks.members.mockImplementation(async (_project, purpose) => purpose === 'create' ? [active] : [past, active]);
  mocks.tasks.mockResolvedValue({ items: [] });
  mocks.list.mockResolvedValue(response([editable, running, invoiced]));
});

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe('Time Entries', () => {
  it.each([false, true])('renders entry states and restricts locked actions (mobile: %s)', async viewport => {
    mobile.value = viewport;
    const { wrapper } = render();
    await flushPromises();

    expect(wrapper.find('table').exists()).toBe(!viewport);
    expect(wrapper.findAll('article')).toHaveLength(viewport ? 3 : 0);
    expect(wrapper.text()).toContain('Stop timer to edit');
    expect(wrapper.text()).toContain('Included in invoice');
    expect(wrapper.find('button[aria-label="Edit time entry for Historical task"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Delete time entry for Running task"]').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Edit time entry for Invoiced task"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it.each([false, true])('updates one entry in place after saving (mobile: %s)', async viewport => {
    mobile.value = viewport;
    mocks.list.mockResolvedValue(response([editable, otherEditable]));
    const { wrapper } = render();
    await flushPromises();
    const rowSelector = viewport ? 'article' : 'tbody tr';
    const rowsBefore = wrapper.findAll(rowSelector).map(row => row.element);
    const otherEditButton = wrapper.get('button[aria-label="Edit time entry for Other editable task"]');
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    await flushPromises();
    await wrapper.get('#managed-entry-description').setValue('Corrected note');
    let resolveUpdate!: (value: TimeEntryResponse) => void;
    mocks.update.mockReturnValue(new Promise<TimeEntryResponse>(resolve => { resolveUpdate = resolve; }));

    await wrapper.get('form').trigger('submit');
    expect(otherEditButton.attributes('disabled')).toBeUndefined();
    expect(wrapper.get('button[aria-label="Edit time entry for Historical task"]').attributes('disabled')).toBeDefined();
    resolveUpdate({ ...editable, description: 'Saved note' });
    await flushPromises();

    expect(wrapper.get(rowSelector).text()).toContain('Saved note');
    expect(wrapper.findComponent(ManagedEntryDialog).exists()).toBe(false);
    expect(mocks.list).toHaveBeenCalledOnce();
    expect(mocks.members.mock.calls.filter(([, purpose]) => purpose === 'filter')).toHaveLength(1);
    wrapper.findAll(rowSelector).forEach((row, index) => {
      expect(row.element).toBe(rowsBefore[index]);
    });
    wrapper.unmount();
  });

  it('invalidates reports and dashboard in the mutation scope even if the workspace changed while saving', async () => {
    const { wrapper, auth, queryClient } = render();
    const scope = { workspaceId: 'workspace', userId: 'actor', role: WorkspaceRoles.PM };
    const originalKeys = [reportsKeys.all(scope), adminDashboardKeys.all(scope)];
    const otherKey = reportsKeys.all({ ...scope, workspaceId: 'another-workspace' });
    for (const key of [...originalKeys, otherKey]) queryClient.setQueryData(key, { hours: 1 });
    await flushPromises();

    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    let resolveUpdate!: (value: TimeEntryResponse) => void;
    mocks.update.mockReturnValue(new Promise<TimeEntryResponse>(resolve => { resolveUpdate = resolve; }));
    wrapper.getComponent(ManagedEntryDialog).vm.$emit('update', { isBillable: true });
    mocks.projects.mockResolvedValue([]);
    auth.accessToken = token('another-workspace');
    resolveUpdate({ ...editable, isBillable: true });
    await flushPromises();

    for (const key of originalKeys) expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherKey)?.isInvalidated).toBe(false);
    expect(wrapper.findComponent(ManagedEntryDialog).exists()).toBe(false);
    wrapper.unmount();
    queryClient.clear();
  });

  it('keeps the table mounted while reconciling an edit that changes the sort order', async () => {
    const updated = { ...editable, startedAt: '2026-04-16T10:00:25.000Z' };
    const freshPage = response([{ ...running }, { ...invoiced }, updated]);
    let resolve!: (value: typeof freshPage) => void;
    const { wrapper } = render({ attachToDocument: true });
    await flushPromises();
    const table = wrapper.get('table').element;
    const rowsBefore = wrapper.findAll('tbody tr').map(row => row.element);
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    mocks.update.mockResolvedValue(updated);
    mocks.list.mockReturnValueOnce(new Promise<typeof freshPage>(done => { resolve = done; }));

    wrapper.getComponent(ManagedEntryDialog).vm.$emit('update', { startedAt: updated.startedAt });
    await flushPromises();

    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(wrapper.get('table').element).toBe(table);
    expect(wrapper.text()).not.toContain('Loading time entries');
    expect(document.activeElement === wrapper.get('[aria-label="Search entries"]').element).toBe(true);

    resolve(freshPage);
    await flushPromises();

    const rowsAfter = wrapper.findAll('tbody tr');
    expect(rowsAfter[0]?.element).toBe(rowsBefore[1]);
    expect(rowsAfter[1]?.element).toBe(rowsBefore[2]);
    expect(rowsAfter[2]?.element).toBe(rowsBefore[0]);
    expect(rowsAfter[2]?.text()).toContain('16 Apr 2026');
    wrapper.unmount();
  });

  it.each([false, true])('keeps the draft and refetches an invoice conflict (member change: %s)', async changeMember => {
    const { wrapper } = render();
    if (changeMember) {
      mocks.members.mockResolvedValue([past, active]);
      mocks.tasks.mockResolvedValue({ items: [{ ...editable.task, defaultBillableForTimeEntries: false }] });
    } else {
      mocks.tasks.mockRejectedValue(new ApiError('Former member', { status: 422 }));
    }
    mocks.update.mockRejectedValue(new ApiError('This entry is included in an invoice.', {
      status: 409,
      body: { statusCode: 409, error: 'Conflict', code: 'time_entry_invoiced', message: 'This entry is included in an invoice.' },
    }));
    await flushPromises();

    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    await flushPromises();
    expect(wrapper.get<HTMLInputElement>('#managed-entry-member').element.value).toBe(past.displayName);
    expect(wrapper.get<HTMLInputElement>('#managed-entry-task').element.value).toBe('Historical task');
    if (changeMember) {
      const member = wrapper.getComponent(ManagedEntryDialog).getComponent(AutoComplete);
      member.vm.$emit('update:modelValue', member.props('suggestions')!.find(option => option.id === active.id));
      await flushPromises();
    }
    await wrapper.get('#managed-entry-description').setValue('Corrected note');
    mocks.list.mockResolvedValue(response([{ ...editable, invoiceId: 'invoice' }]));
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.update).toHaveBeenCalledWith(alpha.id, editable.id, {
      ...(changeMember ? { userId: active.id } : {}), description: 'Corrected note',
    });
    expect(wrapper.getComponent(ManagedEntryDialog).text()).toContain('This entry is included in an invoice.');
    expect(wrapper.get<HTMLInputElement>('#managed-entry-member').element.value).toBe(changeMember ? active.displayName : past.displayName);
    expect((wrapper.get('#managed-entry-description').element as HTMLTextAreaElement).value).toBe('Corrected note');
    expect(wrapper.find('button[aria-label="Edit time entry for Historical task"]').exists()).toBe(false);
    expect(mocks.list).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('keeps an edit draft available to save after a concurrent update', async () => {
    const description = 'Keep my draft';
    const message = 'This time entry was updated concurrently. Please try saving again.';
    const code = managedTimeEntryConcurrentUpdateCode;
    mocks.update.mockRejectedValueOnce(new ApiError(message, {
      status: 409, code, body: { statusCode: 409, error: 'Conflict', code, message },
    })).mockResolvedValue({ ...editable, description });
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    await flushPromises();
    await wrapper.get('#managed-entry-description').setValue(description);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const dialog = wrapper.getComponent(ManagedEntryDialog);
    expect(dialog.text()).toContain(message);
    expect(dialog.get<HTMLTextAreaElement>('#managed-entry-description').element.value).toBe(description);
    expect(dialog.get('button[type="submit"]').attributes('disabled')).toBeUndefined();

    await dialog.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.update.mock.calls).toEqual([
      [alpha.id, editable.id, { description }],
      [alpha.id, editable.id, { description }],
    ]);
    expect(wrapper.findComponent(ManagedEntryDialog).exists()).toBe(false);
    wrapper.unmount();
  });

  it('hides the create action when no member can create an entry', async () => {
    mocks.hasEligibleMembers.mockResolvedValue(false);
    const { wrapper } = render();
    await flushPromises();

    expect(mocks.hasEligibleMembers).toHaveBeenCalledExactlyOnceWith(alpha.id);
    expect(wrapper.find('button[aria-label="New time entry"]').exists()).toBe(false);
    expect(wrapper.text()).toContain(editable.task.title);
    wrapper.unmount();
  });

  it('locks the edit draft when the record disappeared but project access remains', async () => {
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    await flushPromises();
    await wrapper.get('#managed-entry-description').setValue('Keep my draft');
    mocks.update.mockRejectedValueOnce(new ApiError('Time entry not found', { status: 404, code: managedTimeEntryNotFoundCode }));
    mocks.projects.mockResolvedValue([beta, alpha]);
    mocks.list.mockResolvedValue(response([]));
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.getComponent(ManagedEntryDialog).text()).toContain('Time entry not found');
    expect(wrapper.get<HTMLTextAreaElement>('#managed-entry-description').element.value).toBe('Keep my draft');
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe(alpha.name);
    expect(wrapper.text()).toContain('No time entries yet');
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.projects).toHaveBeenCalledTimes(2);
    expect(mocks.list).toHaveBeenLastCalledWith(alpha.id, 1, expect.anything());
    wrapper.unmount();
  });

  it('blocks saving and keeps the draft until a failed access check can be retried', async () => {
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    const description = wrapper.get<HTMLTextAreaElement>('#managed-entry-description');
    await description.setValue('Keep my draft');
    mocks.update.mockRejectedValueOnce(new ApiError('Project not found', { status: 404 }));
    mocks.projects.mockRejectedValueOnce(new ApiError('Project service unavailable', { status: 500 }));
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Unable to verify project access');
    expect(description.element.value).toBe('Keep my draft');
    const submit = wrapper.get('button[type="submit"]');
    expect(submit.attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(mocks.update).toHaveBeenCalledOnce();

    const retry = wrapper.getComponent(ManagedEntryDialog).findAll('button').find(button => button.text() === 'Try again');
    await retry?.trigger('click');
    await flushPromises();

    expect(submit.attributes('disabled')).toBeUndefined();
    expect(description.element.value).toBe('Keep my draft');
    expect(wrapper.text()).not.toContain('Unable to verify project access');
    expect(mocks.projects).toHaveBeenCalledTimes(3);
    wrapper.unmount();
  });

  it('returns focus to the invoking edit button after saving in place', async () => {
    const { wrapper } = render({ attachToDocument: true });
    await flushPromises();
    const edit = wrapper.get<HTMLButtonElement>('button[aria-label="Edit time entry for Historical task"]');
    edit.element.focus();
    await edit.trigger('click');
    const description = wrapper.get<HTMLTextAreaElement>('#managed-entry-description');
    description.element.focus();
    await description.setValue('Saved with focus restored');
    mocks.update.mockResolvedValueOnce({ ...editable, description: 'Saved with focus restored' });
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.update).toHaveBeenCalledOnce();
    expect(wrapper.findComponent(ManagedEntryDialog).exists()).toBe(false);
    expect(document.activeElement === edit.element).toBe(true);
    wrapper.unmount();
  });

  it.each([false, true])('disables competing actions during deletion (mobile: %s)', async viewport => {
    mobile.value = viewport;
    mocks.list.mockResolvedValue(response([editable, otherEditable]));
    const { wrapper } = render();
    await flushPromises();
    let finishDelete!: () => void;
    mocks.remove.mockReturnValue(new Promise<void>(resolve => { finishDelete = resolve; }));
    await wrapper.get('button[aria-label="Delete time entry for Historical task"]').trigger('click');
    mocks.confirm.mock.calls[0][3]();
    await flushPromises();

    const add = wrapper.get('button[aria-label="New time entry"]');
    const edit = wrapper.get('button[aria-label="Edit time entry for Other editable task"]');
    expect(add.attributes('disabled')).toBeDefined();
    expect(edit.attributes('disabled')).toBeDefined();
    expect(wrapper.get('button[aria-label="Deleting time entry for Historical task"]').attributes('disabled')).toBeDefined();

    mocks.list.mockResolvedValue(response([otherEditable]));
    finishDelete();
    await flushPromises();
    expect(add.attributes('disabled')).toBeUndefined();
    expect(wrapper.get('button[aria-label="Edit time entry for Other editable task"]').attributes('disabled')).toBeUndefined();
    wrapper.unmount();
  });

  it('clears the editor and protected rows when a missing project is no longer manageable', async () => {
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    await flushPromises();
    mocks.update.mockRejectedValueOnce(new ApiError('Project not found', { status: 404 }));
    mocks.projects.mockResolvedValue([beta]);
    mocks.list.mockResolvedValue(response([]));
    wrapper.getComponent(ManagedEntryDialog).vm.$emit('update', { description: 'Retained only with access' });
    await flushPromises();

    expect(wrapper.findComponent(ManagedEntryDialog).exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Historical task');
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe(beta.name);
    expect(mocks.list).toHaveBeenLastCalledWith(beta.id, 1, expect.anything());
    wrapper.unmount();
  });

  it('refreshes eligible tasks after a 422, preserving the original historical task and draft', async () => {
    const closed = { id: 'closed', title: 'Now closed', defaultBillableForTimeEntries: false };
    const available = { id: 'available', title: 'Still eligible', defaultBillableForTimeEntries: false };
    mocks.members.mockResolvedValue([past, active]);
    mocks.tasks.mockResolvedValueOnce({ items: [closed, available] }).mockResolvedValue({ items: [available] });
    mocks.update.mockRejectedValueOnce(new ApiError('Task is ineligible', { status: 422 }));
    const { wrapper } = render({ attachToDocument: true });
    await flushPromises();
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    await flushPromises();
    const dialog = wrapper.getComponent(ManagedEntryDialog);
    const [, task] = dialog.findAllComponents(AutoComplete);
    task!.vm.$emit('update:modelValue', closed);
    await dialog.get('#managed-entry-description').setValue('Keep the description');
    await dialog.get('form').trigger('submit');
    await flushPromises();

    expect(dialog.text()).toContain('Task is ineligible');
    expect(dialog.get<HTMLTextAreaElement>('#managed-entry-description').element.value).toBe('Keep the description');
    expect(task!.props('modelValue')).toBeNull();
    expect((task!.props('suggestions') ?? []).map(option => option.id)).toEqual([editable.taskId, available.id]);
    expect(mocks.tasks).toHaveBeenCalledTimes(2);
    await dialog.get('form').trigger('submit');
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(dialog.get('#managed-entry-task-error').text()).toBe('Select a task.');
    expect(dialog.get('#managed-entry-task').attributes('aria-describedby')).toBe('managed-entry-task-error');
    expect(document.activeElement === dialog.get('#managed-entry-task').element).toBe(true);
    wrapper.unmount();
  });

  it.each([false, true])('changes only the member and retains compatible task and fields (member filter: %s)', async filtered => {
    mobile.value = filtered;
    const task = { ...editable.task, defaultBillableForTimeEntries: true };
    const updated = { ...editable, userId: active.id, user: { ...active, avatarUrl: null } };
    mocks.tasks.mockResolvedValue({ items: [task] });
    mocks.members.mockResolvedValue([past, active]);
    mocks.list.mockResolvedValue(response([editable]));
    mocks.update.mockResolvedValue(updated);
    const { wrapper } = render();
    await flushPromises();
    const filter = wrapper.getComponent(SharedUi.FilterAutoComplete).getComponent(AutoComplete);
    if (filtered) {
      filter.vm.$emit('update:modelValue', { ...past, label: past.displayName });
      await flushPromises();
    }
    const row = wrapper.get(filtered ? 'article' : 'tbody tr').element;
    const initialListCalls = mocks.list.mock.calls.length;
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    await flushPromises();
    const dialog = wrapper.getComponent(ManagedEntryDialog);
    const [member, taskField] = dialog.findAllComponents(AutoComplete);
    expect(member!.props('suggestions')).toEqual([expect.objectContaining(past), expect.objectContaining(active)]);
    member!.vm.$emit('update:modelValue', active);
    await flushPromises();
    expect(taskField!.props('modelValue')).toEqual(expect.objectContaining(editable.task));
    mocks.members.mockResolvedValue([active]);
    mocks.list.mockResolvedValue(response([]));
    await dialog.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.update).toHaveBeenCalledWith(alpha.id, editable.id, { userId: active.id });
    expect(wrapper.findComponent(ManagedEntryDialog).exists()).toBe(false);
    if (filtered) {
      expect(mocks.list).toHaveBeenLastCalledWith(alpha.id, 1, expect.objectContaining({ userId: past.id }));
      expect(filter.props('modelValue')).toEqual(expect.objectContaining(past));
      expect(wrapper.find('article').exists()).toBe(false);
      expect(wrapper.text()).toContain('No matching time entries');
    } else {
      expect(mocks.list).toHaveBeenCalledTimes(initialListCalls);
      expect(wrapper.get('tbody tr').element).toBe(row);
      expect(row.textContent).toContain(active.displayName);
    }
    wrapper.unmount();
  });

  it.each(['member', 'task'] as const)('can replace an incompatible pair by choosing %s first', async first => {
    const replacementTask = { id: 'replacement', title: 'Replacement task', defaultBillableForTimeEntries: true };
    mocks.members.mockImplementation(async (_project, purpose, _current, taskId) =>
      purpose === 'filter' || !taskId || taskId === replacementTask.id ? [active] : []);
    mocks.tasks.mockImplementation(async (_project, ownerId) => ({ items: ownerId === past.id ? [] : [replacementTask] }));
    mocks.update.mockResolvedValue({ ...editable, task: replacementTask, taskId: replacementTask.id, userId: active.id });
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    await flushPromises();
    const dialog = wrapper.getComponent(ManagedEntryDialog);
    const [member, task] = dialog.findAllComponents(AutoComplete);
    expect(member!.props('suggestions')).toEqual([expect.objectContaining(past)]);
    expect(task!.props('suggestions')).toEqual([expect.objectContaining(editable.task)]);
    if (first === 'member') {
      await task!.get('.p-autocomplete-clear-icon').trigger('click');
      await flushPromises();
      expect(member!.props('suggestions')).toEqual(expect.arrayContaining([expect.objectContaining(active)]));
      member!.vm.$emit('update:modelValue', active);
      await flushPromises();
      expect(task!.props('suggestions')).toEqual([expect.objectContaining(replacementTask)]);
      task!.vm.$emit('update:modelValue', replacementTask);
    } else {
      await member!.get('.p-autocomplete-clear-icon').trigger('click');
      await flushPromises();
      expect(task!.props('suggestions')).toContainEqual(expect.objectContaining(replacementTask));
      task!.vm.$emit('update:modelValue', replacementTask);
      await flushPromises();
      expect(member!.props('suggestions')).toEqual([expect.objectContaining(active)]);
      member!.vm.$emit('update:modelValue', active);
    }
    await flushPromises();
    await dialog.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.update).toHaveBeenCalledWith(alpha.id, editable.id, { userId: active.id, taskId: replacementTask.id });
    wrapper.unmount();
  });

  it('moves the same entry from the source path and reconciles the sidebar list in place', async () => {
    mocks.projects.mockResolvedValue([alpha, beta, destination]);
    mocks.tasks.mockImplementation(async (projectId, ownerId) => projectId === destination.id
      ? { items: [destinationTask], isOwnerAssigned: ownerId === past.id }
      : { items: [] });
    mocks.members.mockResolvedValue([past, active]);
    mocks.list.mockResolvedValue(response([editable, otherEditable]));
    const updated = { ...editable, description: 'Keep this note', project: destination, projectId: destination.id, task: destinationTask, taskId: destinationTask.id };
    mocks.update.mockResolvedValue(updated);
    const { wrapper } = render({ attachToDocument: true });
    await flushPromises();
    const search = wrapper.get('input[aria-label="Search entries"]');
    await search.setValue('retained filter');
    await flushPromises();
    const other = wrapper.get('button[aria-label="Edit time entry for Other editable task"]').element;
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    await flushPromises();
    const dialog = wrapper.getComponent(ManagedEntryDialog);
    const [member, task] = dialog.findAllComponents(AutoComplete);
    const start = dialog.get<HTMLInputElement>('#managed-entry-start').element.value;
    const end = dialog.get<HTMLInputElement>('#managed-entry-end').element.value;
    await dialog.get('#managed-entry-description').setValue(updated.description);
    dialog.getComponent(Select).vm.$emit('update:modelValue', destination.id);
    await flushPromises();
    expect(task!.props('modelValue')).toBeNull();
    expect(member!.props('modelValue')).toEqual(expect.objectContaining(past));
    expect(dialog.get<HTMLInputElement>('#managed-entry-start').element.value).toBe(start);
    expect(dialog.get<HTMLInputElement>('#managed-entry-end').element.value).toBe(end);
    expect(dialog.get<HTMLTextAreaElement>('#managed-entry-description').element.value).toBe(updated.description);
    task!.vm.$emit('update:modelValue', destinationTask);
    await flushPromises();
    expect(dialog.get<HTMLInputElement>('#managed-entry-billable').element.checked).toBe(false);
    mocks.list.mockResolvedValue(response([otherEditable]));
    await dialog.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.update).toHaveBeenCalledWith(alpha.id, editable.id, {
      projectId: destination.id, taskId: destinationTask.id, description: updated.description,
    });
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe(alpha.name);
    expect(search.element).toBe(document.activeElement);
    expect(mocks.list).toHaveBeenLastCalledWith(alpha.id, 1, expect.objectContaining({ search: 'retained filter' }));
    expect(wrapper.find('button[aria-label="Edit time entry for Historical task"]').exists()).toBe(false);
    expect(wrapper.get('button[aria-label="Edit time entry for Other editable task"]').element).toBe(other);
    mocks.list.mockResolvedValue(response([updated]));
    const destinationButton = wrapper.findAll('button[aria-pressed]').find(button => button.text() === destination.name);
    await destinationButton?.trigger('click');
    await flushPromises();
    expect(wrapper.find('button[aria-label="Edit time entry for Destination task"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('allows a different destination after a 404 and keeps the source and draft', async () => {
    mocks.projects.mockResolvedValue([alpha, destination]);
    mocks.members.mockResolvedValue([past, active]);
    mocks.tasks.mockImplementation(async id => ({ items: id === destination.id ? [destinationTask] : [], isOwnerAssigned: false }));
    mocks.update.mockRejectedValueOnce(new ApiError('Project not found', { status: 404 }));
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    const dialog = wrapper.getComponent(ManagedEntryDialog);
    const project = dialog.getComponent(Select);
    const [member, task] = dialog.findAllComponents(AutoComplete);
    project.vm.$emit('update:modelValue', destination.id);
    await flushPromises();
    expect(member!.props('modelValue')).toBeNull();
    task!.vm.$emit('update:modelValue', destinationTask);
    member!.vm.$emit('update:modelValue', active);
    await dialog.get('#managed-entry-description').setValue('Keep this note');
    await flushPromises();
    mocks.projects.mockResolvedValue([alpha]);
    await dialog.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.update).toHaveBeenCalledWith(alpha.id, editable.id, {
      projectId: destination.id, userId: active.id, taskId: destinationTask.id, description: 'Keep this note',
    });
    expect(dialog.text()).toContain('Project not found');
    expect(project.props('options')).toEqual([alpha]);
    expect(project.props('disabled')).toBe(false);
    expect(dialog.get<HTMLTextAreaElement>('#managed-entry-description').element.value).toBe('Keep this note');
    expect(dialog.get('button[type="submit"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe(alpha.name);
    wrapper.unmount();
  });

  it('restores the historical pair when returning to the archived source before a lookup completes', async () => {
    const archivedEntry = { ...editable, projectId: beta.id, project: beta };
    let resolveObsolete!: (result: { items: typeof destinationTask[]; isOwnerAssigned: boolean }) => void;
    mocks.projects.mockResolvedValue([beta, destination]);
    mocks.list.mockResolvedValue(response([archivedEntry]));
    mocks.tasks.mockImplementation(() => new Promise(resolve => { resolveObsolete = resolve; }));
    mocks.update.mockResolvedValue({ ...archivedEntry, description: 'Historical correction' });
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    const dialog = wrapper.getComponent(ManagedEntryDialog);
    const project = dialog.getComponent(Select);
    await dialog.get('#managed-entry-description').setValue('Historical correction');
    project.vm.$emit('update:modelValue', destination.id);
    await flushPromises();
    project.vm.$emit('update:modelValue', beta.id);
    await flushPromises();
    resolveObsolete({ items: [destinationTask], isOwnerAssigned: false });
    await flushPromises();

    const [member, task] = dialog.findAllComponents(AutoComplete);
    expect(member!.props('modelValue')).toEqual(expect.objectContaining(past));
    expect(task!.props('modelValue')).toEqual(expect.objectContaining(editable.task));
    expect(dialog.get('button[type="submit"]').attributes('disabled')).toBeUndefined();
    await dialog.get('form').trigger('submit');
    await flushPromises();
    expect(mocks.update).toHaveBeenCalledWith(beta.id, archivedEntry.id, { description: 'Historical correction' });
    wrapper.unmount();
  });

  it('creates completed time for a selected member and applies the task billability default', async () => {
    const task = { id: 'new-task', title: 'Eligible task', defaultBillableForTimeEntries: true };
    const startedAt = editable.startedAt;
    const endedAt = editable.endedAt!;
    const sameName = { ...active, id: 'same-name', email: 'other-active@example.com' };
    mocks.members.mockImplementation(async (_project, purpose) => purpose === 'create' ? [sameName, active] : [past, active]);
    mocks.tasks.mockResolvedValue({ items: [task] });
    mocks.create.mockResolvedValue(editable);
    const { wrapper } = render();
    await flushPromises();

    const createButton = wrapper.get('button[aria-label="New time entry"]');
    expect(createButton.text()).toBe('');
    await createButton.trigger('click');
    const dialog = wrapper.getComponent(ManagedEntryDialog);
    const [member, taskField] = dialog.findAllComponents(AutoComplete);
    await member!.get('button.p-autocomplete-dropdown').trigger('click');
    await vi.waitFor(() => expect(member!.findAll('[role="option"]').map(option => option.text())).toEqual([
      `${sameName.displayName} (${sameName.email})`,
      `${active.displayName} (${active.email})`,
    ]));
    expect(member!.get('.p-autocomplete-overlay').classes()).toContain('max-w-[calc(100vw-2rem)]');
    await member!.get('[role="option"]:last-child').trigger('click');
    await flushPromises();
    expect(mocks.tasks).toHaveBeenCalledWith(alpha.id, active.id, expect.any(Function));
    await taskField!.get('button.p-autocomplete-dropdown').trigger('click');
    await vi.waitFor(() => expect(taskField!.get('[role="option"]').text()).toBe(task.title));
    expect(taskField!.get('.p-autocomplete-overlay').classes()).toContain('max-w-[calc(100vw-2rem)]');
    await taskField!.get('[role="option"]').trigger('click');
    const [start, end] = dialog.findAllComponents(DatePicker);
    start?.vm.$emit('update:modelValue', new Date(startedAt));
    end?.vm.$emit('update:modelValue', new Date(endedAt));
    await flushPromises();
    await dialog.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.create).toHaveBeenCalledWith(alpha.id, {
      userId: active.id, taskId: task.id, startedAt, endedAt, isBillable: true, description: null,
    });
    expect(wrapper.findComponent(ManagedEntryDialog).exists()).toBe(false);
    expect(mocks.list).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('requires an explicit choice between tasks with the same title', async () => {
    const first = { id: 'aaaaaaaa-first', title: 'Shared task', defaultBillableForTimeEntries: false };
    const second = { ...first, id: 'bbbbbbbb-second' };
    mocks.members.mockResolvedValue([past, active]);
    mocks.tasks.mockResolvedValue({ items: [first, second] });
    mocks.update.mockResolvedValue({ ...editable, task: second, taskId: second.id });
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    await flushPromises();
    const dialog = wrapper.getComponent(ManagedEntryDialog);
    const [, task] = dialog.findAllComponents(AutoComplete);
    const input = dialog.get<HTMLInputElement>('#managed-entry-task');
    await task!.get('.p-autocomplete-clear-icon').trigger('click');
    await input.setValue(first.title);
    await vi.waitFor(() => expect(task!.findAll('[role="option"]').map(option => option.text())).toEqual([
      `aaaaaaaa · ${first.title}`, `bbbbbbbb · ${second.title}`,
    ]));
    await input.trigger('change');
    expect(task!.props('modelValue')).toBeNull();
    await input.setValue('bbbbbbbb');
    await vi.waitFor(() => expect(task!.findAll('[role="option"]').map(option => option.text())).toEqual([
      `bbbbbbbb · ${second.title}`,
    ]));
    await task!.get('[role="option"]').trigger('click');
    await vi.waitFor(() => expect(input.attributes('aria-expanded')).toBe('false'));
    expect(input.element.value).toBe(`bbbbbbbb · ${second.title}`);

    await dialog.get('form').trigger('submit');
    await flushPromises();
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith(alpha.id, editable.id, { taskId: second.id });
    wrapper.unmount();
  });

  it.each([true, false])('keeps the draft and saves in the dialog project (assigned: %s)', async assigned => {
    const destination = { id: 'destination', name: 'Destination', isActive: true };
    const originTask = { id: 'origin-task', title: 'Origin task', defaultBillableForTimeEntries: true };
    const destinationTask = { id: 'destination-task', title: 'Destination task', defaultBillableForTimeEntries: false };
    const replacement = { id: 'replacement', displayName: 'Replacement member', email: 'replacement@example.com' };
    mocks.projects.mockResolvedValue([alpha, beta, destination]);
    mocks.tasks.mockImplementation(async (id, owner) => id === alpha.id
      ? { items: [originTask] }
      : { items: [destinationTask], isOwnerAssigned: owner ? assigned : undefined });
    mocks.members.mockImplementation(async (id, _purpose, _current, taskId) => {
      if (id === alpha.id && taskId === originTask.id) return [active];
      return [active, replacement];
    });
    mocks.create.mockResolvedValue(editable);
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('button[aria-label="New time entry"]').trigger('click');
    await flushPromises();

    const dialog = wrapper.getComponent(ManagedEntryDialog);
    const project = dialog.getComponent(Select);
    const [member, task] = dialog.findAllComponents(AutoComplete);
    expect(project.props('modelValue')).toBe(alpha.id);
    expect(dialog.get('#managed-entry-project').attributes('aria-labelledby')).toBe('managed-entry-project-label');
    expect(dialog.get('#managed-entry-project-label').text()).toBe('Project');
    expect(project.props('options')).toEqual([alpha, destination]);
    expect(task!.props('disabled')).toBe(false);
    task!.vm.$emit('update:modelValue', originTask);
    await flushPromises();
    expect(mocks.members).toHaveBeenCalledWith(alpha.id, 'create', expect.any(Function), originTask.id);
    member!.vm.$emit('update:modelValue', active);
    const [start, end] = dialog.findAllComponents(DatePicker);
    start!.vm.$emit('update:modelValue', new Date(editable.startedAt));
    end!.vm.$emit('update:modelValue', new Date(editable.endedAt!));
    await dialog.get('#managed-entry-description').setValue('Retained notes');
    await flushPromises();
    expect(task!.props('modelValue')).toEqual(expect.objectContaining(originTask));

    project.vm.$emit('update:modelValue', destination.id);
    await flushPromises();
    expect(task!.props('modelValue')).toBeNull();
    expect(member!.props('modelValue')).toEqual(assigned ? expect.objectContaining(active) : null);
    expect(dialog.get<HTMLInputElement>('#managed-entry-start').element.value).not.toBe('');
    expect(dialog.get<HTMLInputElement>('#managed-entry-end').element.value).not.toBe('');
    expect(dialog.get<HTMLTextAreaElement>('#managed-entry-description').element.value).toBe('Retained notes');
    task!.vm.$emit('update:modelValue', destinationTask);
    if (!assigned) member!.vm.$emit('update:modelValue', replacement);
    await flushPromises();
    await dialog.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.create).toHaveBeenCalledWith(destination.id, {
      userId: assigned ? active.id : replacement.id, taskId: destinationTask.id,
      startedAt: editable.startedAt, endedAt: editable.endedAt, isBillable: false, description: 'Retained notes',
    });
    expect(mocks.list).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('ignores obsolete task and assignment results after rapid project switches', async () => {
    const second = { ...beta, isActive: true };
    const third = { id: 'third', name: 'Third', isActive: true };
    const thirdTask = { id: 'third-task', title: 'Third task', defaultBillableForTimeEntries: false };
    const staleTask = { ...thirdTask, id: 'stale', title: 'Stale task' };
    let resolveObsolete!: (result: { items: typeof staleTask[]; isOwnerAssigned: boolean }) => void;
    mocks.projects.mockResolvedValue([alpha, second, third]);
    mocks.tasks.mockImplementation(async id => {
      if (id === second.id) return new Promise(resolve => { resolveObsolete = resolve; });
      return { items: id === third.id ? [thirdTask] : [], isOwnerAssigned: true };
    });
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('button[aria-label="New time entry"]').trigger('click');
    await flushPromises();
    const dialog = wrapper.getComponent(ManagedEntryDialog);
    const [member, task] = dialog.findAllComponents(AutoComplete);
    const project = dialog.getComponent(Select);
    member!.vm.$emit('update:modelValue', active);
    project.vm.$emit('update:modelValue', second.id);
    await flushPromises();
    project.vm.$emit('update:modelValue', third.id);
    await flushPromises();
    resolveObsolete({ items: [staleTask], isOwnerAssigned: false });
    await flushPromises();

    expect(member!.props('modelValue')).toEqual(expect.objectContaining(active));
    expect(task!.props('suggestions')).toEqual([expect.objectContaining(thirdTask)]);
    wrapper.unmount();
  });

  it('restarts pagination and keeps historical member filters scoped to the selected project', async () => {
    mocks.list.mockResolvedValueOnce(response([editable], 21)).mockResolvedValue(response([], 21, 2));
    const { wrapper } = render();
    await flushPromises();

    await wrapper.get('button[aria-label="Next Page"]').trigger('click');
    await flushPromises();
    expect(mocks.list).toHaveBeenLastCalledWith(alpha.id, 2, expect.anything());

    const filter = wrapper.getComponent(AutoComplete);
    expect(filter.props('suggestions')).toEqual(expect.arrayContaining([expect.objectContaining({ id: past.id })]));
    filter.vm.$emit('update:modelValue', { ...past, label: past.displayName });
    await wrapper.get('input[aria-label="Search entries"]').setValue('  historic ');
    await flushPromises();

    expect(mocks.list).toHaveBeenLastCalledWith(alpha.id, 1, expect.objectContaining({ userId: past.id, search: 'historic' }));
    expect(wrapper.text()).toContain('No matching time entries');
    wrapper.unmount();
  });

  it('commits complete date ranges on Confirm and restores the applied range on Cancel', async () => {
    const { wrapper } = render();
    await flushPromises();
    const picker = wrapper.getComponent(DatePicker);
    const start = new Date(2026, 3, 17);
    const end = new Date(2026, 3, 20);
    await wrapper.get('input[aria-label="Filter by date range"]').trigger('focus');
    await flushPromises();
    picker.vm.$emit('show');
    picker.vm.$emit('update:modelValue', [start, null]);
    await flushPromises();
    expect(mocks.list).toHaveBeenCalledTimes(1);
    picker.vm.$emit('update:modelValue', [start, end]);
    await flushPromises();
    expect(mocks.list).toHaveBeenCalledTimes(1);
    await wrapper.getComponent(SharedUi.DatePickerButtonBar).get('[data-testid="date-picker-confirm"]').trigger('click');
    await flushPromises();
    expect(mocks.list).toHaveBeenLastCalledWith(alpha.id, 1, expect.objectContaining({
      dateFrom: start.toISOString(), dateTo: new Date(2026, 3, 21).toISOString(),
    }));

    await wrapper.get('input[aria-label="Filter by date range"]').trigger('focus');
    await flushPromises();
    picker.vm.$emit('show');
    picker.vm.$emit('update:modelValue', [new Date(2026, 3, 23), null]);
    await flushPromises();
    await wrapper.getComponent(SharedUi.DatePickerButtonBar).get('[data-testid="date-picker-cancel"]').trigger('click');
    await flushPromises();
    expect(picker.props('modelValue')).toEqual([start, end]);
    expect(mocks.list).toHaveBeenCalledTimes(2);

    picker.vm.$emit('update:modelValue', null);
    await flushPromises();
    expect(mocks.list).toHaveBeenLastCalledWith(alpha.id, 1, expect.objectContaining({ dateFrom: undefined, dateTo: undefined }));
    wrapper.unmount();
  });

  it('deletes only after the existing confirmation accepts and refreshes the page', async () => {
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('button[aria-label="Delete time entry for Historical task"]').trigger('click');

    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.confirm).toHaveBeenCalledOnce();

    mocks.remove.mockResolvedValue(undefined);
    mocks.list.mockResolvedValue(response([]));
    mocks.confirm.mock.calls[0]?.[3]();
    await flushPromises();
    expect(mocks.remove).toHaveBeenCalledWith(alpha.id, editable.id);
    expect(wrapper.text()).toContain('No time entries yet');
    wrapper.unmount();
  });

  it.each([false, true])('keeps the entry and refreshes its lock after a delete conflict (mobile: %s)', async viewport => {
    mobile.value = viewport;
    const message = 'This entry is included in an invoice.';
    mocks.list.mockResolvedValueOnce(response([editable]))
      .mockResolvedValue(response([{ ...editable, invoiceId: 'invoice' }]));
    mocks.remove.mockRejectedValueOnce(new ApiError('Conflict', {
      status: 409,
      body: { statusCode: 409, error: 'Conflict', code: 'time_entry_invoiced', message },
    }));
    const { wrapper } = render();
    await flushPromises();

    const deleteButton = 'button[aria-label="Delete time entry for Historical task"]';
    await wrapper.get(deleteButton).trigger('click');
    mocks.confirm.mock.calls[0][3]();
    await flushPromises();

    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(alpha.id, editable.id);
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain(message);
    expect(wrapper.text()).toContain('Historical task');
    expect(wrapper.text()).toContain('Included in invoice');
    expect(wrapper.find(deleteButton).exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Edit time entry for Historical task"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('clears protected data and rechecks project scope once after a denial', async () => {
    mocks.list.mockRejectedValue(new ApiError('Project unavailable', { status: 404 }));
    const { wrapper } = render();
    await flushPromises();

    expect(mocks.projects).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Project unavailable');
    expect(wrapper.find('button[aria-label="New time entry"]').exists()).toBe(false);
    expect(wrapper.find('table').exists()).toBe(false);
    wrapper.unmount();
  });

  it('rejects late rows across project selection and workspace changes', async () => {
    let resolve!: (value: ReturnType<typeof response>) => void;
    const promise = new Promise<ReturnType<typeof response>>(done => { resolve = done; });
    mocks.list.mockReturnValueOnce(promise).mockResolvedValue(response([]));
    const { wrapper, auth } = render();
    await flushPromises();

    await wrapper.get('button[aria-pressed="false"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Archived project');
    expect(wrapper.find('button[aria-label="New time entry"]').exists()).toBe(false);
    expect(mocks.list).toHaveBeenLastCalledWith(beta.id, 1, expect.anything());

    mocks.projects.mockResolvedValue([]);
    auth.accessToken = token('another-workspace');
    resolve(response([editable]));
    await flushPromises();
    expect(wrapper.text()).toContain('No manageable projects.');
    expect(wrapper.text()).not.toContain('Historical task');
    expect(wrapper.text()).not.toContain('Beta');
    wrapper.unmount();
  });
});
