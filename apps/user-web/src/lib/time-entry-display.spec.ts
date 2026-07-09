import type { TimeEntryResponse } from '@gitiempo/shared';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  formatCompactDuration,
  formatElapsedDuration,
  formatLocalDayLabel,
  formatLocalTime,
  formatRunningDuration,
  formatTimeEntryDuration,
  formatTimeEntryTimeRange,
  getEntryTrackedSecondsWithinRange,
  getLocalDateKey,
  groupTimeEntriesByLocalDay,
  nextLocalDay,
  startOfLocalDay,
  startOfLocalIsoWeek,
} from '@/lib/time-entry-display';

beforeAll(() => {
  vi.stubEnv('TZ', 'Europe/Kiev');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

function createEntry(
  overrides: Partial<TimeEntryResponse> = {},
): TimeEntryResponse {
  const { githubIssue = null, ...entryOverrides } = overrides;

  return {
    createdAt: '2026-04-21T09:00:00.000Z',
    description: null,
    durationSeconds: 5400,
    endedAt: '2026-04-21T10:30:00.000Z',
    id: 'entry-1',
    isBillable: false,
    project: { id: 'project-1', name: 'Project Orion' },
    projectId: 'project-1',
    source: 'manual',
    startedAt: '2026-04-21T09:00:00.000Z',
    task: { id: 'task-1', title: 'Improve reports filters' },
    taskId: 'task-1',
    updatedAt: '2026-04-21T10:30:00.000Z',
    user: {
      avatarUrl: null,
      displayName: 'Alexey Tsukanov',
      email: 'alexey@example.com',
      id: 'user-1',
    },
    userId: 'user-1',
    workspace: { id: 'workspace-1', name: 'Workspace Alpha' },
    workspaceId: 'workspace-1',
    githubIssue,
    ...entryOverrides,
  };
}

describe('time-entry-display', () => {
  it('formats browser-local dates and duration labels', () => {
    const now = new Date(2026, 3, 21, 12, 0, 0, 0);
    const nowMs = now.getTime();
    const localTimestamp = new Date(2026, 3, 21, 0, 5, 0, 0).toISOString();
    const olderLocalTimestamp = new Date(2026, 3, 19, 9, 5, 0, 0).toISOString();

    expect(getLocalDateKey(localTimestamp)).toBe('2026-04-21');
    expect(formatLocalTime(localTimestamp)).toBe('00:05');
    expect(formatLocalTime(olderLocalTimestamp)).toBe('09:05');
    expect(formatLocalDayLabel('2026-04-21', now.getTime())).toBe(
      'Today, Apr 21',
    );
    expect(formatLocalDayLabel('2026-04-20', now.getTime())).toBe(
      'Yesterday, Apr 20',
    );
    expect(formatLocalDayLabel('2026-04-01', now.getTime())).toBe('Apr 1');
    expect(formatCompactDuration(null)).toBe('0m');
    expect(formatCompactDuration(59)).toBe('1m');
    expect(formatCompactDuration(7200)).toBe('2h');
    expect(formatCompactDuration(8100)).toBe('2h 15m');
    expect(formatElapsedDuration(3661)).toBe('01:01:01');
    expect(
      formatRunningDuration(
        new Date(2026, 3, 21, 11, 59, 58, 0).toISOString(),
        nowMs,
      ),
    ).toBe('00:00:02');
    expect(
      formatRunningDuration(
        new Date(2026, 3, 21, 12, 0, 5, 0).toISOString(),
        nowMs,
      ),
    ).toBe('00:00:00');
  });

  it('calculates browser-local day and Monday-start week windows', () => {
    const date = new Date(2026, 3, 26, 23, 30, 0, 0);

    expect(startOfLocalDay(date)).toEqual(new Date(2026, 3, 26, 0, 0, 0, 0));
    expect(nextLocalDay(date)).toEqual(new Date(2026, 3, 27, 0, 0, 0, 0));
    expect(startOfLocalIsoWeek(date)).toEqual(
      new Date(2026, 3, 20, 0, 0, 0, 0),
    );
  });

  it('groups entries by browser-local start day and preserves existing item order', () => {
    const nowMs = new Date(2026, 3, 21, 12, 0, 0, 0).getTime();
    const groups = groupTimeEntriesByLocalDay(
      [
        createEntry({
          id: 'entry-1',
          startedAt: new Date(2026, 3, 21, 0, 30, 0, 0).toISOString(),
        }),
        createEntry({
          id: 'entry-2',
          startedAt: new Date(2026, 3, 20, 22, 30, 0, 0).toISOString(),
        }),
        createEntry({
          id: 'entry-3',
          startedAt: new Date(2026, 3, 21, 8, 0, 0, 0).toISOString(),
        }),
      ],
      nowMs,
    );

    expect(groups).toEqual([
      expect.objectContaining({
        dateKey: '2026-04-21',
        heading: 'Today, Apr 21',
        items: [
          expect.objectContaining({ id: 'entry-1' }),
          expect.objectContaining({ id: 'entry-3' }),
        ],
      }),
      expect.objectContaining({
        dateKey: '2026-04-20',
        heading: 'Yesterday, Apr 20',
        items: [expect.objectContaining({ id: 'entry-2' })],
      }),
    ]);
  });

  it('formats completed and running entry rows', () => {
    const nowMs = Date.parse('2026-04-21T11:00:05.000Z');
    const completedEntry = createEntry();
    const runningEntry = createEntry({
      durationSeconds: null,
      endedAt: null,
      startedAt: '2026-04-21T09:00:00.000Z',
    });
    expect(formatLocalTime('2026-04-21T09:00:00.000Z')).toBe('12:00');
    expect(formatTimeEntryDuration(completedEntry, nowMs)).toBe('1h 30m');
    expect(formatTimeEntryDuration(runningEntry, nowMs)).toBe('02:00:05');
    expect(formatTimeEntryTimeRange(completedEntry)).toBe('12:00 - 13:30');
    expect(formatTimeEntryTimeRange(runningEntry)).toBe('12:00 - Running');
  });

  it('counts only the entry overlap inside a requested time range', () => {
    const nowMs = Date.parse('2026-04-21T11:30:00.000Z');
    const runningEntry = createEntry({
      durationSeconds: null,
      endedAt: null,
      startedAt: '2026-04-21T10:30:00.000Z',
    });

    expect(
      getEntryTrackedSecondsWithinRange(
        runningEntry,
        Date.parse('2026-04-21T11:00:00.000Z'),
        Date.parse('2026-04-21T12:00:00.000Z'),
        nowMs,
      ),
    ).toBe(1800);
    expect(
      getEntryTrackedSecondsWithinRange(
        runningEntry,
        Date.parse('2026-04-21T12:00:00.000Z'),
        Date.parse('2026-04-21T13:00:00.000Z'),
        nowMs,
      ),
    ).toBe(0);
  });
});
