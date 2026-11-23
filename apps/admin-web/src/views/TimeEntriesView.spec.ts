import { WorkspaceRoles, type TimeEntryResponse } from '@gitiempo/shared';
import type * as SharedUi from '@gitiempo/web-shared';
import { ApiError } from '@gitiempo/web-shared/http';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';

import ManagedEntryDialog from '@/components/time-entries/ManagedEntryDialog.vue';
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
  const wrapper = mount(TimeEntriesView, {
    global: {
      directives: { tooltip: {} },
      plugins: [pinia, PrimeVue, ConfirmationService],
      stubs: { AppDialog: dialogStub },
    },
  });
  return { wrapper, auth };
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
