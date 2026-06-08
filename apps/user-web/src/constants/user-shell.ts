import {
  ClockIcon,
  FolderIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/vue/24/outline';
import { markRaw } from 'vue';

import { routeNames } from '@/constants/routes';

export const USER_COUNTERPART_LABEL = 'Admin workspace';

export const USER_PAGE_NAMES_BY_ROUTE_NAME: Record<string, string> = {
  [routeNames.dashboard]: 'Dashboard',
  [routeNames.profile]: 'Profile',
  [routeNames.project]: 'Projects',
  [routeNames.timeEntries]: 'Time Entries',
};

export const USER_PROFILE_ICON = markRaw(UserCircleIcon);
export const USER_PROFILE_LABEL = USER_PAGE_NAMES_BY_ROUTE_NAME[routeNames.profile];

export const USER_NAV_ITEMS = [
  {
    icon: markRaw(Squares2X2Icon),
    label: USER_PAGE_NAMES_BY_ROUTE_NAME[routeNames.dashboard],
    name: routeNames.dashboard,
  },
  {
    icon: markRaw(ClockIcon),
    label: USER_PAGE_NAMES_BY_ROUTE_NAME[routeNames.timeEntries],
    name: routeNames.timeEntries,
  },
  {
    icon: markRaw(FolderIcon),
    label: USER_PAGE_NAMES_BY_ROUTE_NAME[routeNames.project],
    name: routeNames.project,
    to: { name: routeNames.project },
  },
];
