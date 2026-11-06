import { flushPromises, mount } from '@vue/test-utils';
import type {
  ProjectListResponse,
  WorkspaceMemberResponse,
} from '@gitiempo/shared';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';
import PrimeVue from 'primevue/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MemberEditForm from './MemberEditForm.vue';

const member: WorkspaceMemberResponse = {
  id: 'member-1',
  userId: 'user-1',
  workspaceId: 'workspace-1',
  displayName: 'Alice',
  email: 'alice@example.com',
  avatarUrl: null,
  role: 'pm',
  canViewInvoices: false,
  projectsAssignedCount: 2,
  joinedAt: '2026-05-01T10:00:00.000Z',
  lastActiveAt: null,
};
const projects: ProjectListResponse = [
  'Internal Platform',
  'Demo Client',
  'QA513',
].map((name, index) => ({
  id: `project-${index}`,
  name,
  workspaceId: 'workspace-1',
  isActive: true,
  color: null,
  description: null,
  source: 'manual',
  visibility: 'public',
  trackingMode: 'managed',
  accessScope: 'project',
  capabilities: { canManageTasks: true },
  referenceProvenance: null,
  timeRoundingStepMinutes: null,
  defaultBillableForTasks: true,
  totalSeconds: 0,
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
  members:
    index < 2
      ? [
          {
            userId: member.userId,
            displayName: member.displayName,
            email: member.email,
            avatarUrl: null,
            role: 'pm',
          },
        ]
      : [],
}));

function renderForm(saving = false) {
  return mount(MemberEditForm, {
    attachTo: document.body,
    props: { member, projects, canAssignPm: true, saving },
    global: { plugins: [[PrimeVue, giTiempoPrimeVueOptions]] },
  });
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('MemberEditForm with real PrimeVue Form and AutoComplete', () => {
  it('does not submit or choose a project on Enter without a focused suggestion', async () => {
    vi.useFakeTimers();
    const wrapper = renderForm();
    const input = wrapper.get<HTMLInputElement>('input[role="combobox"]');
    await input.trigger('focus');
    await flushPromises();
    await vi.advanceTimersByTimeAsync(1);
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    input.element.dispatchEvent(enter);
    await flushPromises();
    expect(enter.defaultPrevented).toBe(true);
    expect(wrapper.emitted('save')).toBeUndefined();
    expect(wrapper.findAll('[data-pc-section="chipitem"]')).toHaveLength(2);
    wrapper.unmount();
  });

  it.each(['Enter', 'Space'])(
    'preserves native dropdown button %s activation',
    async (code) => {
      const wrapper = renderForm();
      const dropdown = wrapper.get('[data-pc-section="dropdown"]');
      const keydown = new KeyboardEvent('keydown', {
        key: code === 'Space' ? ' ' : code,
        code,
        bubbles: true,
        cancelable: true,
      });
      dropdown.element.dispatchEvent(keydown);
      expect(keydown.defaultPrevented).toBe(false);
      await dropdown.trigger('click');
      await flushPromises();
      expect(
        wrapper.get('input[role="combobox"]').attributes('aria-expanded'),
      ).toBe('true');
      wrapper.unmount();
    },
  );

  it('does not submit while the filtered suggestions are still pending', async () => {
    vi.useFakeTimers();
    const wrapper = renderForm();
    const input = wrapper.get<HTMLInputElement>('input[role="combobox"]');
    await input.trigger('focus');
    await flushPromises();
    input.element.value = 'QA';
    await input.trigger('input');
    expect(wrapper.find('[role="option"][aria-label="QA513"]').exists()).toBe(
      true,
    );
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    await vi.advanceTimersByTimeAsync(1);
    input.element.dispatchEvent(enter);
    await flushPromises();
    expect(enter.defaultPrevented).toBe(true);
    expect(wrapper.emitted('save')).toBeUndefined();
    expect(wrapper.findAll('[data-pc-section="chipitem"]')).toHaveLength(2);
    wrapper.unmount();
  });
  it('does not select a suggestion when leaving the search with Tab', async () => {
    vi.useFakeTimers();
    const wrapper = renderForm();
    const input = wrapper.get<HTMLInputElement>('input[role="combobox"]');
    await input.trigger('focus');
    input.element.value = 'QA';
    await input.trigger('input');
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    await input.trigger('keydown', { key: 'Tab', code: 'Tab' });
    await flushPromises();
    expect(wrapper.findAll('[data-pc-section="chipitem"]')).toHaveLength(2);
    wrapper.unmount();
  });

  it('selects an explicitly focused suggestion with Enter without submitting the form', async () => {
    vi.useFakeTimers();
    const wrapper = renderForm();
    const input = wrapper.get<HTMLInputElement>('input[role="combobox"]');
    await input.trigger('focus');
    input.element.value = 'QA';
    await input.trigger('input');
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    await input.trigger('keydown', { key: 'ArrowDown', code: 'ArrowDown' });
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    await vi.advanceTimersByTimeAsync(1);
    input.element.dispatchEvent(enter);
    await flushPromises();
    expect(enter.defaultPrevented).toBe(true);
    expect(wrapper.emitted('save')).toBeUndefined();
    expect(
      wrapper
        .findAll('[data-pc-section="chipitem"]')
        .map((chip) => chip.text()),
    ).toEqual(['Internal Platform', 'Demo Client', 'QA513']);
    wrapper.unmount();
  });
  it('adds a suggestion to the existing chips and submits all project IDs', async () => {
    vi.useFakeTimers();
    const wrapper = renderForm();
    await flushPromises();
    expect(
      wrapper
        .findAll('[data-pc-section="chipitem"]')
        .map((chip) => chip.text()),
    ).toEqual(['Internal Platform', 'Demo Client']);
    await wrapper.get('input[role="combobox"]').trigger('focus');
    const input = wrapper.get<HTMLInputElement>('input[role="combobox"]');
    input.element.value = 'QA513';
    await input.trigger('input');
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    await wrapper.get('[role="option"][aria-label="QA513"]').trigger('click');
    await flushPromises();
    expect(
      wrapper
        .findAll('[data-pc-section="chipitem"]')
        .map((chip) => chip.text()),
    ).toEqual(['Internal Platform', 'Demo Client', 'QA513']);
    expect(
      wrapper.get<HTMLInputElement>('input[role="combobox"]').element.value,
    ).toBe('');
    await input.trigger('focus');
    await flushPromises();
    await wrapper.get('[role="option"][aria-label="QA513"]').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('[data-pc-section="chipitem"]')).toHaveLength(3);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('save')).toEqual([
      [{ projectIds: ['project-0', 'project-1', 'project-2'] }],
    ]);
    wrapper.unmount();
  });

  it('submits chip removals while preserving the other initial assignment', async () => {
    const wrapper = renderForm();
    await flushPromises();
    await wrapper
      .get(
        '[data-pc-section="chipitem"][aria-label="Internal Platform"] [data-pc-section="removeicon"]',
      )
      .trigger('click');
    await flushPromises();
    expect(
      wrapper
        .findAll('[data-pc-section="chipitem"]')
        .map((chip) => chip.text()),
    ).toEqual(['Demo Client']);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('save')).toEqual([[{ projectIds: ['project-1'] }]]);
    wrapper.unmount();
  });

  it('keeps the assignment edit when member and project data refresh after a permission toggle', async () => {
    const wrapper = renderForm();
    await wrapper.get('input[role="combobox"]').trigger('focus');
    await flushPromises();
    await wrapper.get('[role="option"][aria-label="QA513"]').trigger('click');
    await wrapper.get('input[type="checkbox"]').setValue(true);
    expect(wrapper.emitted('update:canViewInvoices')).toEqual([[true]]);
    await wrapper.setProps({
      member: { ...member, canViewInvoices: true },
      projects: structuredClone(projects),
    });
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('save')).toEqual([
      [{ projectIds: ['project-0', 'project-1', 'project-2'] }],
    ]);
    wrapper.unmount();
  });

  it('disables project input and rejects submission while saving', async () => {
    const wrapper = renderForm(true);
    expect(
      wrapper.get<HTMLInputElement>('input[role="combobox"]').element.disabled,
    ).toBe(true);
    expect(
      wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled,
    ).toBe(true);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('save')).toBeUndefined();
    wrapper.unmount();
  });
});
