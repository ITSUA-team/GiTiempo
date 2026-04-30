export interface CounterpartWorkspaceLinkOptions {
  configuredUrl?: string;
  fallbackPath: string;
}

export function getCounterpartWorkspaceHref({
  configuredUrl,
  fallbackPath,
}: CounterpartWorkspaceLinkOptions): string {
  const trimmedUrl = configuredUrl?.trim();

  if (trimmedUrl) {
    return trimmedUrl;
  }

  if (typeof window === "undefined") {
    return fallbackPath;
  }

  return new URL(fallbackPath, window.location.origin).toString();
}
