export const OPEN_TOP_BAR_TIMER_DIALOG_EVENT = "gitiempo:open-top-bar-timer-dialog";

export function requestTopBarTimerDialog(): void {
  window.dispatchEvent(new Event(OPEN_TOP_BAR_TIMER_DIALOG_EVENT));
}

export function addTopBarTimerDialogRequestListener(
  listener: () => void,
): () => void {
  window.addEventListener(OPEN_TOP_BAR_TIMER_DIALOG_EVENT, listener);

  return () => {
    window.removeEventListener(OPEN_TOP_BAR_TIMER_DIALOG_EVENT, listener);
  };
}
