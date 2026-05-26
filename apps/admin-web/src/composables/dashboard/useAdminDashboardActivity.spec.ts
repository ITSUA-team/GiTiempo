import { defineComponent, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { ADMIN_DASHBOARD_ACTIVITY_PREVIEW_LIMIT } from '@/constants/admin-dashboard';
import type { AdminDashboardActivityRow } from '@/lib/admin-dashboard-view-model';
import { useAdminDashboardActivity } from './useAdminDashboardActivity';

function createActivityRow(index: number): AdminDashboardActivityRow {
  return {
    activity: `Activity ${index}`,
    id: `activity-${index}`,
    occurredAt: `2026-05-13T10:0${index}:00.000Z`,
    timeLabel: `${index} min ago`,
    timestamp: index,
    type: 'invite',
    typeLabel: 'Invite',
  };
}

function mountActivity(rows = Array.from({ length: 6 }, (_, index) => createActivityRow(index))) {
  const allActivityRows = shallowRef(rows);
  const initialLoaded = shallowRef(true);
  const loading = shallowRef(false);
  const loadError = shallowRef<string | null>(null);
  let activity!: ReturnType<typeof useAdminDashboardActivity>;

  mount(
    defineComponent({
      setup() {
        activity = useAdminDashboardActivity({
          allActivityRows,
          initialLoaded,
          loadError,
          loading,
        });
        return () => null;
      },
    }),
  );

  return { activity, allActivityRows, loadError, loading };
}

describe('useAdminDashboardActivity', () => {
  it('previews configured activity rows and expands on request', () => {
    const { activity } = mountActivity();

    expect(activity.hasMoreActivity.value).toBe(true);
    expect(activity.showAllActivity.value).toBe(false);
    expect(activity.activityRows.value).toHaveLength(ADMIN_DASHBOARD_ACTIVITY_PREVIEW_LIMIT);

    activity.toggleActivityRows();

    expect(activity.showAllActivity.value).toBe(true);
    expect(activity.activityRows.value).toHaveLength(6);

    activity.toggleActivityRows();

    expect(activity.showAllActivity.value).toBe(false);
    expect(activity.activityRows.value).toHaveLength(ADMIN_DASHBOARD_ACTIVITY_PREVIEW_LIMIT);
  });

  it('collapses expanded state when rows no longer exceed the preview limit', async () => {
    const { activity, allActivityRows } = mountActivity();

    activity.toggleActivityRows();
    allActivityRows.value = allActivityRows.value.slice(0, 2);
    await Promise.resolve();

    expect(activity.hasMoreActivity.value).toBe(false);
    expect(activity.showAllActivity.value).toBe(false);
    expect(activity.activityRows.value).toHaveLength(2);
  });

  it('exposes the successful empty state only after loading finishes without errors', () => {
    const { activity, loadError, loading } = mountActivity([]);

    expect(activity.isActivityEmpty.value).toBe(true);

    loading.value = true;
    expect(activity.isActivityEmpty.value).toBe(false);

    loading.value = false;
    loadError.value = 'No scope';
    expect(activity.isActivityEmpty.value).toBe(false);
  });
});
