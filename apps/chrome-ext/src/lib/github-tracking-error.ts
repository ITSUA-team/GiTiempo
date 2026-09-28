import {
  githubTrackingErrorCodeSchema,
  type GitHubTrackingErrorCode,
} from "@gitiempo/shared";

export class ExtensionApiError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = "ExtensionApiError";
    this.code = code;
  }
}

export function getGitHubTrackingErrorCode(error: unknown): GitHubTrackingErrorCode | null {
  if (!(error instanceof ExtensionApiError)) {
    return null;
  }

  const parsed = githubTrackingErrorCodeSchema.safeParse(error.code);

  return parsed.success ? parsed.data : null;
}
