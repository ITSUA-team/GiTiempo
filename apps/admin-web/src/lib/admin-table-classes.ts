import { managementTableHeaderClass } from '@gitiempo/web-shared';

// Admin-local so table-wide cell tweaks never leak into user-web tables.
export const adminTableColumnPt = {
  bodyCell: {
    class: 'border-0 px-3 py-0 align-middle font-sans text-sm',
  },
} as const;

// Every admin management table renders 56px body rows, matching
// ManagementDesktopRowSkeleton so tables do not change height when loading
// finishes. Kept app-local on purpose: the web-shared default stays h-12 for
// user-web consumers, which use their own 48/52px row heights.
export const adminTableBodyRowClass =
  'border-divider h-[56px] border-b transition-colors last:border-b-0 hover:bg-app-bg';

// One min-width for every admin table surface (header, filter row, body
// table), so rows are the same width on every page instead of each table
// picking its own overflow point (previously 700–860px per table).
export const adminTableMinWidthClass = 'min-w-[860px]';

export const adminTableHeaderClass = `${managementTableHeaderClass} ${adminTableMinWidthClass}`;

export const adminTableClass = `${adminTableMinWidthClass} w-full table-fixed border-collapse`;
