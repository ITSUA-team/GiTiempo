import type { AutoCompletePassThroughOptions } from 'primevue/autocomplete';
import type { MultiSelectPassThroughOptions } from 'primevue/multiselect';
import type { SelectPassThroughOptions } from 'primevue/select';

export interface ManagementTableColumn {
  key: string;
  label: string;
  width?: number | 'fill';
  align?: 'start' | 'end';
}

const actionButtonBaseClass =
  'h-11 w-11 rounded-sm border-none bg-transparent p-0 shadow-none transition-colors hover:bg-app-bg focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2';

const actionToneClassByTone = {
  brand: 'text-brand',
  destructive: 'text-destructive',
  muted: 'text-text-muted',
} as const;

export type ManagementTableActionTone = keyof typeof actionToneClassByTone;

export function getManagementTableActionIconClass(
  tone: ManagementTableActionTone,
): string {
  return actionToneClassByTone[tone];
}

export function getManagementTableActionRootClass(
  tone: ManagementTableActionTone,
): string {
  return `${actionButtonBaseClass} ${getManagementTableActionIconClass(tone)}`;
}

export const managementTableColumnPt = {
  bodyCell: {
    class: 'border-0 border-t border-divider px-3 py-0 align-middle font-sans',
  },
} as const;

export const managementTableFilterInputClass = 'h-[34px] w-full rounded-[6px] text-[12px]';

const managementTableFilterAutoCompleteInputClass =
  'h-[34px] w-full rounded-l-[6px] rounded-r-none text-[12px]';

export const managementTableFilterAutoCompletePt = {
  root: { class: 'relative h-[34px] w-full max-w-full min-w-0' },
  pcInputText: {
    root: { class: managementTableFilterAutoCompleteInputClass },
  },
  dropdown: { class: 'h-[34px] w-8 text-text-muted' },
  listContainer: { class: 'max-w-full overflow-x-hidden' },
  option: { class: 'max-w-full min-w-0 truncate text-[12px]' },
  overlay: { class: 'w-full max-w-full overflow-hidden' },
} satisfies AutoCompletePassThroughOptions;

const managementTableFilterDropdownRootClass =
  'h-[34px] w-full items-center rounded-[6px] font-sans text-[12px]';
const managementTableFilterDropdownLabelClass =
  'flex h-full items-center py-0 font-sans text-[12px] font-normal leading-none text-text-muted';

export const managementTableFilterSelectPt = {
  root: { class: managementTableFilterDropdownRootClass },
  label: { class: managementTableFilterDropdownLabelClass },
} satisfies SelectPassThroughOptions;

export const managementTableFilterMultiSelectPt = {
  root: { class: managementTableFilterDropdownRootClass },
  labelContainer: { class: 'flex h-full items-center' },
  label: {
    class: managementTableFilterDropdownLabelClass,
  },
} satisfies MultiSelectPassThroughOptions;
