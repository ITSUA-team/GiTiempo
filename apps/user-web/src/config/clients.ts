import { getAuthenticatedAppApiClient } from "@/services/api-client";
import { createGitHubClient } from "@/services/github-client";
import { createTimeEntriesClient } from "@/services/time-entries-client";

export function createDefaultTimeEntriesClient() {
  return createTimeEntriesClient({ apiClient: getAuthenticatedAppApiClient() });
}

export function createDefaultProfileGitHubClient() {
  return createGitHubClient({ apiClient: getAuthenticatedAppApiClient() });
}

export function createDefaultGitHubClient() {
  return createGitHubClient({ apiClient: getAuthenticatedAppApiClient() });
}
