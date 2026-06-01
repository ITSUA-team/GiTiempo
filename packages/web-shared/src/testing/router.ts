import type { Router } from "vue-router";

export async function waitForRoute(
  router: Router,
  matches: () => boolean,
  timeoutMs = 5000,
): Promise<void> {
  if (matches()) return;

  await new Promise<void>((resolve, reject) => {
    let stop: (() => void) | undefined;

    const timeout = setTimeout(() => {
      stop?.();
      reject(
        new Error(
          `Timed out waiting for route navigation. Current route: ${router.currentRoute.value.fullPath}`,
        ),
      );
    }, timeoutMs);

    stop = router.afterEach(() => {
      if (!matches()) return;

      clearTimeout(timeout);
      stop?.();
      resolve();
    });
  });
}
