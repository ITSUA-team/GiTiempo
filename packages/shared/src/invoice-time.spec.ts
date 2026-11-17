import { describe, expect, it } from "vitest";

import { groupInvoiceTimeByTask } from "./invoice-time.js";

const entry = (
  id: string,
  taskId: string,
  taskName: string | null,
  roundedDurationSeconds = 900,
  userId = "worker-a",
) => ({ id, taskId, taskName, roundedDurationSeconds, userId });

describe("groupInvoiceTimeByTask", () => {
  it("groups interleaved task IDs in first appearance order across workers", () => {
    const entries = [
      entry("one", "a", "Dashboard UX", 36000),
      entry("two", "b", "Invoice editing", 28800),
      entry("three", "a", "Dashboard UX", 25200, "worker-b"),
    ];
    const groups = groupInvoiceTimeByTask(entries);

    expect(groups).toEqual([
      { taskId: "a", taskName: "Dashboard UX", entries: [entries[0], entries[2]], sourceIndices: [0, 2], roundedDurationSeconds: 61200 },
      { taskId: "b", taskName: "Invoice editing", entries: [entries[1]], sourceIndices: [1], roundedDurationSeconds: 28800 },
    ]);
    expect(groups[0]?.entries[0]).toBe(entries[0]);
    expect(entries.map(item => item.id)).toEqual(["one", "two", "three"]);
  });

  it("keeps distinct tasks with equal names separate", () => {
    const groups = groupInvoiceTimeByTask([
      entry("one", "a", "Shared title"),
      entry("two", "b", "Shared title"),
    ]);

    expect(groups.map(group => group.taskId)).toEqual(["a", "b"]);
    expect(groups.map(group => group.taskName)).toEqual(["Shared title", "Shared title"]);
  });

  it("uses the first nonblank saved name and keeps unnamed task identities", () => {
    const groups = groupInvoiceTimeByTask([
      entry("one", "a", null),
      entry("two", "b", " \n "),
      entry("three", "a", "  Original  "),
      entry("four", "a", "Revised"),
      entry("five", "c", null),
    ]);

    expect(groups.map(group => [group.taskId, group.taskName])).toEqual([
      ["a", "Original"], ["b", "Unnamed task"], ["c", "Unnamed task"],
    ]);
  });

  it("does not replace a first saved name that happens to be Unnamed task", () => {
    expect(groupInvoiceTimeByTask([
      entry("one", "a", "Unnamed task"),
      entry("two", "a", "Revised"),
    ])[0]?.taskName).toBe("Unnamed task");
  });

  it("returns no groups for zero selected entries", () => {
    expect(groupInvoiceTimeByTask([])).toEqual([]);
  });

  it("sums per-entry rounded time without rounding the combined raw duration", () => {
    const entries = [
      { ...entry("one", "a", "Task"), durationSeconds: 360 },
      { ...entry("two", "a", "Task"), durationSeconds: 360 },
    ];
    expect(groupInvoiceTimeByTask(entries)[0]?.roundedDurationSeconds).toBe(1800);
    expect(groupInvoiceTimeByTask(entries.slice(1))[0]?.roundedDurationSeconds).toBe(900);
  });

  it("derives order and labels from included entries only", () => {
    const entries = [
      entry("excluded", "a", "Outdated"),
      entry("first", "b", "Second task"),
      entry("second", "a", "Included name"),
    ];
    expect(groupInvoiceTimeByTask(entries.filter(item => item.id !== "excluded"))
      .map(group => [group.taskId, group.taskName, group.sourceIndices])).toEqual([
      ["b", "Second task", [0]], ["a", "Included name", [1]],
    ]);
  });
});
