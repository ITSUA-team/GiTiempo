import { computed, reactive, shallowRef } from 'vue';
import type {
	WorkspaceResponse,
	WorkspaceSettingsResponse,
} from '@gitiempo/shared';

import type { AdminSettingsClient } from '@/services/admin-settings-client';
import { adminSettingsClient } from '@/services/admin-settings-client';
import { useAuthStore } from '@/stores/auth';
import { useToasts } from '@/composables/useToasts';
import {
	ADMIN_SETTINGS_CURRENCY_OPTIONS,
	getWorkspaceSettingsUpdatePayload,
	getWorkspaceUpdatePayload,
	toAdminSettingsFormValues,
	validateAdminSettingsForm,
	type AdminSettingsFieldErrors,
	type AdminSettingsFormValues,
} from './admin-settings-form';

interface AdminSettingsAuthState {
	accessToken: string | null;
	setWorkspaceName?: (_name: string) => void;
}

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

function assignForm(
	form: AdminSettingsFormValues,
	values: AdminSettingsFormValues,
): void {
	form.currency = values.currency;
	form.defaultHourlyRate = values.defaultHourlyRate;
	form.workspaceName = values.workspaceName;
}

function syncWorkspaceName(
	authStore: AdminSettingsAuthState,
	values: AdminSettingsFormValues,
): void {
	authStore.setWorkspaceName?.(values.workspaceName);
}

function clearFieldErrors(fieldErrors: AdminSettingsFieldErrors): void {
	for (const key of Object.keys(fieldErrors) as Array<
		keyof AdminSettingsFieldErrors
	>) {
		delete fieldErrors[key];
	}
}

function assignFieldErrors(
	fieldErrors: AdminSettingsFieldErrors,
	errors: AdminSettingsFieldErrors,
): void {
	clearFieldErrors(fieldErrors);
	Object.assign(fieldErrors, errors);
}

export function useAdminSettingsPage(
	options: UseAdminSettingsPageOptions = {},
) {
	const authStore = options.authStore ?? useAuthStore();
	const client = options.client ?? adminSettingsClient;
	const toasts = options.toasts ?? useToasts();

	const workspace = shallowRef<WorkspaceResponse | null>(null);
	const settings = shallowRef<WorkspaceSettingsResponse | null>(null);
	const persisted = shallowRef<AdminSettingsFormValues | null>(null);
	const loading = shallowRef(true);
	const initialLoaded = shallowRef(false);
	const saving = shallowRef(false);
	const requestError = shallowRef<string | null>(null);
	const fieldErrors = reactive<AdminSettingsFieldErrors>({});
	const form = reactive<AdminSettingsFormValues>({
		currency: 'USD',
		defaultHourlyRate: null,
		workspaceName: '',
	});

	const isDirty = computed(() => {
		const current = persisted.value;
		if (!current) return false;

		return (
			form.workspaceName !== current.workspaceName ||
			form.defaultHourlyRate !== current.defaultHourlyRate ||
			form.currency !== current.currency
		);
	});

	const canSave = computed(
		() => isDirty.value && !saving.value && !loading.value,
	);

	const currencyOptions = computed(() => {
		const existingOption = ADMIN_SETTINGS_CURRENCY_OPTIONS.some(
			(option) => option.value === form.currency,
		);

		return existingOption
			? ADMIN_SETTINGS_CURRENCY_OPTIONS
			: [
					{ label: form.currency, value: form.currency },
					...ADMIN_SETTINGS_CURRENCY_OPTIONS,
				];
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
			const [workspaceData, settingsData] = await Promise.all([
				client.getWorkspace(token),
				client.getWorkspaceSettings(token),
			]);
			const nextForm = toAdminSettingsFormValues(workspaceData, settingsData);

			workspace.value = workspaceData;
			settings.value = settingsData;
			persisted.value = nextForm;
			assignForm(form, nextForm);
			syncWorkspaceName(authStore, nextForm);
			clearFieldErrors(fieldErrors);
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

	function resetForm(): void {
		if (!persisted.value) return;
		assignForm(form, persisted.value);
		clearFieldErrors(fieldErrors);
	}

	async function saveSettings(): Promise<boolean> {
		const token = authStore.accessToken;
		const current = persisted.value;

		if (!token || !current || saving.value) return false;

		const validation = validateAdminSettingsForm({ ...form });
		assignFieldErrors(fieldErrors, validation.errors);

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
			assignForm(form, validation.values);
			return true;
		}

		saving.value = true;

		try {
			const nextWorkspace = workspacePayload
				? await client.updateWorkspace(token, workspacePayload)
				: workspace.value;
			const nextSettings = settingsPayload
				? await client.updateWorkspaceSettings(token, settingsPayload)
				: settings.value;

			if (!nextWorkspace || !nextSettings) {
				throw new Error('Settings could not be reconciled.');
			}

			const nextForm = toAdminSettingsFormValues(nextWorkspace, nextSettings);
			workspace.value = nextWorkspace;
			settings.value = nextSettings;
			persisted.value = nextForm;
			assignForm(form, nextForm);
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
