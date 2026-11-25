import { describe, expect, it } from 'vitest';

import { managedTaskOptions } from './managed-task-options';

describe('managedTaskOptions', () => {
  it('makes titles that differ only by case unambiguous and keeps unique titles', () => {
    const tasks = [
      { id: '10000000-0000-4000-8000-000000000001', title: 'Fix login' },
      { id: '20000000-0000-4000-8000-000000000002', title: 'Fix Login' },
      { id: '30000000-0000-4000-8000-000000000003', title: 'Review invoices' },
    ];

    expect(managedTaskOptions(tasks)).toEqual([
      { ...tasks[0], label: '10000000 · Fix login' },
      { ...tasks[1], label: '20000000 · Fix Login' },
      { ...tasks[2], label: 'Review invoices' },
    ]);
  });

  it('keeps generated labels distinct from colliding IDs and existing titles', () => {
    const firstId = '10000000-0000-4000-8000-000000000001';
    const secondId = '10000000-0000-4000-8000-000000000002';
    const tasks = [
      { id: firstId, title: 'Fix login' },
      { id: secondId, title: 'Fix login' },
      { id: '50000000-0000-4000-8000-000000000001', title: '10000000 · Fix login' },
      { id: '60000000-0000-4000-8000-000000000001', title: `${firstId} · Fix logIn` },
    ];

    const options = managedTaskOptions(tasks);
    expect(options).toEqual([
      { ...tasks[0], label: `${firstId} (2) · Fix login` },
      { ...tasks[1], label: `${secondId} · Fix login` },
      { ...tasks[2], label: tasks[2].title },
      { ...tasks[3], label: tasks[3].title },
    ]);
  });
});
