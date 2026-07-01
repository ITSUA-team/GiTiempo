import {
  acceptWorkspaceInviteSchema,
  type AcceptWorkspaceInviteInput,
} from "@gitiempo/shared";
import {
  createResponseError,
  getDefaultFetchFn,
  getRequestUrl,
} from "@gitiempo/web-shared/http";


interface WorkspaceInvitesClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface WorkspaceInvitesClient {
  acceptInvite(input: AcceptWorkspaceInviteInput): Promise<void>;
}


export function createWorkspaceInvitesClient({
  apiBaseUrl,
  fetchFn = getDefaultFetchFn(),
}: WorkspaceInvitesClientOptions = {}): WorkspaceInvitesClient {
  return {
    async acceptInvite(input) {
      const response = await fetchFn(getRequestUrl(apiBaseUrl, "/invites/accept"), {
        body: JSON.stringify(acceptWorkspaceInviteSchema.parse(input)),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw await createResponseError(response);
      }
    },
  };
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const defaultWorkspaceInvitesClient = createWorkspaceInvitesClient({ apiBaseUrl });

let workspaceInvitesClient = defaultWorkspaceInvitesClient;

export function getWorkspaceInvitesClient(): WorkspaceInvitesClient {
  return workspaceInvitesClient;
}

export function setWorkspaceInvitesClientForTesting(
  client: WorkspaceInvitesClient,
): void {
  workspaceInvitesClient = client;
}

export function resetWorkspaceInvitesClientForTesting(): void {
  workspaceInvitesClient = defaultWorkspaceInvitesClient;
}
