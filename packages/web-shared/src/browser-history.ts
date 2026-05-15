export function hasPriorBrowserHistory(
  windowObject: Pick<Window, "history"> | undefined =
    typeof window === "undefined" ? undefined : window,
): boolean {
  return Number(windowObject?.history.length ?? 0) > 1;
}
