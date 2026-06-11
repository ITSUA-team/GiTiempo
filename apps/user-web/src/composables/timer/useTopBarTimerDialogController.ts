import { inject, provide, readonly, shallowRef } from "vue";
import type { InjectionKey, Ref } from "vue";

export interface TopBarTimerDialogController {
  openRequestId: Readonly<Ref<number>>;
  requestOpen: () => void;
}

export const topBarTimerDialogControllerKey: InjectionKey<TopBarTimerDialogController> =
  Symbol("top-bar-timer-dialog-controller");

export function provideTopBarTimerDialogController(): TopBarTimerDialogController {
  const openRequestId = shallowRef(0);

  const controller: TopBarTimerDialogController = {
    openRequestId: readonly(openRequestId),
    requestOpen() {
      openRequestId.value += 1;
    },
  };

  provide(topBarTimerDialogControllerKey, controller);

  return controller;
}

export function useTopBarTimerDialogController(): TopBarTimerDialogController {
  const controller = inject(topBarTimerDialogControllerKey, null);

  if (!controller) {
    throw new Error("Top-bar timer dialog controller is not provided.");
  }

  return controller;
}
