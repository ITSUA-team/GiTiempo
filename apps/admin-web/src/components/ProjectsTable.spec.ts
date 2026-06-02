// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import type { ProjectListResponse, ProjectResponse } from '@gitiempo/shared';
import { ManagementTableShell } from '@gitiempo/web-shared';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';
import PrimeVue from 'primevue/config';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ProjectHoursFilter,
  ProjectsTableExpandedRows,
  ProjectsTableFilterOption,
  ProjectsTableFilters,
  ProjectsTableRow,
} from '@/components/projects-table';

import ProjectsTable from './ProjectsTable.vue';

const defaultFilters: ProjectsTableFilters = {
  global: '',
  hours: 'any',
  memberIds: [],
  projectQuery: '',
  source: null,
  visibility: null,
};

const sourceFilterOptions: ProjectsTableFilterOption<ProjectResponse['source']>[] = [
  { label: 'GitHub Repo', value: 'github' },
  { label: 'Manual', value: 'manual' },
];

const hoursFilterOptions: ProjectsTableFilterOption<ProjectHoursFilter>[] = [
  { label: 'Any', value: 'any' },
  { label: 'Tracked', value: 'tracked' },
  { label: '40h+', value: 'gte40' },
  { label: 'No hours', value: 'zero' },
];

const visibilityFilterOptions: ProjectsTableFilterOption<ProjectResponse['visibility']>[] = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
];

const memberFilterOptions: ProjectsTableFilterOption[] = [
  { label: 'Alex Admin', value: 'user-1' },
  { label: 'Pat PM', value: 'user-2' },
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

function createProjects(): ProjectListResponse {
  return [
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      description: null,
      id: 'project-active',
      isActive: true,
      members: [],
      name: 'Project Orion',
      source: 'github',
      totalHours: 148,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'public',
      workspaceId: 'workspace-1',
    },
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      description: null,
      id: 'project-inactive',
      isActive: false,
      members: [],
      name: 'Legacy Project',
      source: 'manual',
      totalHours: 4,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'private',
      workspaceId: 'workspace-1',
    },
  ];
}

function createRows(projects = createProjects()): ProjectsTableRow[] {
  return projects.map((project) => ({
    assignedMembersLabel: `${project.members.length} members`,
    hoursLabel: `${project.totalHours}h`,
    id: project.id,
    isActive: project.isActive,
    name: project.name,
    nameClass: project.isActive ? 'text-text-dark' : 'text-text-muted',
    project,
    sourceLabel: project.source === 'github' ? 'GitHub Repo' : 'Manual',
    visibility: project.visibility,
    visibilityLabel: project.visibility === 'public' ? 'Public' : 'Private',
  }));
}

function mountProjectsTable(options: {
  expandedRows?: ProjectsTableExpandedRows;
  filters?: ProjectsTableFilters;
  isMobileViewport?: boolean;
  loading?: boolean;
  rows?: ProjectsTableRow[];
  slots?: Record<string, string>;
} = {}) {
  return mount(ProjectsTable, {
    props: {
      emptyDescription: 'No projects match the current filters.',
      expandedRows: options.expandedRows ?? {},
      filters: options.filters ?? defaultFilters,
      hoursFilterOptions,
      isMobileViewport: options.isMobileViewport ?? false,
      loading: options.loading ?? false,
      memberFilterOptions,
      rows: options.rows ?? createRows(),
      sourceFilterOptions,
      visibilityFilterOptions,
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

describe('ProjectsTable', () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  it('renders supplied rows with icon-only edit, archive, and unarchive actions', () => {
    const wrapper = mountProjectsTable();

    const editButton = wrapper.get('[data-testid="project-edit-project-active"]');
    const archiveButton = wrapper.get('[data-testid="project-archive-project-active"]');
    const unarchiveButton = wrapper.get('[data-testid="project-unarchive-project-inactive"]');

    expect(editButton.attributes('aria-label')).toBe('Edit');
    expect(editButton.text()).toBe('');
    expect(archiveButton.attributes('aria-label')).toBe('Archive');
    expect(archiveButton.attributes('data-tooltip')).toBe('Archive');
    expect(archiveButton.text()).toBe('');
    expect(unarchiveButton.attributes('aria-label')).toBe('Unarchive');
    expect(unarchiveButton.text()).toBe('');
    expect(wrapper.findAll('[data-testid="project-mobile-card"]')).toHaveLength(0);
  });

  it('emits filter updates without deriving or mutating the supplied rows', async () => {
    const wrapper = mountProjectsTable();

    expect(wrapper.get('input[aria-label="Search projects"]').attributes('placeholder')).toBe(
      'Search projects',
    );
    expect(wrapper.get('input[aria-label="Filter projects by name"]').attributes('placeholder')).toBe(
      'Filter project',
    );
    expect(wrapper.text()).toContain('All sources');
    expect(wrapper.text()).toContain('All members');
    expect(wrapper.text()).toContain('Any');
    expect(wrapper.text()).toContain('All');

    await wrapper.get('input[aria-label="Search projects"]').setValue('archived');
    await wrapper.get('input[aria-label="Filter projects by name"]').setValue('billing');

    const selectFilters = wrapper.findAllComponents(Select);
    await selectFilters[0]!.vm.$emit('update:modelValue', 'manual');
    await wrapper.findComponent(MultiSelect).vm.$emit('update:modelValue', ['user-2']);
    await selectFilters[1]!.vm.$emit('update:modelValue', 'zero');
    await selectFilters[2]!.vm.$emit('update:modelValue', 'private');

    expect(wrapper.emitted('update:filters')).toEqual([
      [{ ...defaultFilters, global: 'archived' }],
      [{ ...defaultFilters, projectQuery: 'billing' }],
      [{ ...defaultFilters, source: 'manual' }],
      [{ ...defaultFilters, memberIds: ['user-2'] }],
      [{ ...defaultFilters, hours: 'zero' }],
      [{ ...defaultFilters, visibility: 'private' }],
    ]);
    expect(wrapper.getComponent(ManagementTableShell).props('value')).toEqual(createRows());
  });

  it('emits expanded row updates from the table shell contract', async () => {
    const wrapper = mountProjectsTable();

    await wrapper
      .getComponent(ManagementTableShell)
      .vm.$emit('update:expandedRows', { 'project-active': true });

    expect(wrapper.emitted('update:expandedRows')).toEqual([[{ 'project-active': true }]]);
  });

  it('renders mobile loading cards only on mobile viewports', () => {
    const wrapper = mountProjectsTable({
      isMobileViewport: true,
      loading: true,
      rows: [createRows()[0]!],
    });

    expect(wrapper.findAll('[data-testid="projects-mobile-loading-card"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="project-mobile-card"]')).toHaveLength(0);
    expect(wrapper.findAll('[data-testid="project-edit-project-active"]')).toHaveLength(0);
  });

  it('renders supplied mobile card fields, actions, and expansion slot content', async () => {
    const activeProject = createProjects()[0]!;
    const archivedProject = createProjects()[1]!;
    const rows = createRows([activeProject, archivedProject]);
    const wrapper = mountProjectsTable({
      isMobileViewport: true,
      rows,
      slots: {
        'row-expansion': '<template #row-expansion="{ row }"><div data-testid="row-expansion">{{ row.name }}</div></template>',
      },
    });

    const mobileCards = wrapper.findAll('[data-testid="project-mobile-card"]');

    expect(mobileCards).toHaveLength(2);
    expect(mobileCards[0]?.text()).toContain('Project Orion');
    expect(mobileCards[0]?.text()).toContain('GitHub Repo');
    expect(mobileCards[0]?.text()).toContain('Public');
    expect(mobileCards[0]?.text()).toContain('148h');
    expect(mobileCards[1]?.text()).toContain('Legacy Project');
    expect(mobileCards[1]?.text()).toContain('Private');
    expect(wrapper.get('[data-testid="row-expansion"]').text()).toBe('Project Orion');

    await wrapper.get('[data-testid="project-mobile-edit-project-active"]').trigger('click');
    await wrapper.get('[data-testid="project-mobile-archive-project-active"]').trigger('click');
    await wrapper.get('[data-testid="project-mobile-unarchive-project-inactive"]').trigger('click');

    expect(wrapper.emitted('edit-project')).toEqual([[activeProject]]);
    expect(wrapper.emitted('archive')).toEqual([[activeProject]]);
    expect(wrapper.emitted('unarchive')).toEqual([[archivedProject]]);
  });

  it('emits desktop row action intents without opening local edit forms', async () => {
    const activeProject = createProjects()[0]!;
    const archivedProject = createProjects()[1]!;
    const wrapper = mountProjectsTable({ rows: createRows([activeProject, archivedProject]) });

    await wrapper.get('[data-testid="project-edit-project-active"]').trigger('click');
    await wrapper.get('[data-testid="project-archive-project-active"]').trigger('click');
    await wrapper.get('[data-testid="project-unarchive-project-inactive"]').trigger('click');

    expect(wrapper.emitted('edit-project')).toEqual([[activeProject]]);
    expect(wrapper.emitted('archive')).toEqual([[activeProject]]);
    expect(wrapper.emitted('unarchive')).toEqual([[archivedProject]]);
    expect(wrapper.find('[data-testid="project-edit-form"]').exists()).toBe(false);
  });
});
