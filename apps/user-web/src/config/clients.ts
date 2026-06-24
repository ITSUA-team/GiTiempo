import { getAuthenticatedAppApiClient } from "@/services/api-client";
import { createGitHubBrowsingClient } from "@/services/github-browsing-client";
import { createProfileGitHubClient } from "@/services/profile-github-client";
import { createTimeEntriesClient } from "@/services/time-entries-client";

export function createDefaultTimeEntriesClient() {
  return createTimeEntriesClient({ apiClient: getAuthenticatedAppApiClient() });
}

export function createDefaultProfileGitHubClient() {
  return createProfileGitHubClient({ apiClient: getAuthenticatedAppApiClient() });
}

export function createDefaultGitHubBrowsingClient() {
  return createGitHubBrowsingClient({ apiClient: getAuthenticatedAppApiClient() });
}
