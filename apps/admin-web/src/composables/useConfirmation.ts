import { useConfirm } from 'primevue/useconfirm';

export function useConfirmation() {
  const confirm = useConfirm();

  function requireConfirmation(
    message: string,
    header: string,
    acceptLabel: string,
    accept: () => void,
  ): void {
    confirm.require({
      message,
      header,
      acceptLabel,
      rejectLabel: 'Cancel',
      acceptProps: { severity: 'danger' },
      accept,
    });
  }

  return { requireConfirmation };
}
