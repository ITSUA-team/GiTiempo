import { computed, shallowRef } from 'vue';
import type {
	WorkspaceResponse,
	WorkspaceSettingsResponse,
} from '@gitiempo/shared';
import {
	useWorkspaceQuery,
	useWorkspaceSettingsQuery,
} from '@gitiempo/web-shared/query';

import type { AdminSettingsClient } from '@/services/admin-settings-client';
import { adminSettingsClient } from '@/services/admin-settings-client';
import { useAuthStore } from '@/stores/auth';
import { useToasts } from '@/composables/feedback/useToasts';
import { useAdminSettingsForm } from '@/composables/settings/useAdminSettingsForm';
import { useAdminSettingsSaveMutation } from '@/api/settings/useAdminSettingsSaveMutation';
import {
	getWorkspaceSettingsUpdatePayload,
	getWorkspaceUpdatePayload,
	toAdminSettingsFormValues,
	type AdminSettingsFormValues,
} from './admin-settings-form';

/* eslint-disable no-unused-vars */
interface AdminSettingsAuthState {
	accessToken: string | null;
	setWorkspaceName?: (name: string) => void;
}
/* eslint-enable no-unused-vars */

interface AdminSettingsToasts {
	errorToast: ReturnType<typeof useToasts>['errorToast'];
	successToast: ReturnType<typeof useToasts>['successToast'];
}

interface UseAdminSettingsPageOptions {
	authStore?: AdminSettingsAuthState;
	client?: AdminSettingsClient;
	toasts?: AdminSettingsToasts;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'An unexpected error occurred';
}

function syncWorkspaceName(
	authStore: AdminSettingsAuthState,
	values: AdminSettingsFormValues,
): void {
	authStore.setWorkspaceName?.(values.workspaceName);
}

export function useAdminSettingsPage(
	options: UseAdminSettingsPageOptions = {},
) {
	const authStore = options.authStore ?? useAuthStore();
	const client = options.client ?? adminSettingsClient;
	const toasts = options.toasts ?? useToasts();

	const workspace = shallowRef<WorkspaceResponse | null>(null);
	const settings = shallowRef<WorkspaceSettingsResponse | null>(null);
	const loading = shallowRef(true);
	const initialLoaded = shallowRef(false);
	const saving = shallowRef(false);
	const requestError = shallowRef<string | null>(null);
	const settingsForm = useAdminSettingsForm({ loading, saving });
	const {
		applyPersistedValues,
		assignFormValues,
		canSave,
		currencyOptions,
		fieldErrors,
		form,
		isDirty,
		persisted,
		resetForm,
		validateForm,
	} = settingsForm;
	const workspaceQuery = useWorkspaceQuery({
		client,
		accessToken: computed(() => authStore.accessToken),
		enabled: false,
	});
	const workspaceSettingsQuery = useWorkspaceSettingsQuery({
		client,
		accessToken: computed(() => authStore.accessToken),
		enabled: false,
	});
	const settingsSaveMutation = useAdminSettingsSaveMutation({
		client,
		scope: () => ({ role: null, userId: null, workspaceId: null }),
		token: () => authStore.accessToken ?? '',
	});

	async function loadSettings(action = 'load-settings'): Promise<void> {
		const token = authStore.accessToken;

		loading.value = true;
		requestError.value = null;

		if (!token) {
			const message = 'Authentication is required to load settings.';
			requestError.value = message;
			initialLoaded.value = true;
			loading.value = false;
			toasts.errorToast(message, {
				logContext: { action, feature: 'settings' },
			});
			return;
		}

		try {
			const [workspaceResult, settingsResult] = await Promise.all([
				workspaceQuery.refetch({ throwOnError: true }),
				workspaceSettingsQuery.refetch({ throwOnError: true }),
			]);

			if (!workspaceResult.data || !settingsResult.data) {
				throw new Error('Settings could not be loaded.');
			}

			const workspaceData = workspaceResult.data;
			const settingsData = settingsResult.data;
			const nextForm = toAdminSettingsFormValues(workspaceData, settingsData);

			workspace.value = workspaceData;
			settings.value = settingsData;
			applyPersistedValues(nextForm);
			syncWorkspaceName(authStore, nextForm);
			initialLoaded.value = true;
		} catch (error) {
			const message = getErrorMessage(error);
			requestError.value = message;
			toasts.errorToast(message, {
				error,
				logContext: { action, feature: 'settings' },
			});
		} finally {
			loading.value = false;
		}
	}

	async function saveSettings(): Promise<boolean> {
		const token = authStore.accessToken;
		const current = persisted.value;

		if (!token || !current || saving.value) return false;

		const validation = validateForm();

		if (!validation.values) return false;

		const workspacePayload = getWorkspaceUpdatePayload(
			validation.values,
			current,
		);
		const settingsPayload = getWorkspaceSettingsUpdatePayload(
			validation.values,
			current,
		);

		if (!workspacePayload && !settingsPayload) {
			assignFormValues(validation.values);
			return true;
		}

		saving.value = true;

		try {
			const nextWorkspace = workspacePayload
				? await settingsSaveMutation.updateWorkspace(workspacePayload)
				: workspace.value;
			const nextSettings = settingsPayload
				? await settingsSaveMutation.updateWorkspaceSettings(settingsPayload)
				: settings.value;

			if (!nextWorkspace || !nextSettings) {
				throw new Error('Settings could not be reconciled.');
			}

			const nextForm = toAdminSettingsFormValues(nextWorkspace, nextSettings);
			workspace.value = nextWorkspace;
			settings.value = nextSettings;
			applyPersistedValues(nextForm);
			syncWorkspaceName(authStore, nextForm);
			toasts.successToast('Settings saved.');
			return true;
		} catch (error) {
			const message = getErrorMessage(error);
			toasts.errorToast(message, {
				error,
				logContext: { action: 'save-settings', feature: 'settings' },
			});
			return false;
		} finally {
			saving.value = false;
		}
	}

	async function retryLoad(): Promise<void> {
		await loadSettings('retry-settings');
	}

	return {
		canSave,
		currencyOptions,
		fieldErrors,
		form,
		initialLoaded,
		isDirty,
		loadSettings,
		loading,
		requestError,
		resetForm,
		retryLoad,
		saveSettings,
		saving,
		settings,
		workspace,
	};
}
