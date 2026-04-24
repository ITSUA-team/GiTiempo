function getWorkspaceHref(
  configuredUrl: string | undefined,
  localhostPort: string,
  fallbackPath: string,
): string {
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

export function getUserWorkspaceHref(): string {
  return getWorkspaceHref(import.meta.env.VITE_USER_APP_URL, "5173", "/login");
}
