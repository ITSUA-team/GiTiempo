export interface InvoiceTaskEntry {
  taskId: string;
  taskName: string | null;
  roundedDurationSeconds: number;
}

export interface InvoiceTaskGroup<T extends InvoiceTaskEntry> {
  taskId: string;
  taskName: string;
  entries: T[];
  sourceIndices: number[];
  roundedDurationSeconds: number;
}

export function groupInvoiceTimeByTask<T extends InvoiceTaskEntry>(
  entries: readonly T[],
): InvoiceTaskGroup<T>[] {
  const groups = new Map<string, InvoiceTaskGroup<T>>();
  const namedTasks = new Set<string>();

  entries.forEach((entry, index) => {
    let group = groups.get(entry.taskId);
    if (!group) {
      group = {
        taskId: entry.taskId,
        taskName: "Unnamed task",
        entries: [],
        sourceIndices: [],
        roundedDurationSeconds: 0,
      };
      groups.set(entry.taskId, group);
    }

    const taskName = entry.taskName?.trim();
    if (taskName && !namedTasks.has(entry.taskId)) {
      group.taskName = taskName;
      namedTasks.add(entry.taskId);
    }
    group.entries.push(entry);
    group.sourceIndices.push(index);
    group.roundedDurationSeconds += entry.roundedDurationSeconds;
  });

  return [...groups.values()];
}
