import { ref, type ComputedRef, type Ref } from 'vue';
import type {
  WorkspaceResponse,
  WorkspaceSettingsResponse,
} from '@gitiempo/shared';
import {
  useUpdateWorkspaceMutation,
  useUpdateWorkspaceSettingsMutation,
} from '@/composables/query';

import {
  getAdminSettingsClient,
  type AdminSettingsClient,
} from '@/services/admin-settings-client';
import type { AdminServerStateScope } from '@/lib/query-keys';
import {
  getWorkspaceSettingsUpdatePayload,
  getWorkspaceUpdatePayload,
  toAdminSettingsFormValues,
  type AdminSettingsFormValues,
} from './admin-settings-form';

interface SaveAdminSettingsInput {
  current: AdminSettingsFormValues | null;
  settings: WorkspaceSettingsResponse | null;
  values: AdminSettingsFormValues | null;
  workspace: WorkspaceResponse | null;
}

type SaveAdminSettingsResult =
  | {
      settings: WorkspaceSettingsResponse;
      values: AdminSettingsFormValues;
      workspace: WorkspaceResponse;
      wroteChanges: true;
    }
  | {
      settings: WorkspaceSettingsResponse | null;
      values: AdminSettingsFormValues;
      workspace: WorkspaceResponse | null;
      wroteChanges: false;
    };

interface UseAdminSettingsPersistenceOptions {
  client?: Pick<
    AdminSettingsClient,
    'updateWorkspace' | 'updateWorkspaceSettings'
  >;
  enabled: Ref<boolean> | ComputedRef<boolean>;
  onError?: (message: string, error: unknown) => void;
  scope: Ref<AdminServerStateScope> | ComputedRef<AdminServerStateScope>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

export function useAdminSettingsPersistence({
  client = getAdminSettingsClient(),
  enabled,
  onError,
  scope,
}: UseAdminSettingsPersistenceOptions) {
  const saving = ref(false);
  const updateWorkspaceMutation = useUpdateWorkspaceMutation({
    client,
    scope,
  });
  const updateWorkspaceSettingsMutation = useUpdateWorkspaceSettingsMutation({
    client,
    scope,
  });

  async function saveSettings({
    current,
    settings,
    values,
    workspace,
  }: SaveAdminSettingsInput): Promise<SaveAdminSettingsResult | null> {
    if (!enabled.value || !current || !values || saving.value) return null;

    const workspacePayload = getWorkspaceUpdatePayload(values, current);
    const settingsPayload = getWorkspaceSettingsUpdatePayload(values, current);

    if (!workspacePayload && !settingsPayload) {
      return {
        settings,
        values,
        workspace,
        wroteChanges: false,
      };
    }

    saving.value = true;

    try {
      const nextWorkspace = workspacePayload
        ? await updateWorkspaceMutation.mutateAsync(workspacePayload)
        : workspace;
      const nextSettings = settingsPayload
        ? await updateWorkspaceSettingsMutation.mutateAsync(settingsPayload)
        : settings;

      if (!nextWorkspace || !nextSettings) {
        throw new Error('Settings could not be reconciled.');
      }

      return {
        settings: nextSettings,
        values: toAdminSettingsFormValues(nextWorkspace, nextSettings),
        workspace: nextWorkspace,
        wroteChanges: true,
      };
    } catch (error) {
      const message = getErrorMessage(error);
      onError?.(message, error);
      return null;
    } finally {
      saving.value = false;
    }
  }

  return {
    saveSettings,
    saving,
  };
}

export type { SaveAdminSettingsInput, SaveAdminSettingsResult };
