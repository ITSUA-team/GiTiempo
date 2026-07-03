export interface CounterpartWorkspaceLinkOptions {
  configuredUrl?: string;
  fallbackPath: string;
}

function getResolvedOrigin(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location.origin;
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

export function getCounterpartWorkspaceAppHref({
  configuredUrl,
  fallbackPath,
}: CounterpartWorkspaceLinkOptions): string {
  const trimmedUrl = configuredUrl?.trim();
  const resolvedOrigin = getResolvedOrigin();

  if (trimmedUrl) {
    try {
      const url = resolvedOrigin
        ? new URL(trimmedUrl, resolvedOrigin)
        : new URL(trimmedUrl);

      url.pathname = "/";
      url.search = "";
      url.hash = "";

      return url.toString();
    } catch {
      if (trimmedUrl.startsWith("/")) {
        return resolvedOrigin
          ? new URL("/", resolvedOrigin).toString()
          : "/";
      }
    }
  }

  if (!resolvedOrigin) {
    return fallbackPath;
  }

  return new URL(fallbackPath, resolvedOrigin).toString();
}
