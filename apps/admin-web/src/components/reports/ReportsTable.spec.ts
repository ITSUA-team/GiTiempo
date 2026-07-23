import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, reactive } from 'vue';
import AutoComplete from 'primevue/autocomplete';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  giTiempoPrimeVueOptions,
  giTiempoSelfAppendedAutoCompleteOverlayStyle,
} from '@gitiempo/web-config/theme';
import type { SavedReportPeriod } from '@gitiempo/shared';

import {
  createDefaultReportTableFilters,
  type ReportGrouping,
  type ReportTableRow,
} from '@/lib/report-view-model';
import ReportsTable from './ReportsTable.vue';

type AutoCompletePt = {
  overlay?: {
    class?: string;
    style?: unknown;
  };
};

const SelectStub = defineComponent({
  props: {
    modelValue: {
      default: undefined,
      type: [String, Number, Boolean, null],
    },
    optionLabel: {
      default: 'label',
      type: String,
    },
    optionValue: {
      default: 'value',
      type: String,
    },
    options: {
      default: () => [],
      type: Array,
    },
    placeholder: {
      default: undefined,
      type: String,
    },
  },
  emits: ['update:modelValue'],
  computed: {
    resolvedLabel(): string | undefined {
      const options = this.options as Record<string, unknown>[];
      const match = options.find(
        (option) => option?.[this.optionValue] === this.modelValue,
      );

      return (
        (match?.[this.optionLabel] as string | undefined) ?? this.placeholder
      );
    },
  },
  template: '<div data-testid="select-stub">{{ resolvedLabel }}</div>',
});

function findFilter(
  wrapper: ReturnType<typeof mount>,
  key: 'project' | 'member',
) {
  const control = wrapper
    .findAllComponents(AutoComplete)
    .find(
      (candidate) =>
        candidate.props('ariaLabel') === `Filter report rows by ${key}`,
    );

  if (!control) {
    throw new Error(`No ${key} filter rendered`);
  }

  return control;
}

function makeLeafRow(overrides: Partial<ReportTableRow>): ReportTableRow {
  return {
    billableSeconds: 3600,
    billableShare: 0.5,
    entryCount: 2,
    id: 'project-1:no-task:member-1',
    lastStartedAt: '2026-05-02T10:00:00.000Z',
    memberIds: ['member-1'],
    memberName: 'Alex Admin',
    nonBillableSeconds: 3600,
    projectIds: ['project-1'],
    projectName: 'Project Orion',
    taskId: null,
    taskName: null,
    totalSeconds: 7200,
    ...overrides,
  };
}

const rows: ReportTableRow[] = [makeLeafRow({})];

function mountTable({
  grouping = ['project'] as ReportGrouping,
  filters = createDefaultReportTableFilters(),
  loading = false,
  period = null as SavedReportPeriod | null,
  tableRows = rows,
  memberOptions = [{ label: 'Alex Admin', value: 'member-1' }],
  projectOptions = [{ label: 'Project Orion', value: 'project-1' }],
} = {}) {
  return mount(ReportsTable, {
    props: {
      dateRange: null,
      grouping,
      filters,
      loading,
      period,
      memberOptions,
      projectOptions,
      rows: tableRows,
    },
    global: {
      plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      stubs: {
        Select: SelectStub,
      },
    },
  });
}

function setMobileViewport(matches: boolean) {
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

describe('ReportsTable', () => {
  beforeEach(() => {
    setMobileViewport(false);
  });

  it('renders grouped report rows and exposes the global report-row search control', async () => {
    const filters = createDefaultReportTableFilters();
    const wrapper = mountTable({
      filters,
      grouping: ['project', 'member'],
      memberOptions: [
        { label: 'Alex Admin', value: 'member-1' },
        { label: 'Pat PM', value: 'member-2' },
      ],
      projectOptions: [
        { label: 'Project Orion', value: 'project-1' },
        { label: 'Billing API', value: 'project-2' },
      ],
    });

    expect(wrapper.text()).toContain('Results');
    expect(wrapper.text()).toContain('Project / Member');
    expect(wrapper.text()).toContain('Hours');
    expect(wrapper.text()).toContain('Billable');
    expect(wrapper.text()).toContain('Billable %');
    expect(wrapper.text()).toContain('Last activity');
    expect(wrapper.text()).toContain('Project Orion');
    expect(wrapper.text()).toContain('Alex Admin');
    expect(wrapper.text()).toContain('1 member');
    expect(wrapper.text()).toContain('Any');
    expect(wrapper.text()).toContain('2h 00m');
    expect(wrapper.text()).toContain('1h 00m');
    // hours/billable/billable-share/activity filters; the add-level control
    // carries its own testid
    expect(wrapper.findAll('[data-testid="select-stub"]')).toHaveLength(4);
    expect(
      wrapper.find('[data-testid="report-grouping-add-level"]').exists(),
    ).toBe(true);
    expect(wrapper.findAll('[data-testid="report-mobile-card"]')).toHaveLength(
      0,
    );

    const search = wrapper.get('input[aria-label="Search report rows"]');
    const autoCompleteControls = wrapper.findAllComponents(AutoComplete);
    const projectFilter = findFilter(wrapper, 'project');
    const memberFilter = findFilter(wrapper, 'member');

    expect(autoCompleteControls).toHaveLength(2);
    for (const autoCompleteControl of autoCompleteControls) {
      expect(autoCompleteControl.props('appendTo')).not.toBe('self');
      expect(
        (autoCompleteControl.props('pt') as AutoCompletePt).overlay,
      ).toEqual({
        class: 'overflow-hidden box-content max-w-0 pr-9',
      });
    }
    expect(search.attributes('placeholder')).toBe('Search report rows');
    expect(projectFilter.props('forceSelection')).toBe(true);
    expect(memberFilter.props('forceSelection')).toBe(true);
    expect(projectFilter.props('dropdownMode')).toBe('blank');
    expect(memberFilter.props('dropdownMode')).toBe('blank');
    expect(projectFilter.props('modelValue')).toBeNull();
    expect(projectFilter.props('placeholder')).toBe('All projects');
    expect(memberFilter.props('modelValue')).toBeNull();
    expect(memberFilter.props('placeholder')).toBe('All members');

    projectFilter.vm.$emit('complete', { query: '' });
    memberFilter.vm.$emit('complete', { query: '' });
    await nextTick();

    expect(findFilter(wrapper, 'project').props('suggestions')).toEqual([
      { label: 'Project Orion', value: 'project-1' },
      { label: 'Billing API', value: 'project-2' },
    ]);
    expect(findFilter(wrapper, 'member').props('suggestions')).toEqual([
      { label: 'Alex Admin', value: 'member-1' },
      { label: 'Pat PM', value: 'member-2' },
    ]);

    await search.setValue('orion');

    projectFilter.vm.$emit('complete', { query: 'orion' });
    await nextTick();

    expect(findFilter(wrapper, 'project').props('suggestions')).toEqual([
      { label: 'Project Orion', value: 'project-1' },
    ]);

    await projectFilter.vm.$emit('update:modelValue', {
      label: 'Project Orion',
      value: 'project-1',
    });

    memberFilter.vm.$emit('complete', { query: 'alex' });
    await nextTick();

    expect(findFilter(wrapper, 'member').props('suggestions')).toEqual([
      { label: 'Alex Admin', value: 'member-1' },
    ]);

    await memberFilter.vm.$emit('update:modelValue', {
      label: 'Alex Admin',
      value: 'member-1',
    });

    expect(filters.global).toBe('orion');
    expect(filters.projectId).toBe('project-1');
    expect(filters.memberId).toBe('member-1');
  });

  it('exposes grouped columns following the configured grouping order', () => {
    const wrapper = mountTable({ grouping: ['member', 'project', 'task'] });

    expect(
      wrapper
        .findAll('[data-testid^="management-table-header-"]')
        .map((header) => header.attributes('data-testid')),
    ).toEqual([
      'management-table-header-group',
      'management-table-header-hours',
      'management-table-header-billable',
      'management-table-header-billableShare',
      'management-table-header-activity',
    ]);
    expect(wrapper.text()).toContain('Member / Project / Task');
  });

  it('renders grouping chips in order and appends a level through the builder', async () => {
    const wrapper = mountTable({ grouping: ['project', 'member'] });

    const chips = wrapper.findAll('[data-testid^="report-grouping-chip-"]');
    expect(chips.map((chip) => chip.attributes('data-testid'))).toEqual([
      'report-grouping-chip-project',
      'report-grouping-chip-member',
    ]);

    const addLevel = wrapper
      .findAllComponents(SelectStub)
      .find(
        (candidate) =>
          candidate.attributes('data-testid') === 'report-grouping-add-level',
      );
    expect(addLevel).toBeDefined();
    // only the unused dimension is offered
    expect(addLevel!.props('options')).toEqual([
      { label: 'Task', value: 'task' },
    ]);

    addLevel!.vm.$emit('update:modelValue', 'task');
    await nextTick();

    expect(wrapper.emitted('update:grouping')).toEqual([
      [['project', 'member', 'task']],
    ]);
  });

  it('hides the add-level control when every dimension is grouped', () => {
    const wrapper = mountTable({ grouping: ['project', 'member', 'task'] });

    expect(
      wrapper.find('[data-testid="report-grouping-add-level"]').exists(),
    ).toBe(false);
  });

  it('removes a grouping level but never the last one', async () => {
    const wrapper = mountTable({ grouping: ['project', 'member'] });

    await wrapper
      .get('[data-testid="report-grouping-remove-member"]')
      .trigger('click');

    expect(wrapper.emitted('update:grouping')).toEqual([[['project']]]);

    const single = mountTable({ grouping: ['project'] });
    expect(
      single.find('[data-testid="report-grouping-remove-project"]').exists(),
    ).toBe(false);
  });

  it('reorders grouping levels by dragging a chip onto another', async () => {
    const wrapper = mountTable({ grouping: ['project', 'member'] });
    const chips = wrapper.findAll('[data-testid^="report-grouping-chip-"]');

    await chips[0]!.trigger('dragstart');
    await chips[1]!.trigger('drop');

    expect(wrapper.emitted('update:grouping')).toEqual([
      [['member', 'project']],
    ]);
  });

  it('renders a touch reorder pipeline and reorders via the stepper on mobile', async () => {
    setMobileViewport(true);

    const wrapper = mountTable({ grouping: ['project', 'member'] });

    // numbered drill-down cards with order captions
    expect(
      wrapper.find('[data-testid="report-grouping-chip-project"]').text(),
    ).toContain('Top level');
    expect(
      wrapper.find('[data-testid="report-grouping-chip-member"]').text(),
    ).toContain('within Project');

    // reorder controls are always present on touch — no desktop hover gating
    const moveLater = wrapper.find(
      '[data-testid="report-grouping-move-later-project"]',
    );
    expect(moveLater.exists()).toBe(true);
    expect(moveLater.classes()).not.toContain('opacity-0');

    await moveLater.trigger('click');
    expect(wrapper.emitted('update:grouping')).toEqual([
      [['member', 'project']],
    ]);
  });

  it('does not let the chip grab handler hijack a nested reorder button key press', async () => {
    const wrapper = mountTable({ grouping: ['project', 'member'] });
    const chip = wrapper.find('[data-testid="report-grouping-chip-project"]');

    // Enter on the button must activate the button, not toggle the chip's grab
    await wrapper
      .find('[data-testid="report-grouping-move-later-project"]')
      .trigger('keydown.enter');

    expect(chip.attributes('aria-grabbed')).toBe('false');
  });

  it('exposes each grouping chip as a labelled sortable control', () => {
    const wrapper = mountTable({ grouping: ['project', 'member'] });
    const chip = wrapper.find('[data-testid="report-grouping-chip-project"]');

    expect(chip.attributes('role')).toBe('button');
    expect(chip.attributes('tabindex')).toBe('0');
    expect(chip.attributes('aria-roledescription')).toBe(
      'sortable grouping level',
    );
    expect(chip.attributes('aria-label')).toBe('Project, level 1 of 2');
  });

  it('reorders with space to grab and arrow keys to move', async () => {
    const wrapper = mountTable({ grouping: ['project', 'member'] });
    const chip = wrapper.find('[data-testid="report-grouping-chip-project"]');

    await chip.trigger('keydown.space');
    expect(chip.attributes('aria-grabbed')).toBe('true');
    expect(
      wrapper.find('[data-testid="report-grouping-announcement"]').text(),
    ).toBe('Project, grabbed at position 1 of 2.');

    await chip.trigger('keydown.right');

    expect(wrapper.emitted('update:grouping')).toEqual([
      [['member', 'project']],
    ]);
  });

  it('grabs with enter as well as space', async () => {
    const wrapper = mountTable({ grouping: ['project', 'member'] });
    const chip = wrapper.find('[data-testid="report-grouping-chip-project"]');

    await chip.trigger('keydown.enter');
    expect(chip.attributes('aria-grabbed')).toBe('true');

    await chip.trigger('keydown.right');
    expect(wrapper.emitted('update:grouping')).toEqual([
      [['member', 'project']],
    ]);
  });

  it('keeps the grab alive across consecutive arrow presses', async () => {
    // Reordering moves the chip's DOM node; if focus is not restored the grab
    // ends after one press and the second arrow does nothing.
    const wrapper = mountTable({ grouping: ['project', 'member', 'task'] });
    const chip = wrapper.find('[data-testid="report-grouping-chip-project"]');

    await chip.trigger('keydown.enter');
    await chip.trigger('keydown.right');
    await chip.trigger('keydown.right');

    const emitted = wrapper.emitted('update:grouping') as unknown[][];
    expect(emitted.at(-1)).toEqual([['member', 'task', 'project']]);
  });

  it('keeps the move buttons reachable by tab', () => {
    // They are hidden until hover or focus, but focus reveals them, so they
    // are a discoverable keyboard path alongside the grab model.
    const wrapper = mountTable({ grouping: ['project', 'member'] });

    expect(
      wrapper
        .find('[data-testid="report-grouping-move-later-project"]')
        .attributes('tabindex'),
    ).toBeUndefined();
  });

  it('moves repeatedly from the same chevron', async () => {
    const wrapper = mountTable({ grouping: ['project', 'member', 'task'] });

    await wrapper
      .find('[data-testid="report-grouping-move-later-project"]')
      .trigger('click');
    await wrapper
      .find('[data-testid="report-grouping-move-later-project"]')
      .trigger('click');

    const emitted = wrapper.emitted('update:grouping') as unknown[][];
    expect(emitted.at(-1)).toEqual([['member', 'task', 'project']]);
  });

  it('announces the move for screen readers', async () => {
    const wrapper = mountTable({ grouping: ['project', 'member'] });
    const chip = wrapper.find('[data-testid="report-grouping-chip-project"]');

    await chip.trigger('keydown.space');
    await chip.trigger('keydown.right');

    const live = wrapper.find('[data-testid="report-grouping-announcement"]');
    expect(live.attributes('aria-live')).toBe('assertive');
    expect(live.text()).toBe('Project, moved to position 2 of 2.');
  });

  it('does not move past either end of the path', async () => {
    const wrapper = mountTable({ grouping: ['project', 'member'] });
    const chip = wrapper.find('[data-testid="report-grouping-chip-project"]');

    await chip.trigger('keydown.space');
    await chip.trigger('keydown.left');

    expect(wrapper.emitted('update:grouping')).toBeUndefined();
  });

  it('restores the original order when the grab is cancelled', async () => {
    const wrapper = mountTable({ grouping: ['project', 'member'] });
    const chip = wrapper.find('[data-testid="report-grouping-chip-project"]');

    await chip.trigger('keydown.space');
    await chip.trigger('keydown.right');
    await chip.trigger('keydown.esc');

    const emitted = wrapper.emitted('update:grouping') as unknown[][];
    // Last emission puts the original order back.
    expect(emitted.at(-1)).toEqual([['project', 'member']]);
    expect(
      wrapper.find('[data-testid="report-grouping-announcement"]').text(),
    ).toBe('Reorder cancelled.');
  });

  it('offers a pointer alternative to dragging', async () => {
    const wrapper = mountTable({ grouping: ['project', 'member'] });

    await wrapper
      .find('[data-testid="report-grouping-move-later-project"]')
      .trigger('click');

    expect(wrapper.emitted('update:grouping')).toEqual([
      [['member', 'project']],
    ]);
  });

  it('disables the move buttons at the ends of the path', () => {
    const wrapper = mountTable({ grouping: ['project', 'member'] });

    expect(
      wrapper
        .find('[data-testid="report-grouping-move-earlier-project"]')
        .attributes('disabled'),
    ).toBeDefined();
    expect(
      wrapper
        .find('[data-testid="report-grouping-move-later-member"]')
        .attributes('disabled'),
    ).toBeDefined();
  });

  it('renders the grouping hierarchy with derived subtotals and a total row', () => {
    const tableRows = [
      makeLeafRow({}),
      makeLeafRow({
        billableSeconds: 1800,
        id: 'project-1:no-task:member-2',
        memberIds: ['member-2'],
        memberName: 'Nina PM',
        nonBillableSeconds: 1800,
        totalSeconds: 3600,
      }),
      makeLeafRow({
        billableSeconds: 900,
        id: 'project-2:no-task:member-2',
        memberIds: ['member-2'],
        memberName: 'Nina PM',
        nonBillableSeconds: 900,
        projectIds: ['project-2'],
        projectName: 'Billing API',
        totalSeconds: 1800,
      }),
    ];
    const wrapper = mountTable({
      grouping: ['project', 'member'],
      tableRows,
    });

    // Orion subtotal folds both members' leaves
    expect(wrapper.text()).toContain('3h 00m');
    expect(wrapper.text()).toContain('2 members');
    expect(wrapper.text()).toContain('Billing API');
    // grand totals over every leaf
    const totalRow = wrapper.get('[data-testid="report-total-row"]');
    expect(totalRow.text()).toContain('Total');
    expect(totalRow.text()).toContain('3h 30m');
    expect(totalRow.text()).toContain('1h 45m');
  });

  it('collapses a group subtree while keeping its subtotal row visible', async () => {
    const tableRows = [
      makeLeafRow({}),
      makeLeafRow({
        id: 'project-2:no-task:member-2',
        memberIds: ['member-2'],
        memberName: 'Nina PM',
        projectIds: ['project-2'],
        projectName: 'Billing API',
      }),
    ];
    const wrapper = mountTable({
      grouping: ['project', 'member'],
      tableRows,
    });

    expect(wrapper.text()).toContain('Alex Admin');

    // Orion sorts first only on label ties; find its toggle by row order.
    const toggles = wrapper.findAll('[data-testid="report-row-toggle"]');
    expect(toggles).toHaveLength(2);

    const orionToggle = toggles.find((toggle) =>
      toggle.attributes('aria-label')?.includes('Project Orion'),
    );
    await orionToggle!.trigger('click');

    expect(wrapper.text()).not.toContain('Alex Admin');
    expect(wrapper.text()).toContain('Project Orion');
    expect(wrapper.text()).toContain('Nina PM');
  });

  it('renders mobile filters and keeps loaded report cards during refresh loading', () => {
    setMobileViewport(true);

    const wrapper = mountTable({ loading: true });

    const autoCompleteControls = wrapper.findAllComponents(AutoComplete);

    // mobile hours/billable/billable-share/activity filters; add-level
    // carries its own testid
    expect(wrapper.findAll('[data-testid="select-stub"]')).toHaveLength(4);
    expect(autoCompleteControls).toHaveLength(2);
    for (const autoCompleteControl of autoCompleteControls) {
      expect(autoCompleteControl.props('appendTo')).toBe('self');
      expect(
        (autoCompleteControl.props('pt') as AutoCompletePt).overlay?.style,
      ).toEqual(giTiempoSelfAppendedAutoCompleteOverlayStyle);
    }
    expect(
      wrapper.findAll('[data-testid="reports-mobile-loading-card"]'),
    ).toHaveLength(0);
    expect(wrapper.findAll('[data-testid="report-mobile-card"]')).toHaveLength(
      1,
    );
    expect(wrapper.text()).toContain('2h 00m');
  });

  it('renders mobile loading cards when loading has no report rows yet', () => {
    setMobileViewport(true);

    const wrapper = mountTable({ loading: true, tableRows: [] });

    expect(
      wrapper.findAll('[data-testid="reports-mobile-loading-card"]'),
    ).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="report-mobile-card"]')).toHaveLength(
      0,
    );
    expect(wrapper.text()).not.toContain('No report rows found');
  });

  it('renders desktop skeleton rows instead of a spinner when loading has no report rows yet', () => {
    const wrapper = mountTable({ loading: true, tableRows: [] });

    expect(
      wrapper.findAll('[data-testid="reports-desktop-loading-row"]'),
    ).toHaveLength(6);
    expect(wrapper.find('.p-datatable-mask').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('No report rows found');
  });

  it('keeps loaded desktop report rows without a spinner overlay during refresh loading', () => {
    const wrapper = mountTable({ loading: true });

    expect(wrapper.text()).toContain('Project Orion');
    expect(
      wrapper.findAll('[data-testid="reports-desktop-loading-row"]'),
    ).toHaveLength(0);
    expect(wrapper.find('.p-datatable-mask').exists()).toBe(false);
  });

  it('renders non-loading mobile report cards with grouped values on small viewports', () => {
    setMobileViewport(true);

    const wrapper = mountTable({ grouping: ['project', 'member'] });

    const mobileCards = wrapper.findAll('[data-testid="report-mobile-card"]');

    // one card per visible tree row: the project subtotal and its member leaf
    expect(mobileCards).toHaveLength(2);
    expect(mobileCards[0]?.text()).toContain('Project Orion');
    expect(mobileCards[0]?.text()).toContain('1 member');
    expect(mobileCards[1]?.text()).toContain('Alex Admin');
    expect(mobileCards[0]?.text()).toContain('2h 00m');
    expect(mobileCards[0]?.text()).toContain('1h 00m');
    expect(wrapper.findAllComponents(AutoComplete)).toHaveLength(2);
  });

  it('shows billable %, a proportional meter, dimension badges, and leaf context on mobile cards', () => {
    setMobileViewport(true);

    const wrapper = mountTable({ grouping: ['project', 'member'] });
    const mobileCards = wrapper.findAll('[data-testid="report-mobile-card"]');

    // billableShare 0.5 -> "50%" and a half-filled meter
    expect(mobileCards[0]?.text()).toContain('50%');
    const meterFill = mobileCards[0]?.find('.bg-brand');
    expect(meterFill?.attributes('style')).toContain('width: 50%');

    // grouping dimension is badged: project -> folder, member -> user
    expect(mobileCards[0]?.find('.pi-folder').exists()).toBe(true);
    expect(mobileCards[1]?.find('.pi-user').exists()).toBe(true);

    // the leaf row falls back to its entry count for context
    expect(mobileCards[1]?.text()).toContain('2 entries');
  });

  it('toggles a mobile group row through its expand control', async () => {
    setMobileViewport(true);

    const wrapper = mountTable({ grouping: ['project', 'member'] });

    expect(wrapper.findAll('[data-testid="report-mobile-card"]')).toHaveLength(
      2,
    );

    const toggle = wrapper.find('[data-testid="report-mobile-toggle"]');
    expect(toggle.exists()).toBe(true);
    expect(toggle.attributes('aria-expanded')).toBe('true');
    // only the parent group carries a toggle; the member leaf has none
    expect(
      wrapper.findAll('[data-testid="report-mobile-toggle"]'),
    ).toHaveLength(1);

    await toggle.trigger('click');

    // collapsing the group drops its child card
    expect(wrapper.findAll('[data-testid="report-mobile-card"]')).toHaveLength(
      1,
    );
    expect(
      wrapper
        .find('[data-testid="report-mobile-toggle"]')
        .attributes('aria-expanded'),
    ).toBe('false');
  });

  function findPeriodSelect(wrapper: ReturnType<typeof mountTable>) {
    return wrapper
      .findAllComponents(SelectStub)
      .find((candidate) =>
        (candidate.props('options') as { label: string }[]).some(
          (option) => option.label === 'Custom range',
        ),
      );
  }

  it('lets a relative period be chosen and resolves it to a concrete range', async () => {
    const wrapper = mountTable();

    const periodSelect = findPeriodSelect(wrapper);
    expect(periodSelect).toBeDefined();

    periodSelect!.vm.$emit('update:modelValue', 'this_month');
    await nextTick();

    // the period intent is recorded (so a preset re-resolves it on open)…
    expect(wrapper.emitted('update:period')).toEqual([['this_month']]);
    // …and it is resolved to a concrete [start, end] window immediately
    const dateEmits = wrapper.emitted('update:dateRange');
    expect(dateEmits).toBeTruthy();
    const [resolvedRange] = dateEmits!.at(-1)!;
    expect(resolvedRange).toHaveLength(2);
    expect((resolvedRange as Date[])[0]).toBeInstanceOf(Date);
  });

  it('reflects the active relative period and returns to custom on selection', async () => {
    const wrapper = mountTable({ period: 'last_7_days' });

    const periodSelect = findPeriodSelect(wrapper);
    expect(periodSelect!.props('modelValue')).toBe('last_7_days');

    periodSelect!.vm.$emit('update:modelValue', 'custom');
    await nextTick();

    // choosing custom clears the named period without touching the dates
    expect(wrapper.emitted('update:period')).toEqual([[null]]);
    expect(wrapper.emitted('update:dateRange')).toBeUndefined();
  });

  it('exposes billable share and activity column filters that update the filter model', async () => {
    const filters = createDefaultReportTableFilters();
    const wrapper = mountTable({ filters });

    const selects = wrapper.findAllComponents(SelectStub);
    const findByOption = (label: string) =>
      selects.find((candidate) =>
        (candidate.props('options') as { label: string }[]).some(
          (option) => option.label === label,
        ),
      );

    const shareFilter = findByOption('90%+');
    const activityFilter = findByOption('Any time');

    expect(shareFilter).toBeDefined();
    expect(activityFilter).toBeDefined();

    shareFilter!.vm.$emit('update:modelValue', 'gte90');
    activityFilter!.vm.$emit('update:modelValue', 'last7');
    await nextTick();

    expect(filters.billableShare).toBe('gte90');
    expect(filters.activity).toBe('last7');
  });

  it('applies aggregate filters against displayed group totals, not leaves', async () => {
    // reactive like the view's ref-wrapped filters, so mutations re-filter
    const filters = reactive(createDefaultReportTableFilters());
    const tableRows = [
      makeLeafRow({}),
      makeLeafRow({
        id: 'project-1:no-task:member-2',
        memberIds: ['member-2'],
        memberName: 'Nina PM',
      }),
      makeLeafRow({
        id: 'project-2:no-task:member-2',
        memberIds: ['member-2'],
        memberName: 'Nina PM',
        projectIds: ['project-2'],
        projectName: 'Billing API',
      }),
    ];
    const wrapper = mountTable({
      filters,
      grouping: ['project', 'member'],
      tableRows,
    });

    expect(wrapper.text()).toContain('Project Orion');
    expect(wrapper.text()).toContain('Billing API');

    // groups keep showing while their displayed totals pass the threshold
    filters.hours = 'gt0';
    await nextTick();
    expect(wrapper.text()).toContain('Project Orion');
    expect(wrapper.text()).toContain('Billing API');

    filters.hours = 'gte8';
    await nextTick();
    // Orion totals 4h at the group level — under 8h, both groups hidden and
    // the total row disappears with them
    expect(wrapper.text()).not.toContain('Project Orion');
    expect(wrapper.find('[data-testid="report-total-row"]').exists()).toBe(
      false,
    );
    expect(wrapper.text()).toContain('No report rows found');
  });

  it('shows selected filter labels in the table filter row', () => {
    const filters = createDefaultReportTableFilters();
    filters.projectId = 'project-1';
    filters.memberId = 'member-1';
    filters.hours = 'gt0';
    filters.billable = 'withBillable';

    const wrapper = mountTable({
      filters,
      memberOptions: [{ label: 'Selected Member', value: 'member-1' }],
      projectOptions: [{ label: 'Selected Project', value: 'project-1' }],
      tableRows: [],
    });

    expect(wrapper.text()).toContain('Tracked');
    expect(wrapper.text()).toContain('Billable');
    expect(findFilter(wrapper, 'project').props('modelValue')).toEqual({
      label: 'Selected Project',
      value: 'project-1',
    });
    expect(findFilter(wrapper, 'member').props('modelValue')).toEqual({
      label: 'Selected Member',
      value: 'member-1',
    });
  });

  it('keeps billable hours stable when the non-billable filter is selected', () => {
    const filters = createDefaultReportTableFilters();
    filters.billable = 'withoutBillable';

    const wrapper = mountTable({
      filters,
      tableRows: [
        makeLeafRow({
          billableSeconds: 2700,
          totalSeconds: 7200,
        }),
      ],
    });

    expect(wrapper.text()).toContain('2h 00m');
    expect(wrapper.text()).toContain('45m');
    expect(wrapper.text()).not.toContain('1h 15m');
  });
});
