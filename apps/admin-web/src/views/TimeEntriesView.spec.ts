import { WorkspaceRoles, type TimeEntryResponse } from '@gitiempo/shared';
import * as SharedUi from '@gitiempo/web-shared';
import { ApiError } from '@gitiempo/web-shared/http';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
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
  projects: vi.fn(), members: vi.fn(), tasks: vi.fn(), list: vi.fn(),
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
  template: '<section><slot /><slot name="footer" /></section>',
});

function render() {
  const pinia = createPinia();
  const auth = useAuthStore(pinia);
  auth.accessToken = token('workspace');
  const queryClient = new QueryClient();
  const wrapper = mount(TimeEntriesView, {
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
  mocks.members.mockImplementation(async (_project, purpose) => purpose === 'create' ? [active] : [past, active]);
  mocks.tasks.mockResolvedValue([]);
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
    expect(mocks.members).toHaveBeenCalledTimes(2);
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
    const { wrapper } = render();
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

    resolve(freshPage);
    await flushPromises();

    const rowsAfter = wrapper.findAll('tbody tr');
    expect(rowsAfter[0]?.element).toBe(rowsBefore[1]);
    expect(rowsAfter[1]?.element).toBe(rowsBefore[2]);
    expect(rowsAfter[2]?.element).toBe(rowsBefore[0]);
    expect(rowsAfter[2]?.text()).toContain('16 Apr 2026');
    wrapper.unmount();
  });

  it('keeps the draft and refetches an invoice conflict after editing historical time', async () => {
    const { wrapper } = render();
    mocks.tasks.mockRejectedValue(new ApiError('Former member', { status: 422 }));
    mocks.update.mockRejectedValue(new ApiError('This entry is included in an invoice.', {
      status: 409,
      body: { statusCode: 409, error: 'Conflict', code: 'time_entry_invoiced', message: 'This entry is included in an invoice.' },
    }));
    await flushPromises();

    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('#managed-entry-member').attributes('readonly')).toBeDefined();
    expect(wrapper.getComponent(ManagedEntryDialog).text()).toContain('Historical task');
    await wrapper.get('#managed-entry-description').setValue('Corrected note');
    mocks.list.mockResolvedValue(response([{ ...editable, invoiceId: 'invoice' }]));
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mocks.update).toHaveBeenCalledWith(alpha.id, editable.id, { description: 'Corrected note' });
    expect(wrapper.getComponent(ManagedEntryDialog).text()).toContain('This entry is included in an invoice.');
    expect((wrapper.get('#managed-entry-description').element as HTMLTextAreaElement).value).toBe('Corrected note');
    expect(wrapper.find('button[aria-label="Edit time entry for Historical task"]').exists()).toBe(false);
    expect(mocks.list).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('keeps an edit draft and the selected project when the record disappeared but access remains', async () => {
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    await flushPromises();
    await wrapper.get('#managed-entry-description').setValue('Keep my draft');
    mocks.update.mockRejectedValueOnce(new ApiError('Time entry not found', { status: 404 }));
    mocks.projects.mockResolvedValue([beta, alpha]);
    mocks.list.mockResolvedValue(response([]));
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.getComponent(ManagedEntryDialog).text()).toContain('Time entry not found');
    expect(wrapper.get<HTMLTextAreaElement>('#managed-entry-description').element.value).toBe('Keep my draft');
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe(alpha.name);
    expect(wrapper.text()).toContain('No time entries yet');
    expect(mocks.projects).toHaveBeenCalledTimes(2);
    expect(mocks.list).toHaveBeenLastCalledWith(alpha.id, 1, expect.anything());
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
    mocks.tasks.mockResolvedValueOnce([closed, available]).mockResolvedValue([available]);
    mocks.update.mockRejectedValueOnce(new ApiError('Task is ineligible', { status: 422 }));
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('button[aria-label="Edit time entry for Historical task"]').trigger('click');
    await flushPromises();
    const dialog = wrapper.getComponent(ManagedEntryDialog);
    const task = dialog.getComponent(Select);
    task.vm.$emit('update:modelValue', closed.id);
    await dialog.get('#managed-entry-description').setValue('Keep the description');
    await dialog.get('form').trigger('submit');
    await flushPromises();

    expect(dialog.text()).toContain('Task is ineligible');
    expect(dialog.get<HTMLTextAreaElement>('#managed-entry-description').element.value).toBe('Keep the description');
    expect(task.props('modelValue')).toBeUndefined();
    expect((task.props('options') ?? []).map(option => option.id)).toEqual([editable.taskId, available.id]);
    expect(mocks.tasks).toHaveBeenCalledTimes(2);
    await dialog.get('form').trigger('submit');
    expect(mocks.update).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('creates completed time for a selected member and applies the task billability default', async () => {
    const task = { id: 'new-task', title: 'Eligible task', defaultBillableForTimeEntries: true };
    const startedAt = editable.startedAt;
    const endedAt = editable.endedAt!;
    mocks.tasks.mockResolvedValue([task]);
    mocks.create.mockResolvedValue(editable);
    const { wrapper } = render();
    await flushPromises();

    const createButton = wrapper.get('button[aria-label="New time entry"]');
    expect(createButton.text()).toBe('');
    await createButton.trigger('click');
    const dialog = wrapper.getComponent(ManagedEntryDialog);
    const [member, taskField] = dialog.findAllComponents(Select);
    member?.vm.$emit('update:modelValue', active.id);
    await flushPromises();
    expect(mocks.tasks).toHaveBeenCalledWith(alpha.id, active.id, expect.any(Function));
    taskField?.vm.$emit('update:modelValue', task.id);
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

  it('restarts pagination and keeps historical member filters scoped to the selected project', async () => {
    mocks.list.mockResolvedValueOnce(response([editable], 21)).mockResolvedValue(response([], 21, 2));
    const { wrapper } = render();
    await flushPromises();

    await wrapper.get('button[aria-label="Next Page"]').trigger('click');
    await flushPromises();
    expect(mocks.list).toHaveBeenLastCalledWith(alpha.id, 2, expect.anything());

    const filter = wrapper.getComponent(Select);
    expect(filter.props('options')).toEqual(expect.arrayContaining([expect.objectContaining({ id: past.id })]));
    filter.vm.$emit('update:modelValue', past.id);
    await wrapper.get('input[aria-label="Search tasks"]').setValue('  historic ');
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
