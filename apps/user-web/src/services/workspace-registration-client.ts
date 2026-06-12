import {
  registerRequestSchema,
  tokenPairResponseSchema,
  type RegisterRequest,
  type TokenPairResponse,
} from "@gitiempo/shared";
import {
  createResponseError,
  getDefaultFetchFn,
  getRequestUrl,
} from "@gitiempo/web-shared/http";

import { appEnv } from "@/config/env";

/* eslint-disable no-unused-vars */

interface WorkspaceRegistrationClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface WorkspaceRegistrationClient {
  register(input: RegisterRequest): Promise<TokenPairResponse>;
}

/* eslint-enable no-unused-vars */

export function createWorkspaceRegistrationClient({
  apiBaseUrl,
  fetchFn = getDefaultFetchFn(),
}: WorkspaceRegistrationClientOptions = {}): WorkspaceRegistrationClient {
  return {
    async register(input) {
      const response = await fetchFn(getRequestUrl(apiBaseUrl, "/auth/register"), {
        body: JSON.stringify(registerRequestSchema.parse(input)),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw await createResponseError(response);
      }

      return tokenPairResponseSchema.parse(await response.json());
    },
  };
}

const defaultWorkspaceRegistrationClient = createWorkspaceRegistrationClient({
  apiBaseUrl: appEnv.apiBaseUrl,
});

let workspaceRegistrationClient = defaultWorkspaceRegistrationClient;

export function getWorkspaceRegistrationClient(): WorkspaceRegistrationClient {
  return workspaceRegistrationClient;
}

export function setWorkspaceRegistrationClientForTesting(
  client: WorkspaceRegistrationClient,
): void {
  workspaceRegistrationClient = client;
}

export function resetWorkspaceRegistrationClientForTesting(): void {
  workspaceRegistrationClient = defaultWorkspaceRegistrationClient;
}
