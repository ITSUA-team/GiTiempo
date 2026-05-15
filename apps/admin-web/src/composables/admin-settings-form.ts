import type {
	UpdateWorkspaceInput,
	UpdateWorkspaceSettingsInput,
	WorkspaceResponse,
	WorkspaceSettingsResponse,
} from '@gitiempo/shared';

export interface AdminSettingsFormValues {
	workspaceName: string;
	defaultHourlyRate: number | null;
	currency: string;
}

export type AdminSettingsFieldErrors = Partial<
	Record<keyof AdminSettingsFormValues, string>
>;

interface AdminSettingsValidationResult {
	errors: AdminSettingsFieldErrors;
	values: AdminSettingsFormValues | null;
}

export const ADMIN_SETTINGS_CURRENCY_OPTIONS = [
	{ label: 'USD', value: 'USD' },
	{ label: 'EUR', value: 'EUR' },
	{ label: 'GBP', value: 'GBP' },
	{ label: 'CAD', value: 'CAD' },
	{ label: 'AUD', value: 'AUD' },
] as const;

export function toAdminSettingsFormValues(
	workspace: WorkspaceResponse,
	settings: WorkspaceSettingsResponse,
): AdminSettingsFormValues {
	return {
		currency: settings.currency,
		defaultHourlyRate: settings.defaultHourlyRate,
		workspaceName: workspace.name,
	};
}

export function validateAdminSettingsForm(
	form: AdminSettingsFormValues,
): AdminSettingsValidationResult {
	const errors: AdminSettingsFieldErrors = {};
	const workspaceName = form.workspaceName.trim();
	const currency = form.currency.trim().toUpperCase();
	const defaultHourlyRate = form.defaultHourlyRate;

	if (!workspaceName) {
		errors.workspaceName = 'Workspace name is required.';
	} else if (workspaceName.length > 255) {
		errors.workspaceName = 'Workspace name must be 255 characters or fewer.';
	}

	if (defaultHourlyRate !== null) {
		if (
			typeof defaultHourlyRate !== 'number' ||
			!Number.isFinite(defaultHourlyRate)
		) {
			errors.defaultHourlyRate = 'Default hourly rate must be a number.';
		} else if (defaultHourlyRate < 0) {
			errors.defaultHourlyRate = 'Default hourly rate cannot be negative.';
		}
	}

	if (!/^[A-Z]{3}$/.test(currency)) {
		errors.currency = 'Currency must be a three-letter code.';
	}

	if (Object.keys(errors).length > 0) {
		return { errors, values: null };
	}

	return {
		errors,
		values: {
			currency,
			defaultHourlyRate,
			workspaceName,
		},
	};
}

export function getWorkspaceUpdatePayload(
	values: AdminSettingsFormValues,
	persisted: AdminSettingsFormValues,
): UpdateWorkspaceInput | null {
	return values.workspaceName !== persisted.workspaceName
		? { name: values.workspaceName }
		: null;
}

export function getWorkspaceSettingsUpdatePayload(
	values: AdminSettingsFormValues,
	persisted: AdminSettingsFormValues,
): UpdateWorkspaceSettingsInput | null {
	const payload: UpdateWorkspaceSettingsInput = {};

	if (values.currency !== persisted.currency) {
		payload.currency = values.currency;
	}
	if (values.defaultHourlyRate !== persisted.defaultHourlyRate) {
		payload.defaultHourlyRate = values.defaultHourlyRate;
	}

	return Object.keys(payload).length > 0 ? payload : null;
}
