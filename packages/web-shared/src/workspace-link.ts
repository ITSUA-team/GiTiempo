export interface CounterpartWorkspaceLinkOptions {
  configuredUrl?: string;
  fallbackPath: string;
  localhostPort: string;
}

export function getCounterpartWorkspaceHref({
  configuredUrl,
  fallbackPath,
  localhostPort,
}: CounterpartWorkspaceLinkOptions): string {
  const trimmedUrl = configuredUrl?.trim();

  if (trimmedUrl) {
    return trimmedUrl;
  }

  if (typeof window === "undefined") {
    return fallbackPath;
  }

  const { hostname, origin, protocol } = window.location;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocalhost) {
    return `${protocol}//${hostname}:${localhostPort}${fallbackPath}`;
  }

  return new URL(fallbackPath, origin).toString();
}
