import {
  createWorkspaceClient,
  type WorkspaceClient,
} from "@gitiempo/web-shared";

import { getAuthenticatedAppApiClient } from "@/services/api-client";

let defaultWorkspaceClient: WorkspaceClient | null = null;

export function getWorkspaceClient(): WorkspaceClient {
  defaultWorkspaceClient ??= createWorkspaceClient({
    apiClient: getAuthenticatedAppApiClient(),
  });

  return defaultWorkspaceClient;
}
