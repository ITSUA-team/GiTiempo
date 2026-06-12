// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { ProjectListResponse, ProjectResponse } from '@gitiempo/shared';
import { ManagementTableShell } from '@gitiempo/web-shared';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';
import AutoComplete from 'primevue/autocomplete';
import MultiSelect from 'primevue/multiselect';
import PrimeVue from 'primevue/config';
import Select from 'primevue/select';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ProjectHoursFilter,
  ProjectsTableExpandedRows,
  ProjectsTableFilterOption,
  ProjectsTableFilters,
  ProjectsTableRow,
} from '@/lib/projects-table';

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
      totalSeconds: 532800,
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
      totalSeconds: 14400,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'private',
      workspaceId: 'workspace-1',
    },
  ];
}

function createRows(projects = createProjects()): ProjectsTableRow[] {
  return projects.map((project) => ({
    assignedMembersLabel: `${project.members.length} members`,
    hoursLabel: `${project.totalSeconds / 3600}h`,
    id: project.id,
    isActive: project.isActive,
    name: project.name,
    nameClass: 'text-brand',
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

  it('uses project names as edit entry points without an actions column', async () => {
    const activeProject = createProjects()[0]!;
    const archivedProject = createProjects()[1]!;
    const wrapper = mountProjectsTable();

    expect(
      wrapper
        .getComponent(ManagementTableShell)
        .props('columns')
        .map((column) => column.label),
    ).toEqual(['Project', 'Source', 'Assigned members', 'Hours', 'Visibility']);

    const activeName = wrapper.get('[data-testid="project-name-project-active"]');
    const archivedName = wrapper.get('[data-testid="project-name-project-inactive"]');

    expect(activeName.attributes('aria-label')).toBe('Edit project Project Orion');
    expect(archivedName.attributes('aria-label')).toBe('Edit project Legacy Project');
    expect(wrapper.find('[data-testid="project-archive-project-active"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="project-unarchive-project-inactive"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="project-mobile-card"]')).toHaveLength(0);

    await activeName.trigger('click');
    await archivedName.trigger('click');

    expect(wrapper.emitted('edit-project')).toEqual([[activeProject], [archivedProject]]);
  });

  it('renders supplied readable duration labels without deriving decimal hours', () => {
    const project = {
      ...createProjects()[0]!,
      totalSeconds: 139980,
    };
    const row = {
      ...createRows([project])[0]!,
      hoursLabel: '38h 53m',
    };

    const wrapper = mountProjectsTable({ rows: [row] });

    expect(wrapper.text()).toContain('38h 53m');
    expect(wrapper.text()).not.toContain('38.8888');
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
    expect(wrapper.text()).toContain('Any');
    expect(wrapper.text()).toContain('All');

    const autoCompleteFilters = wrapper.findAllComponents(AutoComplete);
    const projectQueryFilter = autoCompleteFilters[0]!;
    const memberFilter = wrapper.getComponent(MultiSelect);

    expect(autoCompleteFilters).toHaveLength(1);
    expect(projectQueryFilter.props('dropdown')).toBe(true);
    expect(projectQueryFilter.props('completeOnFocus')).toBe(true);
    expect(memberFilter.props('display')).toBe('chip');
    expect(memberFilter.props('filter')).toBe(true);
    expect(memberFilter.props('modelValue')).toEqual([]);
    expect(memberFilter.props('placeholder')).toBe('All members');

    projectQueryFilter.vm.$emit('complete', { query: 'orion' });
    await nextTick();

    expect(wrapper.getComponent(AutoComplete).props('suggestions')).toEqual([
      'Project Orion',
    ]);

    await wrapper.get('input[aria-label="Search projects"]').setValue('archived');
    projectQueryFilter.vm.$emit('update:modelValue', 'billing');

    const selectFilters = wrapper.findAllComponents(Select);
    await selectFilters[0]!.vm.$emit('update:modelValue', 'manual');
    await memberFilter.vm.$emit('update:modelValue', ['user-2', 'user-1']);
    await selectFilters[1]!.vm.$emit('update:modelValue', 'zero');
    await selectFilters[2]!.vm.$emit('update:modelValue', 'private');

    expect(wrapper.emitted('update:filters')).toEqual([
      [{ global: 'archived' }],
      [{ projectQuery: 'billing' }],
      [{ source: 'manual' }],
      [{ memberIds: ['user-2', 'user-1'] }],
      [{ hours: 'zero' }],
      [{ visibility: 'private' }],
    ]);
    expect(wrapper.getComponent(ManagementTableShell).props('value')).toEqual(createRows());
  });

  it('emits expanded row updates from the table shell contract', async () => {
    const wrapper = mountProjectsTable();

    await wrapper
      .getComponent(ManagementTableShell)
      .vm.$emit('update:expandedRows', { 'project-active': true });

    expect(wrapper.emitted('update:expandedRows')).toEqual([[
      { 'project-active': true },
    ]]);
  });

  it('renders mobile loading cards only on mobile viewports', async () => {
    const wrapper = mountProjectsTable({
      isMobileViewport: true,
      loading: true,
      rows: [createRows()[0]!],
    });

    const autoCompleteFilters = wrapper.findAllComponents(AutoComplete);
    const projectQueryFilter = autoCompleteFilters[0]!;
    const memberFilter = wrapper.getComponent(MultiSelect);

    expect(projectQueryFilter.props('placeholder')).toBe('Filter project');
    expect(memberFilter.props('placeholder')).toBe('All members');

    await projectQueryFilter.vm.$emit('update:modelValue', 'legacy');
    await memberFilter.vm.$emit('update:modelValue', ['user-1', 'user-2']);

    expect(wrapper.emitted('update:filters')).toEqual([
      [{ projectQuery: 'legacy' }],
      [{ memberIds: ['user-1', 'user-2'] }],
    ]);
    expect(wrapper.findAll('[data-testid="projects-mobile-loading-card"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="project-mobile-card"]')).toHaveLength(0);
    expect(wrapper.findAll('[data-testid="project-edit-project-active"]')).toHaveLength(0);
  });

  it('renders supplied mobile card fields, name edit entry points, and expansion slot content', async () => {
    const activeProject = createProjects()[0]!;
    const archivedProject = createProjects()[1]!;
    const rows = [
      {
        ...createRows([activeProject])[0]!,
        hoursLabel: '12h 30m',
      },
      createRows([archivedProject])[0]!,
    ];
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
    expect(mobileCards[0]?.text()).toContain('12h 30m');
    expect(mobileCards[1]?.text()).toContain('Legacy Project');
    expect(mobileCards[1]?.text()).toContain('Private');
    expect(wrapper.get('[data-testid="row-expansion"]').text()).toBe('Project Orion');

    expect(wrapper.find('[data-testid="project-mobile-edit-project-active"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="project-mobile-archive-project-active"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="project-mobile-unarchive-project-inactive"]').exists()).toBe(false);

    await wrapper.get('[data-testid="project-mobile-name-project-active"]').trigger('click');
    await wrapper.get('[data-testid="project-mobile-name-project-inactive"]').trigger('click');

    expect(wrapper.emitted('edit-project')).toEqual([[activeProject], [archivedProject]]);
  });

  it('emits desktop edit intents from project names without opening local edit forms', async () => {
    const activeProject = createProjects()[0]!;
    const archivedProject = createProjects()[1]!;
    const wrapper = mountProjectsTable({ rows: createRows([activeProject, archivedProject]) });

    await wrapper.get('[data-testid="project-name-project-active"]').trigger('click');
    await wrapper.get('[data-testid="project-name-project-inactive"]').trigger('click');

    expect(wrapper.emitted('edit-project')).toEqual([[activeProject], [archivedProject]]);
    expect(wrapper.find('[data-testid="project-edit-form"]').exists()).toBe(false);
  });
});
