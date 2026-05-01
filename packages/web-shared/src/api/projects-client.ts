import {
  projectListResponseSchema,
  projectResponseSchema,
  projectAssignmentListResponseSchema,
  projectAssignmentResponseSchema,
  createProjectSchema,
  updateProjectSchema,
  createProjectAssignmentSchema,
  type ProjectResponse,
  type ProjectListResponse,
  type ProjectAssignmentListResponse,
  type ProjectAssignmentResponse,
  type CreateProjectInput,
  type UpdateProjectInput,
  type CreateProjectAssignmentInput,
} from '@gitiempo/shared';
import { z } from 'zod';
import { getJson, postJson, patchJson, deleteJson } from './http-helpers';

/* eslint-disable no-unused-vars */

interface ProjectsClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface ProjectsClient {
  listProjects(accessToken: string): Promise<ProjectListResponse>;
  getProject(projectId: string, accessToken: string): Promise<ProjectResponse>;
  createProject(
    input: CreateProjectInput,
    accessToken: string,
  ): Promise<ProjectResponse>;
  updateProject(
    projectId: string,
    input: UpdateProjectInput,
    accessToken: string,
  ): Promise<ProjectResponse>;
  listProjectAssignments(
    projectId: string,
    accessToken: string,
  ): Promise<ProjectAssignmentListResponse>;
  assignUserToProject(
    projectId: string,
    input: CreateProjectAssignmentInput,
    accessToken: string,
  ): Promise<ProjectAssignmentResponse>;
  removeProjectAssignment(
    projectId: string,
    userId: string,
    accessToken: string,
  ): Promise<void>;
}

/* eslint-enable no-unused-vars */

const emptyObjectSchema = z.object({});

export function createProjectsClient({
  apiBaseUrl,
  fetchFn = fetch,
}: ProjectsClientOptions = {}): ProjectsClient {
  const authHeaders = (accessToken: string) => ({
    Authorization: `Bearer ${accessToken}`,
  });

  return {
    async listProjects(accessToken) {
      return getJson(
        fetchFn,
        apiBaseUrl,
        '/projects',
        projectListResponseSchema,
        { headers: authHeaders(accessToken) },
      );
    },

    async getProject(projectId, accessToken) {
      return getJson(
        fetchFn,
        apiBaseUrl,
        `/projects/${projectId}`,
        projectResponseSchema,
        { headers: authHeaders(accessToken) },
      );
    },

    async createProject(input, accessToken) {
      return postJson(
        fetchFn,
        apiBaseUrl,
        '/projects',
        createProjectSchema.parse(input),
        projectResponseSchema,
        { headers: authHeaders(accessToken) },
      );
    },

    async updateProject(projectId, input, accessToken) {
      return patchJson(
        fetchFn,
        apiBaseUrl,
        `/projects/${projectId}`,
        updateProjectSchema.parse(input),
        projectResponseSchema,
        { headers: authHeaders(accessToken) },
      );
    },

    async listProjectAssignments(projectId, accessToken) {
      return getJson(
        fetchFn,
        apiBaseUrl,
        `/projects/${projectId}/assignments`,
        projectAssignmentListResponseSchema,
        { headers: authHeaders(accessToken) },
      );
    },

    async assignUserToProject(projectId, input, accessToken) {
      return postJson(
        fetchFn,
        apiBaseUrl,
        `/projects/${projectId}/assignments`,
        createProjectAssignmentSchema.parse(input),
        projectAssignmentResponseSchema,
        { headers: authHeaders(accessToken) },
      );
    },

    async removeProjectAssignment(projectId, userId, accessToken) {
      await deleteJson(
        fetchFn,
        apiBaseUrl,
        `/projects/${projectId}/assignments/${userId}`,
        emptyObjectSchema,
        { headers: authHeaders(accessToken) },
      );
    },
  };
}
