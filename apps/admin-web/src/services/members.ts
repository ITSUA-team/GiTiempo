import {
  workspaceMemberListResponseSchema,
  type WorkspaceMemberListResponse,
} from "@gitiempo/shared";
import { requestJson } from "@gitiempo/web-shared/http";

const BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

export async function fetchMembers(
  accessToken: string,
): Promise<WorkspaceMemberListResponse> {
  return requestJson({
    accessToken,
    apiBaseUrl: BASE,
    path: "/members",
    responseSchema: workspaceMemberListResponseSchema,
  });
}
