import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type {
  ManagementProjectSummaryResponse,
  ProjectListResponse,
  TimeReportExportQuery,
  TimeReportQuery,
  TimeReportResponse,
  UpdateWorkspaceInput,
  UpdateWorkspaceSettingsInput,
  WorkspaceInviteListResponse,
  WorkspaceMemberListResponse,
  WorkspaceResponse,
  WorkspaceSettingsResponse,
} from '@gitiempo/shared';
import {
  isQueryEnabled,
  requireAccessToken,
  type QueryAccessOptions,
} from '@gitiempo/web-shared/query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import {
  adminMembersKeys,
  adminMutationInvalidationKeys,
  adminProjectsKeys,
  adminSettingsKeys,
  reportsKeys,
  type AdminServerStateScope,
} from '@/lib/query-keys';

type QueryKey = readonly unknown[];

interface ReportsCsvExport {
  blob: Blob;
  filename: string;
}

/* eslint-disable no-unused-vars */
interface AdminProjectsClient {
  getManagementSummary(accessToken: string): Promise<ManagementProjectSummaryResponse>;
  listProjects(accessToken: string): Promise<ProjectListResponse>;
}

interface ExportTimeReportClient {
  exportTimeReport(
    accessToken: string,
    query?: Partial<TimeReportExportQuery>,
  ): Promise<ReportsCsvExport>;
}

interface TimeReportClient {
  getTimeReport(
    accessToken: string,
    query?: Partial<TimeReportQuery>,
  ): Promise<TimeReportResponse>;
}

interface UpdateWorkspaceClient {
  updateWorkspace(
    accessToken: string,
    input: UpdateWorkspaceInput,
  ): Promise<WorkspaceResponse>;
}

interface UpdateWorkspaceSettingsClient {
  updateWorkspaceSettings(
    accessToken: string,
    input: UpdateWorkspaceSettingsInput,
  ): Promise<WorkspaceSettingsResponse>;
}

interface WorkspaceClient {
  getWorkspace(accessToken: string): Promise<WorkspaceResponse>;
}

interface WorkspaceInvitesClient {
  listInvites(accessToken: string): Promise<WorkspaceInviteListResponse>;
}

interface WorkspaceMembersClient {
  listMembers(accessToken: string): Promise<WorkspaceMemberListResponse>;
}

interface WorkspaceSettingsClient {
  getWorkspaceSettings(accessToken: string): Promise<WorkspaceSettingsResponse>;
}
/* eslint-enable no-unused-vars */

interface AdminScopedQueryOptions extends QueryAccessOptions {
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}

interface AdminScopedMutationOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  scope: MaybeRefOrGetter<AdminServerStateScope>;
}

interface UseAdminProjectsQueryOptions extends AdminScopedQueryOptions {
  client: Pick<AdminProjectsClient, 'listProjects'>;
}

interface UseExportTimeReportMutationOptions extends AdminScopedMutationOptions {
  client: ExportTimeReportClient;
}

interface UseManagementProjectSummaryQueryOptions extends AdminScopedQueryOptions {
  client: Pick<AdminProjectsClient, 'getManagementSummary'>;
}

interface UseTimeReportQueryOptions extends AdminScopedQueryOptions {
  client: TimeReportClient;
  query: MaybeRefOrGetter<Partial<TimeReportQuery>>;
}

interface UseUpdateWorkspaceMutationOptions extends AdminScopedMutationOptions {
  client: UpdateWorkspaceClient;
}

interface UseUpdateWorkspaceSettingsMutationOptions extends AdminScopedMutationOptions {
  client: UpdateWorkspaceSettingsClient;
}

interface UseWorkspaceInvitesQueryOptions extends AdminScopedQueryOptions {
  client: WorkspaceInvitesClient;
}

interface UseWorkspaceMembersQueryOptions extends AdminScopedQueryOptions {
  client: WorkspaceMembersClient;
}

interface UseWorkspaceQueryOptions extends AdminScopedQueryOptions {
  client: WorkspaceClient;
}

interface UseWorkspaceSettingsQueryOptions extends AdminScopedQueryOptions {
  client: WorkspaceSettingsClient;
}

async function invalidateQueryKeys(
  queryClient: ReturnType<typeof useQueryClient>,
  keys: QueryKey[],
): Promise<void> {
  await Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

export const useAdminProjectsQuery = (options: UseAdminProjectsQueryOptions) =>
  useQuery({
    queryKey: computed(() => adminProjectsKeys.list(toValue(options.scope))),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.listProjects(
        requireAccessToken(toValue(options.accessToken)),
      ),
  });

export const useExportTimeReportMutation = (
  options: UseExportTimeReportMutationOptions,
) =>
  useMutation({
    mutationFn: (query: Partial<TimeReportExportQuery>) =>
      options.client.exportTimeReport(
        requireAccessToken(toValue(options.accessToken)),
        query,
      ),
  });

export const useManagementProjectSummaryQuery = (
  options: UseManagementProjectSummaryQueryOptions,
) =>
  useQuery({
    queryKey: computed(() => adminProjectsKeys.summary(toValue(options.scope))),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.getManagementSummary(
        requireAccessToken(toValue(options.accessToken)),
      ),
  });

export const useTimeReportQuery = (options: UseTimeReportQueryOptions) =>
  useQuery({
    queryKey: computed(() =>
      reportsKeys.time(toValue(options.scope), toValue(options.query)),
    ),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.getTimeReport(
        requireAccessToken(toValue(options.accessToken)),
        toValue(options.query),
      ),
  });

export const useUpdateWorkspaceMutation = (
  options: UseUpdateWorkspaceMutationOptions,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWorkspaceInput) =>
      options.client.updateWorkspace(
        requireAccessToken(toValue(options.accessToken)),
        input,
      ),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        adminMutationInvalidationKeys.afterSettingsSave(toValue(options.scope)),
      );
    },
  });
};

export const useUpdateWorkspaceSettingsMutation = (
  options: UseUpdateWorkspaceSettingsMutationOptions,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWorkspaceSettingsInput) =>
      options.client.updateWorkspaceSettings(
        requireAccessToken(toValue(options.accessToken)),
        input,
      ),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        adminMutationInvalidationKeys.afterSettingsSave(toValue(options.scope)),
      );
    },
  });
};

export const useWorkspaceInvitesQuery = (options: UseWorkspaceInvitesQueryOptions) =>
  useQuery({
    queryKey: computed(() => adminMembersKeys.invites(toValue(options.scope))),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.listInvites(requireAccessToken(toValue(options.accessToken))),
  });

export const useWorkspaceMembersQuery = (options: UseWorkspaceMembersQueryOptions) =>
  useQuery({
    queryKey: computed(() => adminMembersKeys.list(toValue(options.scope))),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.listMembers(requireAccessToken(toValue(options.accessToken))),
  });

export const useWorkspaceQuery = (options: UseWorkspaceQueryOptions) =>
  useQuery({
    queryKey: computed(() => adminSettingsKeys.workspace(toValue(options.scope))),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.getWorkspace(requireAccessToken(toValue(options.accessToken))),
  });

export const useWorkspaceSettingsQuery = (
  options: UseWorkspaceSettingsQueryOptions,
) =>
  useQuery({
    queryKey: computed(() => adminSettingsKeys.workspaceSettings(toValue(options.scope))),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.getWorkspaceSettings(
        requireAccessToken(toValue(options.accessToken)),
      ),
  });
