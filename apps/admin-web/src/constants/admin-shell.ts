import {
  ChartBarSquareIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  FolderIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@heroicons/vue/24/outline';
import { markRaw } from 'vue';

import { routeNames } from '@/constants/routes';

export const ADMIN_COUNTERPART_LABEL = 'User workspace';

export const ADMIN_PAGE_NAMES_BY_ROUTE_NAME: Record<string, string> = {
  [routeNames.addProject]: 'New Project',
  [routeNames.dashboard]: 'Dashboard',
  [routeNames.invoices]: 'Invoices',
  [routeNames.members]: 'Members',
  [routeNames.projects]: 'Projects',
  [routeNames.reports]: 'Reports',
  [routeNames.settings]: 'Settings',
};

export const ADMIN_SETTINGS_ICON = markRaw(Cog6ToothIcon);
export const ADMIN_SETTINGS_LABEL = ADMIN_PAGE_NAMES_BY_ROUTE_NAME[routeNames.settings];
const SHOW_INVOICES_NAV = false;

export const ADMIN_BASE_NAV_ITEMS = [
  {
    icon: markRaw(Squares2X2Icon),
    label: ADMIN_PAGE_NAMES_BY_ROUTE_NAME[routeNames.dashboard],
    name: routeNames.dashboard,
  },
  {
    icon: markRaw(ChartBarSquareIcon),
    label: ADMIN_PAGE_NAMES_BY_ROUTE_NAME[routeNames.reports],
    name: routeNames.reports,
  },
  ...(SHOW_INVOICES_NAV
    ? [
        {
          icon: markRaw(DocumentTextIcon),
          label: ADMIN_PAGE_NAMES_BY_ROUTE_NAME[routeNames.invoices],
          name: routeNames.invoices,
        },
      ]
    : []),
  {
    icon: markRaw(UsersIcon),
    label: ADMIN_PAGE_NAMES_BY_ROUTE_NAME[routeNames.members],
    name: routeNames.members,
  },
  {
    icon: markRaw(FolderIcon),
    label: ADMIN_PAGE_NAMES_BY_ROUTE_NAME[routeNames.projects],
    name: routeNames.projects,
  },
];
