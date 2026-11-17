import { createAppConfirm } from '@gitiempo/web-shared';
import { useConfirm } from 'primevue/useconfirm';

export function useConfirmation() {
  const service = useConfirm();
  const { confirmDestructive } = createAppConfirm(service);

  function requireConfirmation(
    message: string,
    header: string,
    acceptLabel: string,
    accept: () => void,
  ): void {
    confirmDestructive({ accept, acceptLabel, header, message });
  }

  return { dismissConfirmation: () => service.close(), requireConfirmation };
}
