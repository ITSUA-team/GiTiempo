import {
  managementProjectSummaryResponseSchema,
  projectAssignmentListResponseSchema,
  projectListResponseSchema,
  projectResponseSchema,
  type CreateProjectInput,
  type ManagementProjectSummaryResponse,
  type ProjectAssignmentListResponse,
  type ProjectListResponse,
  type ProjectResponse,
  type UpdateProjectInput,
} from "@gitiempo/shared";
import { requestJson } from "@gitiempo/web-shared/http";

const BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

export async function fetchProjects(
  accessToken: string,
): Promise<ProjectListResponse> {
  return requestJson({
    accessToken,
    apiBaseUrl: BASE,
    path: "/projects",
    responseSchema: projectListResponseSchema,
  });
}

export async function fetchProjectSummary(
  accessToken: string,
): Promise<ManagementProjectSummaryResponse> {
  return requestJson({
    accessToken,
    apiBaseUrl: BASE,
    path: "/projects/summary",
    responseSchema: managementProjectSummaryResponseSchema,
  });
}

export async function fetchProjectAssignments(
  accessToken: string,
  projectId: string,
): Promise<ProjectAssignmentListResponse> {
  return requestJson({
    accessToken,
    apiBaseUrl: BASE,
    path: `/projects/${projectId}/assignments`,
    responseSchema: projectAssignmentListResponseSchema,
  });
}

export async function createProject(
  accessToken: string,
  body: CreateProjectInput,
): Promise<ProjectResponse> {
  return requestJson({
    accessToken,
    apiBaseUrl: BASE,
    body,
    method: "POST",
    path: "/projects",
    responseSchema: projectResponseSchema,
  });
}

export async function updateProject(
  accessToken: string,
  projectId: string,
  body: UpdateProjectInput,
): Promise<ProjectResponse> {
  return requestJson({
    accessToken,
    apiBaseUrl: BASE,
    body,
    method: "PATCH",
    path: `/projects/${projectId}`,
    responseSchema: projectResponseSchema,
  });
}

export async function assignMember(
  accessToken: string,
  projectId: string,
  userId: string,
): Promise<void> {
  await requestJson({
    accessToken,
    apiBaseUrl: BASE,
    body: { userId },
    method: "POST",
    path: `/projects/${projectId}/assignments`,
    responseSchema: projectAssignmentListResponseSchema,
  });
}

export async function removeAssignment(
  accessToken: string,
  projectId: string,
  assignmentId: string,
): Promise<void> {
  await requestJson({
    accessToken,
    apiBaseUrl: BASE,
    method: "DELETE",
    path: `/projects/${projectId}/assignments/${assignmentId}`,
    responseSchema: projectAssignmentListResponseSchema,
  });
}
