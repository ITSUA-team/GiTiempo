import { createAppToast } from '@gitiempo/web-shared';
import { useToast } from 'primevue/usetoast';

export function useToasts() {
  const { showSuccessToast, showErrorToast } = createAppToast(useToast());

  function successToast(message: string): void {
    showSuccessToast('Success', message);
  }

  function errorToast(message: string): void {
    showErrorToast({ summary: 'Error', detail: message, logContext: { feature: 'app', action: 'unknown' } });
  }

  return { successToast, errorToast };
}
