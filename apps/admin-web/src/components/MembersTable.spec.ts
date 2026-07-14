// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import type {
  WorkspaceMemberListResponse,
  WorkspaceRole,
} from '@gitiempo/shared';
import { ManagementTableShell } from '@gitiempo/web-shared';
import {
  giTiempoPrimeVueOptions,
  giTiempoSelfAppendedAutoCompleteOverlayStyle,
} from '@gitiempo/web-config/theme';
import AutoComplete from 'primevue/autocomplete';
import PrimeVue from 'primevue/config';
import Select from 'primevue/select';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MemberLastActiveFilter,
  MembersTableExpandedRows,
  MembersTableFilterOption,
  MembersTableFilters,
  MembersTableRow,
} from '@/lib/members-table';

import MembersTable from './MembersTable.vue';

type AutoCompletePt = {
  overlay?: {
    class?: string;
    style?: unknown;
  };
};

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

function mountMembersTable(options: {
  expandedRows?: MembersTableExpandedRows;
  filters?: MembersTableFilters;
  isMobileViewport?: boolean;
  loading?: boolean;
  rows?: MembersTableRow[];
  slots?: Record<string, string>;
} = {}) {
  return mount(MembersTable, {
    props: {
      emptyDescription: 'No members match the current filters.',
      expandedRows: options.expandedRows ?? {},
      filters: options.filters ?? defaultFilters,
      isMobileViewport: options.isMobileViewport ?? false,
      lastActiveFilterOptions,
      loading: options.loading ?? false,
      projectFilterOptions,
      roleFilterOptions,
      rows: options.rows ?? createRows(),
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

  it('uses member name as the edit entry point without an actions column', async () => {
    const row = createRows()[0]!;
    const wrapper = mountMembersTable({ rows: createRows() });
    const tableShell = wrapper.getComponent(ManagementTableShell);

    expect(
      tableShell
        .props('columns')
        .map((column) => column.label),
    ).toEqual(['Member', 'Role', 'Projects Assigned', 'Last Active']);
    expect(tableShell.props('bodyRowClass')).toBe(
      'border-divider h-[56px] border-b transition-colors last:border-b-0 hover:bg-app-bg',
    );

    const nameButton = wrapper.get('[data-testid="member-name-member-1"]');

    expect(nameButton.attributes('aria-label')).toBe('Edit member Pat PM');
    expect(nameButton.classes()).not.toContain('p-button-link');
    expect(nameButton.classes()).toEqual(
      expect.arrayContaining(['text-brand', 'text-[14px]', 'font-semibold', 'leading-none']),
    );
    expect(wrapper.get('[data-testid="member-role-member-1"]').classes()).toEqual(
      expect.arrayContaining(['text-brand', 'text-[13px]', 'font-semibold']),
    );
    expect(wrapper.get('[data-testid="member-role-member-2"]').classes()).toEqual(
      expect.arrayContaining(['text-text-dark', 'text-[13px]', 'font-medium']),
    );
    expect(wrapper.find('[data-testid="member-assign-pm-member-1"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="member-edit-member-1"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="member-remove-member-1"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="member-mobile-card"]')).toHaveLength(0);

    await nameButton.trigger('click');

    expect(wrapper.emitted('edit-member')).toEqual([[row.member]]);
  });

  it('emits filter updates without deriving or mutating the supplied rows', async () => {
    const wrapper = mountMembersTable();

    expect(wrapper.get('input[aria-label="Search members"]').attributes('placeholder')).toBe(
      'Search members',
    );
    expect(
      wrapper.get('input[aria-label="Filter members by name or email"]').attributes('placeholder'),
    ).toBe('Filter name or email');
    expect(wrapper.text()).toContain('All roles');
    expect(wrapper.text()).toContain('Any activity');

    const autoCompleteFilters = wrapper.findAllComponents(AutoComplete);
    const memberQueryFilter = autoCompleteFilters[0]!;
    const projectFilter = autoCompleteFilters[1]!;

    expect(autoCompleteFilters).toHaveLength(2);
    expect(wrapper.findComponent({ name: 'MultiSelect' }).exists()).toBe(false);
    expect(memberQueryFilter.props('dropdown')).toBe(true);
    expect(memberQueryFilter.props('dropdownMode')).toBe('blank');
    expect(memberQueryFilter.props('completeOnFocus')).toBe(true);
    expect(memberQueryFilter.props('appendTo')).not.toBe('self');
    expect((memberQueryFilter.props('pt') as AutoCompletePt).overlay).toEqual({
      class: 'overflow-hidden',
    });
    expect(projectFilter.props('multiple')).toBe(true);
    expect(projectFilter.props('dropdown')).toBe(true);
    expect(projectFilter.props('dropdownMode')).toBe('blank');
    expect(projectFilter.props('forceSelection')).toBe(true);
    expect(projectFilter.props('completeOnFocus')).toBe(true);
    expect(projectFilter.props('modelValue')).toEqual([]);
    expect(projectFilter.props('placeholder')).toBe('All projects');
    expect((projectFilter.props('optionLabel') as (projectId: string) => string)('project-1')).toBe(
      'Project Orion',
    );

    memberQueryFilter.vm.$emit('complete', { query: '' });
    projectFilter.vm.$emit('complete', { query: '' });
    await nextTick();

    expect(memberQueryFilter.props('suggestions')).toEqual(
      expect.arrayContaining(['Pat PM', 'pat@example.com', 'Alex Admin', 'alex@example.com']),
    );
    expect(projectFilter.props('suggestions')).toEqual(['project-2', 'project-1']);

    memberQueryFilter.vm.$emit('complete', { query: 'pat' });
    projectFilter.vm.$emit('complete', { query: 'orion' });
    await nextTick();

    expect(memberQueryFilter.props('suggestions')).toEqual(
      expect.arrayContaining(['Pat PM', 'pat@example.com']),
    );
    expect(projectFilter.props('suggestions')).toEqual(['project-1']);

    await wrapper.get('input[aria-label="Search members"]').setValue('orion');
    memberQueryFilter.vm.$emit('update:modelValue', 'pat');

    const selectFilters = wrapper.findAllComponents(Select);
    await selectFilters[0]!.vm.$emit('update:modelValue', 'admin');
    await selectFilters[1]!.vm.$emit('update:modelValue', 'inactive');
    await projectFilter.vm.$emit('update:modelValue', ['project-1', 'project-2']);

    expect(wrapper.emitted('update:filters')).toEqual([
      [{ global: 'orion' }],
      [{ memberQuery: 'pat' }],
      [{ role: 'admin' }],
      [{ lastActive: 'inactive' }],
      [{ projectIds: ['project-1', 'project-2'] }],
    ]);
    expect(
      wrapper.getComponent(ManagementTableShell).props('value'),
    ).toEqual(createRows());
  });

  it('places the invite action in the table header beside search', async () => {
    const wrapper = mountMembersTable();
    const search = wrapper.get('input[aria-label="Search members"]');
    const inviteButton = wrapper.get('[data-testid="members-table-invite"]');

    expect(inviteButton.attributes('aria-label')).toBe('Invite member');
    expect(inviteButton.attributes('data-tooltip')).toBe('Invite member');
    expect(inviteButton.text()).toBe('');
    expect(inviteButton.element.parentElement?.contains(search.element)).toBe(true);

    await inviteButton.trigger('click');

    expect(wrapper.emitted('invite-member')).toEqual([[]]);
  });

  it('emits expanded row updates from the table shell contract', async () => {
    const wrapper = mountMembersTable();

    await wrapper
      .getComponent(ManagementTableShell)
      .vm.$emit('update:expandedRows', { 'member-1': true });

    expect(wrapper.emitted('update:expandedRows')).toEqual([[{ 'member-1': true }]]);
  });

  it('keeps loaded mobile member cards visible during refresh loading', async () => {
    const wrapper = mountMembersTable({
      isMobileViewport: true,
      loading: true,
      rows: [createRows()[0]!],
    });

    const autoCompleteFilters = wrapper.findAllComponents(AutoComplete);
    const memberQueryFilter = autoCompleteFilters[0]!;
    const projectFilter = autoCompleteFilters[1]!;

    expect(autoCompleteFilters).toHaveLength(2);
    expect(wrapper.findComponent({ name: 'MultiSelect' }).exists()).toBe(false);

    expect(memberQueryFilter.props('placeholder')).toBe('Filter name or email');
    expect(memberQueryFilter.props('appendTo')).toBe('self');
    expect((memberQueryFilter.props('pt') as AutoCompletePt).overlay?.style).toEqual(
      giTiempoSelfAppendedAutoCompleteOverlayStyle,
    );
    expect(projectFilter.props('appendTo')).toBe('self');
    expect(projectFilter.props('multiple')).toBe(true);
    expect(projectFilter.props('dropdownMode')).toBe('blank');
    expect((projectFilter.props('pt') as AutoCompletePt).overlay?.style).toEqual(
      giTiempoSelfAppendedAutoCompleteOverlayStyle,
    );
    expect(projectFilter.props('placeholder')).toBe('All projects');

    await memberQueryFilter.vm.$emit('update:modelValue', 'alex');
    await projectFilter.vm.$emit('update:modelValue', ['project-2', 'project-1']);

    expect(wrapper.emitted('update:filters')).toEqual([
      [{ memberQuery: 'alex' }],
      [{ projectIds: ['project-2', 'project-1'] }],
    ]);
    expect(wrapper.findAll('[data-testid="members-mobile-loading-card"]')).toHaveLength(0);
    expect(wrapper.findAll('[data-testid="member-mobile-card"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('Pat PM');
    expect(wrapper.findAll('[data-testid="member-edit-member-1"]')).toHaveLength(0);
  });

  it('renders mobile loading cards when loading has no member rows yet', () => {
    const wrapper = mountMembersTable({
      isMobileViewport: true,
      loading: true,
      rows: [],
    });

    expect(wrapper.findAll('[data-testid="members-mobile-loading-card"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="member-mobile-card"]')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('No members found');
  });

  it('renders supplied mobile card fields, name edit entry point, and expansion slot content', async () => {
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

    expect(wrapper.find('[data-testid="member-mobile-assign-pm-member-1"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="member-mobile-edit-member-1"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="member-mobile-remove-member-1"]').exists()).toBe(false);

    const mobileNameButton = wrapper.get('[data-testid="member-mobile-name-member-1"]');

    expect(mobileNameButton.classes()).not.toContain('p-button-link');
    expect(mobileNameButton.classes()).toEqual(
      expect.arrayContaining(['text-brand', 'text-[15px]', 'font-semibold', 'leading-none']),
    );

    await mobileNameButton.trigger('click');

    expect(wrapper.emitted('edit-member')).toEqual([[row.member]]);
  });

  it('emits desktop edit intent from the member name without opening local panels', async () => {
    const row = createRows()[0]!;
    const wrapper = mountMembersTable({ rows: [row] });

    await wrapper.get('[data-testid="member-name-member-1"]').trigger('click');

    expect(wrapper.emitted('edit-member')).toEqual([[row.member]]);
    expect(wrapper.find('[data-testid="assign-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="edit-panel"]').exists()).toBe(false);
  });

  it('renders unmanaged rows with static names and no row actions', () => {
    const wrapper = mountMembersTable({ rows: [createRows()[1]!] });

    expect(wrapper.find('[data-testid="member-name-member-2"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Alex Admin');
    expect(wrapper.find('[data-testid="member-assign-pm-member-2"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="member-edit-member-2"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="member-remove-member-2"]').exists()).toBe(false);
  });
});
