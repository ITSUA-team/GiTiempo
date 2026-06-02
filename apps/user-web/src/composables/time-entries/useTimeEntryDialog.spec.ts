import { describe, expect, it } from "vitest";

import { useTimeEntryDialog } from "./useTimeEntryDialog";

describe("useTimeEntryDialog", () => {
  it("seeds day-level create dialogs from the rendered local day", () => {
    const dialog = useTimeEntryDialog();

    dialog.openCreateDialogState("2026-04-21");

    expect(dialog.dialogStartedAt.value).toEqual(new Date(2026, 3, 21, 9, 0, 0, 0));
    expect(dialog.dialogEndedAt.value).toEqual(new Date(2026, 3, 21, 10, 0, 0, 0));
  });

  it("ignores malformed day keys instead of creating utc-shifted presets", () => {
    const dialog = useTimeEntryDialog();

    dialog.openCreateDialogState("invalid-day");

    expect(dialog.dialogStartedAt.value).toBeNull();
    expect(dialog.dialogEndedAt.value).toBeNull();
  });
});
