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
