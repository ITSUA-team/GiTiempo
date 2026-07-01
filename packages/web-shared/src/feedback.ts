
export interface ConfirmLike {
  require(options: {
    accept: () => void | Promise<void>;
    acceptLabel: string;
    acceptProps: { severity: "danger" };
    header: string;
    message: string;
    rejectLabel: string;
  }): void;
}

export interface ToastLike {
  add(message: {
    detail: string;
    life?: number;
    severity: "error" | "info" | "success";
    summary: string;
  }): void;
}

export interface FeedbackLogContext {
  action: string;
  feature: string;
}

export interface FeedbackLogger {
  error(message: string, metadata: { context: FeedbackLogContext; error: unknown }): void;
}

interface ErrorToastOptions {
  detail: string;
  error?: unknown;
  logContext: FeedbackLogContext;
  summary: string;
}

interface DestructiveConfirmOptions {
  accept: () => void | Promise<void>;
  acceptLabel: string;
  header: string;
  message: string;
  rejectLabel?: string;
}

interface FeedbackCopy {
  detail: string;
  summary: string;
}

interface RunWithFeedbackOptions<T> {
  onError?: {
    detail: string;
    logContext: FeedbackLogContext;
    summary: string;
  };
  onSuccess?: FeedbackCopy;
  run: () => Promise<T>;
  toast: Pick<ReturnType<typeof createAppToast>, "showErrorToast" | "showSuccessToast">;
}


const dismissibleToastLife = 4000;

const defaultFeedbackLogger: FeedbackLogger = {
  error(message, metadata) {
    console.error(message, metadata);
  },
};

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  return error instanceof Error ? error.message : fallback;
}

export function createAppToast(
  toast: ToastLike,
  logger: FeedbackLogger = defaultFeedbackLogger,
) {
  function showErrorToast({ detail, error, logContext, summary }: ErrorToastOptions): void {
    if (error !== undefined) {
      logger.error(summary, {
        context: logContext,
        error,
      });
    }

    toast.add({ detail, severity: "error", summary });
  }

  function showSuccessToast(summary: string, detail: string): void {
    toast.add({ detail, life: dismissibleToastLife, severity: "success", summary });
  }

  function showInfoToast(summary: string, detail: string): void {
    toast.add({ detail, life: dismissibleToastLife, severity: "info", summary });
  }

  return {
    showErrorToast,
    showInfoToast,
    showSuccessToast,
  };
}

export function createAppConfirm(confirm: ConfirmLike) {
  function confirmDestructive({
    accept,
    acceptLabel,
    header,
    message,
    rejectLabel = "Cancel",
  }: DestructiveConfirmOptions): void {
    confirm.require({
      accept,
      acceptLabel,
      acceptProps: { severity: "danger" },
      header,
      message,
      rejectLabel,
    });
  }

  return {
    confirmDestructive,
  };
}

export async function runWithFeedback<T>({
  onError,
  onSuccess,
  run,
  toast,
}: RunWithFeedbackOptions<T>): Promise<T> {
  try {
    const result = await run();

    if (onSuccess) {
      toast.showSuccessToast(onSuccess.summary, onSuccess.detail);
    }

    return result;
  } catch (error) {
    if (onError) {
      toast.showErrorToast({
        detail: onError.detail,
        error,
        logContext: onError.logContext,
        summary: onError.summary,
      });
    }

    throw error;
  }
}
