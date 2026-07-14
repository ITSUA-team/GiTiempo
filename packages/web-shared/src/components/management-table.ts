import type { AutoCompletePassThroughOptions } from 'primevue/autocomplete';
import type { MultiSelectPassThroughOptions } from 'primevue/multiselect';
import type { SelectPassThroughOptions } from 'primevue/select';
import type { CSSProperties } from 'vue';

export interface ManagementTableColumn {
  key: string;
  label: string;
  width?: number | 'fill';
  align?: 'start' | 'end';
}

export type ManagementTableColumnStyle = CSSProperties;

const actionButtonBaseClass =
  'h-11 w-11 rounded-sm border-none bg-transparent p-0 shadow-none transition-colors hover:bg-app-bg focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2';

const actionToneClassByTone = {
  brand: 'text-brand',
  destructive: 'text-destructive',
  muted: 'text-text-muted',
} as const;

export type ManagementTableActionTone = keyof typeof actionToneClassByTone;

export const managementTableHeaderClass =
  'bg-app-bg text-text-dark flex h-[44px] w-full shrink-0 items-center font-sans text-[13px] font-semibold';

export const managementTableHeaderCellClass =
  'flex h-full min-w-0 items-center px-3 font-sans text-[13px] font-semibold text-text-dark';

export const managementTableBodyRowClass =
  'border-divider h-12 border-b transition-colors last:border-b-0 hover:bg-app-bg';

export const managementTableShellClass =
  'border-divider overflow-hidden rounded-[6px] border bg-surface-primary';

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

export function getManagementTableColumnStyle(
  column: ManagementTableColumn,
): ManagementTableColumnStyle {
  if (column.width === 'fill' || column.width === undefined) {
    return {
      flex: '1 1 0px',
      minWidth: '0',
    };
  }

  const width = `${column.width}px`;

  return {
    flex: `0 0 ${width}`,
    minWidth: width,
    width,
  };
}

export const managementTableColumnPt = {
  bodyCell: {
    class: 'border-0 px-3 py-0 align-middle font-sans text-sm',
  },
} as const;

export const managementTableFilterInputClass = 'h-[38px] w-full rounded-[6px] text-[13px]';

const managementTableFilterAutoCompleteInputClass =
  'h-[38px] w-full rounded-l-[6px] rounded-r-none text-[13px]';

export const managementTableFilterAutoCompletePt = {
  root: { class: 'h-[38px]' },
  pcInputText: {
    root: { class: managementTableFilterAutoCompleteInputClass },
  },
  dropdown: { class: 'h-[38px] w-9 text-text-muted' },
  option: { class: 'text-[13px]' },
} satisfies AutoCompletePassThroughOptions;

const managementTableFilterDropdownRootClass =
  'h-[38px] w-full items-center rounded-[6px] font-sans text-[13px]';
const managementTableFilterDropdownLabelClass =
  'flex h-full items-center py-0 font-sans text-[13px] font-normal leading-none text-text-muted';

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
