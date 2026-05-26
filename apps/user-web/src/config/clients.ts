import { appEnv } from "@/config/env";
import { createProfileGitHubClient } from "@/services/profile-github-client";
import { createTimeEntriesClient } from "@/services/time-entries-client";

export function createDefaultTimeEntriesClient() {
  return createTimeEntriesClient({ apiBaseUrl: appEnv.apiBaseUrl });
}

export function createDefaultProfileGitHubClient() {
  return createProfileGitHubClient({ apiBaseUrl: appEnv.apiBaseUrl });
}
