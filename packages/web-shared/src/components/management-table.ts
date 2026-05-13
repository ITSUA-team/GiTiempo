const actionButtonBaseClass =
  'px-1.5 py-1 text-[13px] font-semibold leading-none rounded bg-transparent border-none shadow-none no-underline';

export const managementTableActionPt = {
  brand: { root: { class: `${actionButtonBaseClass} text-brand` } },
  destructive: { root: { class: `${actionButtonBaseClass} text-destructive` } },
  muted: { root: { class: `${actionButtonBaseClass} text-text-muted` } },
} as const;

export const managementTableColumnPt = {
  bodyCell: {
    class: 'border-0 border-t border-divider px-3 py-0 align-middle font-sans',
  },
} as const;
