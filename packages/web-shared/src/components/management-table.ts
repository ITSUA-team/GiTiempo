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

export interface ManagementTableAssignmentFilterOption {
  label: string;
  value: string;
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

export const managementTableFilterInputClass =
  'border-divider bg-surface-primary h-[38px] w-full rounded-[6px] border px-3 font-sans text-[14px] font-medium text-text-dark shadow-none';

const managementTableFilterAutoCompleteInputClass =
  'h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 font-sans text-[14px] font-medium text-text-dark shadow-none ring-0 focus:border-transparent focus:bg-transparent focus:outline-none focus:ring-0 focus:shadow-none';
const managementTableFilterDropdownTriggerClass =
  'h-[38px] w-9 shrink-0 rounded-none rounded-r-[6px] border-0 bg-transparent p-0 text-text-muted shadow-none ring-0 hover:border-transparent hover:bg-transparent hover:text-text-dark focus:border-transparent focus:bg-transparent focus:outline-none focus:ring-0 focus:shadow-none active:border-transparent active:bg-transparent';
const managementTableFilterAutoCompleteOverlayClass = 'overflow-hidden';
const managementTableSelfAppendedFilterAutoCompleteOverlayClass =
  `${managementTableFilterAutoCompleteOverlayClass} w-full max-w-full`;

export const managementTableSelfAppendedFilterAutoCompleteOverlayStyle = {
  boxSizing: 'border-box',
  maxWidth: '100%',
  minWidth: '100%',
  width: '100%',
} as const;

export const managementTableFilterAutoCompletePt = {
  root: {
    class:
      'border-divider bg-surface-primary flex h-[38px] w-full items-center overflow-hidden rounded-[6px] border font-sans text-[14px] font-medium text-text-dark shadow-none',
  },
  inputMultiple: {
    class:
      'min-h-[38px] w-full flex-1 rounded-none border-0 bg-transparent px-2 py-1 font-sans text-[14px] font-medium text-text-dark shadow-none',
  },
  input: {
    class: `truncate ${managementTableFilterAutoCompleteInputClass}`,
  },
  pcInputText: {
    root: { class: managementTableFilterAutoCompleteInputClass },
  },
  pcChip: {
    root: {
      class: 'bg-accent-tint text-brand font-sans text-[12px] font-semibold',
    },
  },
  dropdown: { class: managementTableFilterDropdownTriggerClass },
  option: { class: 'font-sans text-[14px]' },
} satisfies AutoCompletePassThroughOptions;

export const managementTableResolvedFilterAutoCompletePt = {
  ...managementTableFilterAutoCompletePt,
  overlay: { class: managementTableFilterAutoCompleteOverlayClass },
} satisfies AutoCompletePassThroughOptions;

export const managementTableSelfAppendedFilterAutoCompletePt = {
  ...managementTableResolvedFilterAutoCompletePt,
  // Self-appended overlays render inside the root, so it must not clip
  // overflowing children or the dropdown panel stays invisible.
  root: {
    class:
      'border-divider bg-surface-primary flex h-[38px] w-full items-center rounded-[6px] border font-sans text-[14px] font-medium text-text-dark shadow-none',
  },
  overlay: {
    class: managementTableSelfAppendedFilterAutoCompleteOverlayClass,
    style: managementTableSelfAppendedFilterAutoCompleteOverlayStyle,
  },
} satisfies AutoCompletePassThroughOptions;

const managementTableFilterDropdownRootClass =
  'border-divider bg-surface-primary h-[38px] w-full items-center rounded-[6px] border font-sans text-[14px] font-medium text-text-dark shadow-none';
const managementTableFilterDropdownLabelClass =
  'flex h-full items-center px-3 py-0 font-sans text-[14px] font-medium leading-none text-text-dark';

export const managementTableFilterSelectPt = {
  root: { class: managementTableFilterDropdownRootClass },
  label: { class: managementTableFilterDropdownLabelClass },
  dropdown: { class: managementTableFilterDropdownTriggerClass },
} satisfies SelectPassThroughOptions;

export const managementTableFilterMultiSelectPt = {
  root: { class: managementTableFilterDropdownRootClass },
  labelContainer: { class: 'flex h-full items-center' },
  label: {
    class: managementTableFilterDropdownLabelClass,
  },
  dropdown: { class: managementTableFilterDropdownTriggerClass },
} satisfies MultiSelectPassThroughOptions;
