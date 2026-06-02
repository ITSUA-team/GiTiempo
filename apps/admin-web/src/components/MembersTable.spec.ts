// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import type {
  WorkspaceMemberListResponse,
  WorkspaceRole,
} from '@gitiempo/shared';
import { ManagementTableShell } from '@gitiempo/web-shared';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';
import PrimeVue from 'primevue/config';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MemberLastActiveFilter,
  MembersTableExpandedRows,
  MembersTableExpandedRowsSetter,
  MembersTableFilterHandlers,
  MembersTableFilterOption,
  MembersTableFilters,
  MembersTableRow,
} from '@/lib/members-table';

import MembersTable from './MembersTable.vue';

const defaultFilters: MembersTableFilters = {
  global: '',
  lastActive: 'any',
  memberQuery: '',
  projectIds: [],
  role: null,
};

const roleFilterOptions: MembersTableFilterOption<WorkspaceRole>[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'PM', value: 'pm' },
  { label: 'Member', value: 'member' },
];

const lastActiveFilterOptions: MembersTableFilterOption<MemberLastActiveFilter>[] = [
  { label: 'Any activity', value: 'any' },
  { label: 'Active today', value: 'today' },
  { label: 'Active this week', value: 'thisWeek' },
  { label: 'No activity', value: 'inactive' },
];

const projectFilterOptions: MembersTableFilterOption[] = [
  { label: 'Billing API', value: 'project-2' },
  { label: 'Project Orion', value: 'project-1' },
];

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
  return [
    {
      avatarUrl: null,
      displayName: 'Pat PM',
      email: 'pat@example.com',
      id: 'member-1',
      joinedAt: '2026-05-01T10:00:00.000Z',
      lastActiveAt: '2026-05-02T11:00:00.000Z',
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
  ];
}

function createRows(members = createMembers()): MembersTableRow[] {
  return members.map((member) => ({
    avatarImage: undefined,
    avatarLabel: member.displayName
      ?.split(/\s+/)
      .map((part) => part.charAt(0))
      .join(''),
    canAssignPm: member.role !== 'admin' && member.userId !== 'user-1',
    canManage: member.userId !== 'user-1',
    email: member.email,
    id: member.id,
    lastActiveLabel: member.lastActiveAt ? 'May 2, 2026' : 'Never',
    member,
    primaryLabel: member.displayName ?? member.email,
    projectsAssignedLabel: `${member.projectsAssignedCount} project`,
    roleLabel: member.role === 'pm' ? 'PM' : 'Admin',
    secondaryLabel: member.displayName ? member.email : null,
  }));
}

function createFilterHandlers(): MembersTableFilterHandlers {
  return {
    setGlobal: vi.fn(),
    setLastActive: vi.fn(),
    setMemberQuery: vi.fn(),
    setProjectIds: vi.fn(),
    setRole: vi.fn(),
  };
}

function mountMembersTable(options: {
  expandedRows?: MembersTableExpandedRows;
  filterHandlers?: MembersTableFilterHandlers;
  filters?: MembersTableFilters;
  isMobileViewport?: boolean;
  loading?: boolean;
  rows?: MembersTableRow[];
  setExpandedRows?: MembersTableExpandedRowsSetter;
  slots?: Record<string, string>;
} = {}) {
  return mount(MembersTable, {
    props: {
      emptyDescription: 'No members match the current filters.',
      expandedRows: options.expandedRows ?? {},
      filterHandlers: options.filterHandlers ?? createFilterHandlers(),
      filters: options.filters ?? defaultFilters,
      isMobileViewport: options.isMobileViewport ?? false,
      lastActiveFilterOptions,
      loading: options.loading ?? false,
      projectFilterOptions,
      roleFilterOptions,
      rows: options.rows ?? createRows(),
      setExpandedRows: options.setExpandedRows ?? vi.fn(),
    },
    slots: options.slots,
    global: {
      directives: {
        tooltip: {
          mounted(el, binding) {
            el.setAttribute('data-tooltip', String(binding.value));
          },
        },
      },
      plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
    },
  });
}

describe('MembersTable', () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  it('renders supplied rows with icon-only assign, edit, and remove actions', () => {
    const wrapper = mountMembersTable({ rows: [createRows()[0]!] });

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

  it('calls filter handlers without deriving or mutating the supplied rows', async () => {
    const filterHandlers = createFilterHandlers();
    const wrapper = mountMembersTable({ filterHandlers });

    expect(wrapper.get('input[aria-label="Search members"]').attributes('placeholder')).toBe(
      'Search members',
    );
    expect(
      wrapper.get('input[aria-label="Filter members by name or email"]').attributes('placeholder'),
    ).toBe('Filter name or email');
    expect(wrapper.text()).toContain('All roles');
    expect(wrapper.text()).toContain('All projects');
    expect(wrapper.text()).toContain('Any activity');

    await wrapper.get('input[aria-label="Search members"]').setValue('orion');
    await wrapper.get('input[aria-label="Filter members by name or email"]').setValue('pat');

    const selectFilters = wrapper.findAllComponents(Select);
    await selectFilters[0]!.vm.$emit('update:modelValue', 'admin');
    await selectFilters[1]!.vm.$emit('update:modelValue', 'inactive');
    await wrapper.findComponent(MultiSelect).vm.$emit('update:modelValue', ['project-1']);

    expect(filterHandlers.setGlobal).toHaveBeenCalledWith('orion');
    expect(filterHandlers.setMemberQuery).toHaveBeenCalledWith('pat');
    expect(filterHandlers.setRole).toHaveBeenCalledWith('admin');
    expect(filterHandlers.setLastActive).toHaveBeenCalledWith('inactive');
    expect(filterHandlers.setProjectIds).toHaveBeenCalledWith(['project-1']);
    expect(
      wrapper.getComponent(ManagementTableShell).props('value'),
    ).toEqual(createRows());
  });

  it('calls the expanded row setter from the table shell contract', async () => {
    const setExpandedRows: MembersTableExpandedRowsSetter = vi.fn();
    const wrapper = mountMembersTable({ setExpandedRows });

    await wrapper
      .getComponent(ManagementTableShell)
      .vm.$emit('update:expandedRows', { 'member-1': true });

    expect(setExpandedRows).toHaveBeenCalledWith({ 'member-1': true });
  });

  it('renders mobile loading cards only on mobile viewports', () => {
    const wrapper = mountMembersTable({
      isMobileViewport: true,
      loading: true,
      rows: [createRows()[0]!],
    });

    expect(wrapper.findAll('[data-testid="members-mobile-loading-card"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="member-mobile-card"]')).toHaveLength(0);
    expect(wrapper.findAll('[data-testid="member-edit-member-1"]')).toHaveLength(0);
  });

  it('renders supplied mobile card fields, actions, and expansion slot content', async () => {
    const row = createRows([createMembers()[0]!])[0]!;
    const wrapper = mountMembersTable({
      isMobileViewport: true,
      rows: [row],
      slots: {
        'row-expansion': '<template #row-expansion="{ row }"><div data-testid="row-expansion">{{ row.primaryLabel }}</div></template>',
      },
    });

    const mobileCards = wrapper.findAll('[data-testid="member-mobile-card"]');

    expect(mobileCards).toHaveLength(1);
    expect(mobileCards[0]?.text()).toContain('Pat PM');
    expect(mobileCards[0]?.text()).toContain('pat@example.com');
    expect(mobileCards[0]?.text()).toContain('PM');
    expect(mobileCards[0]?.text()).toContain('1 project');
    expect(mobileCards[0]?.text()).toContain('May 2, 2026');
    expect(wrapper.get('[data-testid="row-expansion"]').text()).toBe('Pat PM');

    await wrapper.get('[data-testid="member-mobile-assign-pm-member-1"]').trigger('click');
    await wrapper.get('[data-testid="member-mobile-edit-member-1"]').trigger('click');
    await wrapper.get('[data-testid="member-mobile-remove-member-1"]').trigger('click');

    expect(wrapper.emitted('assign-member')).toEqual([[row.member]]);
    expect(wrapper.emitted('edit-member')).toEqual([[row.member]]);
    expect(wrapper.emitted('remove-member')).toEqual([[row.member]]);
  });

  it('emits desktop row action intents without opening local panels', async () => {
    const row = createRows()[0]!;
    const wrapper = mountMembersTable({ rows: [row] });

    await wrapper.get('[data-testid="member-assign-pm-member-1"]').trigger('click');
    await wrapper.get('[data-testid="member-edit-member-1"]').trigger('click');
    await wrapper.get('[data-testid="member-remove-member-1"]').trigger('click');

    expect(wrapper.emitted('assign-member')).toEqual([[row.member]]);
    expect(wrapper.emitted('edit-member')).toEqual([[row.member]]);
    expect(wrapper.emitted('remove-member')).toEqual([[row.member]]);
    expect(wrapper.find('[data-testid="assign-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="edit-panel"]').exists()).toBe(false);
  });

  it('hides actions when the supplied row is not manageable', () => {
    const wrapper = mountMembersTable({ rows: [createRows()[1]!] });

    expect(wrapper.find('[data-testid="member-assign-pm-member-2"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="member-edit-member-2"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="member-remove-member-2"]').exists()).toBe(false);
  });
});
