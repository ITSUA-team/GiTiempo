import { createAppToast, type FeedbackLogContext } from '@gitiempo/web-shared';
import { useToast } from 'primevue/usetoast';

interface ErrorToastOptions {
  error?: unknown;
  logContext?: FeedbackLogContext;
}

const fallbackLogContext: FeedbackLogContext = { feature: 'app', action: 'unknown' };

export function useToasts() {
  const toast = useToast();
  const { showSuccessToast, showErrorToast } = createAppToast(toast);

  function infoToast(message: string): void {
    toast.add({ detail: message, life: 4000, severity: 'info', summary: 'Info' });
  }

  function successToast(message: string): void {
    showSuccessToast('Success', message);
  }

  function errorToast(message: string, options: ErrorToastOptions = {}): void {
    showErrorToast({
      summary: 'Error',
      detail: message,
      error: options.error,
      logContext: options.logContext ?? fallbackLogContext,
    });
  }

  return { successToast, errorToast, infoToast };
}
