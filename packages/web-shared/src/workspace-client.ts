import {
  updateWorkspaceSchema,
  workspaceResponseSchema,
  type UpdateWorkspaceInput,
  type WorkspaceResponse,
} from "@gitiempo/shared";
import type { AuthenticatedApiClient } from "./http";

/* eslint-disable no-unused-vars */

interface WorkspaceClientOptions {
  apiClient: Pick<AuthenticatedApiClient, "requestJson">;
}

export interface WorkspaceClient {
  getWorkspace(): Promise<WorkspaceResponse>;
  updateWorkspace(input: UpdateWorkspaceInput): Promise<WorkspaceResponse>;
}

/* eslint-enable no-unused-vars */

export function createWorkspaceClient({
  apiClient,
}: WorkspaceClientOptions): WorkspaceClient {
  return {
    getWorkspace() {
      return apiClient.requestJson({
        path: "/workspace",
        responseSchema: workspaceResponseSchema,
      });
    },

    updateWorkspace(input) {
      return apiClient.requestJson({
        body: updateWorkspaceSchema.parse(input),
        method: "PATCH",
        path: "/workspace",
        responseSchema: workspaceResponseSchema,
      });
    },
  };
}
