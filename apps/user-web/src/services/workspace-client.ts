import {
  createWorkspaceClient,
  type WorkspaceClient,
} from "@gitiempo/web-shared";

import { getAuthenticatedAppApiClient } from "@/services/api-client";

function createDefaultWorkspaceClient() {
  return createWorkspaceClient({
    apiClient: getAuthenticatedAppApiClient(),
  });
}

export const workspaceClient: WorkspaceClient = {
  getWorkspace() {
    return createDefaultWorkspaceClient().getWorkspace();
  },
  updateWorkspace(input) {
    return createDefaultWorkspaceClient().updateWorkspace(input);
  },
};
