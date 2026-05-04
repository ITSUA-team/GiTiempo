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
import { requestJson } from '../http';

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
  return {
    async listProjects(accessToken) {
      return requestJson({
        fetchFn,
        apiBaseUrl,
        path: '/projects',
        responseSchema: projectListResponseSchema,
        accessToken,
      });
    },

    async getProject(projectId, accessToken) {
      return requestJson({
        fetchFn,
        apiBaseUrl,
        path: `/projects/${projectId}`,
        responseSchema: projectResponseSchema,
        accessToken,
      });
    },

    async createProject(input, accessToken) {
      return requestJson({
        fetchFn,
        apiBaseUrl,
        method: 'POST',
        path: '/projects',
        body: createProjectSchema.parse(input),
        responseSchema: projectResponseSchema,
        accessToken,
      });
    },

    async updateProject(projectId, input, accessToken) {
      return requestJson({
        fetchFn,
        apiBaseUrl,
        method: 'PATCH',
        path: `/projects/${projectId}`,
        body: updateProjectSchema.parse(input),
        responseSchema: projectResponseSchema,
        accessToken,
      });
    },

    async listProjectAssignments(projectId, accessToken) {
      return requestJson({
        fetchFn,
        apiBaseUrl,
        path: `/projects/${projectId}/assignments`,
        responseSchema: projectAssignmentListResponseSchema,
        accessToken,
      });
    },

    async assignUserToProject(projectId, input, accessToken) {
      return requestJson({
        fetchFn,
        apiBaseUrl,
        method: 'POST',
        path: `/projects/${projectId}/assignments`,
        body: createProjectAssignmentSchema.parse(input),
        responseSchema: projectAssignmentResponseSchema,
        accessToken,
      });
    },

    async removeProjectAssignment(projectId, userId, accessToken) {
      await requestJson({
        fetchFn,
        apiBaseUrl,
        method: 'DELETE',
        path: `/projects/${projectId}/assignments/${userId}`,
        responseSchema: emptyObjectSchema,
        accessToken,
      });
    },
  };
}
