import { describe, expect, it, vi } from "vitest";

import {
  createAppConfirm,
  createAppToast,
  runWithFeedback,
} from "./feedback";

describe("createAppToast", () => {
  it("shows success toasts with the shared default lifetime", () => {
    const toast = { add: vi.fn() };
    const appToast = createAppToast(toast);

    appToast.showSuccessToast("Saved", "The change was saved.");

    expect(toast.add).toHaveBeenCalledWith({
      detail: "The change was saved.",
      life: 4000,
      severity: "success",
      summary: "Saved",
    });
  });

  it("shows info toasts with the shared default lifetime", () => {
    const toast = { add: vi.fn() };
    const appToast = createAppToast(toast);

    appToast.showInfoToast("Info", "No data to export.");

    expect(toast.add).toHaveBeenCalledWith({
      detail: "No data to export.",
      life: 4000,
      severity: "info",
      summary: "Info",
    });
  });

  it("shows safe error toast copy without rendering backend error messages", () => {
    const toast = { add: vi.fn() };
    const logger = { error: vi.fn() };
    const appToast = createAppToast(toast, logger);

    appToast.showErrorToast({
      detail: "Please try again.",
      error: new Error("Backend says no"),
      logContext: { action: "save-profile", feature: "profile" },
      summary: "Could not save profile",
    });

    expect(toast.add).toHaveBeenCalledWith({
      detail: "Please try again.",
      severity: "error",
      summary: "Could not save profile",
    });
    expect(toast.add).not.toHaveBeenCalledWith(
      expect.objectContaining({ detail: "Backend says no" }),
    );
  });

  it("logs backend errors with operation context", () => {
    const toast = { add: vi.fn() };
    const logger = { error: vi.fn() };
    const appToast = createAppToast(toast, logger);
    const error = new Error("Disconnect failed");

    appToast.showErrorToast({
      detail: "Please try again.",
      error,
      logContext: { action: "disconnect", feature: "profile-github" },
      summary: "Could not disconnect GitHub",
    });

    expect(logger.error).toHaveBeenCalledWith("Could not disconnect GitHub", {
      context: { action: "disconnect", feature: "profile-github" },
      error,
    });
  });
});

describe("createAppConfirm", () => {
  it("applies destructive confirmation defaults", () => {
    const confirm = { require: vi.fn() };
    const appConfirm = createAppConfirm(confirm);
    const accept = vi.fn(async () => undefined);

    appConfirm.confirmDestructive({
      accept,
      acceptLabel: "Disconnect",
      header: "Disconnect GitHub?",
      message: "This will remove the current GitHub connection.",
    });

    expect(confirm.require).toHaveBeenCalledWith({
      accept,
      acceptLabel: "Disconnect",
      acceptProps: { severity: "danger", variant: "outlined" },
      header: "Disconnect GitHub?",
      message: "This will remove the current GitHub connection.",
      pt: {
        footer: { class: "flex flex-row-reverse justify-between gap-2" },
      },
      rejectLabel: "Cancel",
      rejectProps: {
        severity: "secondary",
        variant: "outlined",
      },
    });
  });
});

describe("runWithFeedback", () => {
  it("shows success feedback for successful actions", async () => {
    const toast = {
      showErrorToast: vi.fn(),
      showSuccessToast: vi.fn(),
    };

    const result = await runWithFeedback({
      onSuccess: {
        detail: "The change was saved.",
        summary: "Saved",
      },
      run: async () => "ok",
      toast,
    });

    expect(result).toBe("ok");
    expect(toast.showSuccessToast).toHaveBeenCalledWith(
      "Saved",
      "The change was saved.",
    );
  });

  it("shows safe failure feedback and rethrows the original error", async () => {
    const toast = {
      showErrorToast: vi.fn(),
      showSuccessToast: vi.fn(),
    };
    const error = new Error("backend failure");

    await expect(
      runWithFeedback({
        onError: {
          detail: "Please try again.",
          logContext: { action: "save-profile", feature: "profile" },
          summary: "Could not save profile",
        },
        run: async () => {
          throw error;
        },
        toast,
      }),
    ).rejects.toThrow("backend failure");

    expect(toast.showErrorToast).toHaveBeenCalledWith({
      detail: "Please try again.",
      error,
      logContext: { action: "save-profile", feature: "profile" },
      summary: "Could not save profile",
    });
  });
});
