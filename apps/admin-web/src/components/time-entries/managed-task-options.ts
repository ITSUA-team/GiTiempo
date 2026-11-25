import type { ManagementTask } from '@/services/admin-time-entries-client';

export type ManagedTaskChoice = Pick<ManagementTask, 'id' | 'title'>;

export function managedTaskOptions(tasks: ManagedTaskChoice[]) {
  const usedLabels = new Set<string>();
  const repeatedTitles = new Set<string>();
  for (const { title } of tasks) {
    const key = title.toLocaleLowerCase();
    if (usedLabels.has(key)) repeatedTitles.add(key);
    usedLabels.add(key);
  }

  return tasks.map(task => {
    let label = task.title;
    if (repeatedTitles.has(label.toLocaleLowerCase())) {
      label = `${task.id.slice(0, 8)} · ${task.title}`;
      if (usedLabels.has(label.toLocaleLowerCase())) label = `${task.id} · ${task.title}`;
      for (let suffix = 2; usedLabels.has(label.toLocaleLowerCase()); suffix += 1) {
        label = `${task.id} (${suffix}) · ${task.title}`;
      }
      usedLabels.add(label.toLocaleLowerCase());
    }
    return { ...task, label };
  });
}
