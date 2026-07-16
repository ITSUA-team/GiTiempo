import { createAppConfirm } from '@gitiempo/web-shared';
import { useConfirm } from 'primevue/useconfirm';

export function useConfirmation() {
  const { confirmDestructive } = createAppConfirm(useConfirm());

  function requireConfirmation(
    message: string,
    header: string,
    acceptLabel: string,
    accept: () => void,
  ): void {
    confirmDestructive({ accept, acceptLabel, header, message });
  }

  return { requireConfirmation };
}
