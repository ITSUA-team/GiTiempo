import { computed, reactive, shallowRef } from 'vue';
import type {
	WorkspaceResponse,
	WorkspaceSettingsResponse,
} from '@gitiempo/shared';
import {
	useUpdateWorkspaceMutation,
	useUpdateWorkspaceSettingsMutation,
	useWorkspaceQuery,
	useWorkspaceSettingsQuery,
} from '@gitiempo/web-shared/query';

import type { AdminSettingsClient } from '@/services/admin-settings-client';
import { adminSettingsClient } from '@/services/admin-settings-client';
import { useAuthStore } from '@/stores/auth';
import { useToasts } from '@/composables/feedback/useToasts';
import {
  DEFAULT_SETTINGS_CURRENCY,
  SETTINGS_CURRENCY_OPTIONS,
} from '@/lib/currencies';
import {
	getWorkspaceSettingsUpdatePayload,
	getWorkspaceUpdatePayload,
	toAdminSettingsFormValues,
	validateAdminSettingsForm,
	type AdminSettingsFieldErrors,
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

function getDefaultTimeZone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function assignForm(
	form: AdminSettingsFormValues,
	values: AdminSettingsFormValues,
): void {
	form.currency = values.currency;
	form.defaultHourlyRate = values.defaultHourlyRate;
	form.timeZone = values.timeZone;
	form.workspaceName = values.workspaceName;
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
	const loading = shallowRef(true);
	const initialLoaded = shallowRef(false);
	const saving = shallowRef(false);
	const requestError = shallowRef<string | null>(null);
	const persisted = shallowRef<AdminSettingsFormValues | null>(null);
	const fieldErrors = reactive<AdminSettingsFieldErrors>({});
	const form = reactive<AdminSettingsFormValues>({
		currency: DEFAULT_SETTINGS_CURRENCY,
		defaultHourlyRate: null,
		timeZone: getDefaultTimeZone(),
		workspaceName: '',
	});
	const isDirty = computed(() => {
		const current = persisted.value;
		if (!current) return false;

		return (
			form.workspaceName !== current.workspaceName ||
			form.defaultHourlyRate !== current.defaultHourlyRate ||
			form.currency !== current.currency ||
			form.timeZone !== current.timeZone
		);
	});
	const canSave = computed(
		() => isDirty.value && !saving.value && !loading.value,
	);
	const currencyOptions = computed(() => {
		const existingOption = SETTINGS_CURRENCY_OPTIONS.some(
			(option) => option.value === form.currency,
		);

		return existingOption
			? SETTINGS_CURRENCY_OPTIONS
			: [
					{ label: form.currency, value: form.currency },
					...SETTINGS_CURRENCY_OPTIONS,
				];
	});
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
	const updateWorkspaceMutation = useUpdateWorkspaceMutation({
		client,
		accessToken: computed(() => authStore.accessToken),
	});
	const updateWorkspaceSettingsMutation = useUpdateWorkspaceSettingsMutation({
		client,
		accessToken: computed(() => authStore.accessToken),
	});

	function applyPersistedValues(values: AdminSettingsFormValues): void {
		persisted.value = values;
		assignForm(form, values);
		clearFieldErrors(fieldErrors);
	}

	function assignFormValues(values: AdminSettingsFormValues): void {
		assignForm(form, values);
		clearFieldErrors(fieldErrors);
	}

	function resetForm(): void {
		if (!persisted.value) return;
		assignFormValues(persisted.value);
	}

	function validateForm() {
		const validation = validateAdminSettingsForm({ ...form });
		assignFieldErrors(fieldErrors, validation.errors);

		return validation;
	}

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
				? await updateWorkspaceMutation.mutateAsync(workspacePayload)
				: workspace.value;
			const nextSettings = settingsPayload
				? await updateWorkspaceSettingsMutation.mutateAsync(settingsPayload)
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
