import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { afterEach, describe, expect, it } from 'vitest';
import SaveReportSheet from './SaveReportSheet.vue';

const summary = [
  { icon: 'pi pi-calendar', label: 'This month' },
  { icon: 'pi pi-sitemap', label: 'Project › Member' },
];

async function mountSheet(
  props: Partial<InstanceType<typeof SaveReportSheet>['$props']> = {},
) {
  const wrapper = mount(SaveReportSheet, {
    global: { plugins: [PrimeVue] },
    props: {
      activeName: null,
      canUpdate: false,
      isSaving: false,
      summary,
      visible: false,
      ...props,
    },
  });

  // Dialog only mounts its content when visibility transitions to true.
  await wrapper.setProps({ visible: true });
  return wrapper;
}

function query(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SaveReportSheet', () => {
  it('offers only save-as-new when nothing is loaded', async () => {
    await mountSheet();

    expect(query('[data-testid="save-sheet-option-update"]')).toBeNull();
    expect(query('[data-testid="save-sheet-option-new"]')).not.toBeNull();
  });

  it('shows the captured-settings summary', async () => {
    await mountSheet();

    const text = document.body.textContent ?? '';
    expect(text).toContain('This month');
    expect(text).toContain('Project › Member');
  });

  it('keeps confirm disabled until a name is entered, then emits the trimmed name', async () => {
    const wrapper = await mountSheet();

    const confirm = wrapper.findComponent(
      '[data-testid="save-sheet-confirm"]',
    );
    expect(confirm.attributes('disabled')).toBeDefined();

    await wrapper
      .findComponent('[data-testid="save-sheet-name-input"]')
      .setValue('  Client hours  ');
    await confirm.trigger('click');

    expect(wrapper.emitted('saveAsNew')).toEqual([['Client hours']]);
    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });

  it('preselects update for a dirty loaded preset and emits save', async () => {
    const wrapper = await mountSheet({
      activeName: 'Monthly billing',
      canUpdate: true,
    });

    const update = query('[data-testid="save-sheet-option-update"]');
    expect(update?.getAttribute('aria-checked')).toBe('true');

    await wrapper
      .findComponent('[data-testid="save-sheet-confirm"]')
      .trigger('click');

    expect(wrapper.emitted('save')).toHaveLength(1);
    expect(wrapper.emitted('saveAsNew')).toBeUndefined();
  });

  it('disables the update option when the loaded preset is unchanged', async () => {
    await mountSheet({ activeName: 'Monthly billing', canUpdate: false });

    const update = query('[data-testid="save-sheet-option-update"]');
    expect(update?.hasAttribute('disabled')).toBe(true);
    expect(update?.textContent).toContain('No changes to save');

    const asNew = query('[data-testid="save-sheet-option-new"]');
    expect(asNew?.getAttribute('aria-checked')).toBe('true');
  });
});
