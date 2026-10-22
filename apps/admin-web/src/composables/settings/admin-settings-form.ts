import {
	updateWorkspaceSchema,
	updateWorkspaceSettingsSchema,
	type UpdateWorkspaceInput,
	type UpdateWorkspaceSettingsInput,
	type WorkspaceResponse,
	type WorkspaceSettingsResponse,
} from '@gitiempo/shared';

export interface AdminSettingsFormValues {
	workspaceName: string;
	defaultHourlyRate: number | null;
	currency: string;
	timeZone: string;
	timeRoundingStepMinutes: number;
}

export type AdminSettingsFieldErrors = Partial<
	Record<keyof AdminSettingsFormValues, string>
>;

interface AdminSettingsValidationResult {
	errors: AdminSettingsFieldErrors;
	values: AdminSettingsFormValues | null;
}

export function toAdminSettingsFormValues(
	workspace: WorkspaceResponse,
	settings: WorkspaceSettingsResponse,
): AdminSettingsFormValues {
	return {
		currency: settings.currency,
		defaultHourlyRate: settings.defaultHourlyRate,
		timeRoundingStepMinutes: settings.timeRoundingStepMinutes,
		timeZone: settings.timeZone,
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
	const timeRoundingStepMinutes = form.timeRoundingStepMinutes;
	const timeZone = form.timeZone.trim();

	if (!workspaceName) {
		errors.workspaceName = 'Workspace name is required.';
	} else {
		const workspaceResult = updateWorkspaceSchema.safeParse({ name: workspaceName });
		if (!workspaceResult.success) {
			errors.workspaceName = workspaceResult.error.issues[0]?.message;
		}
	}

	if (defaultHourlyRate !== null && defaultHourlyRate < 0) {
		errors.defaultHourlyRate = 'Default hourly rate cannot be negative.';
	}

	const settingsResult = updateWorkspaceSettingsSchema.safeParse({
		currency,
		defaultHourlyRate,
		timeRoundingStepMinutes,
		timeZone,
	});
	if (!settingsResult.success) {
		for (const issue of settingsResult.error.issues) {
			const field = issue.path[0];
			if (
				field === 'currency' ||
				field === 'defaultHourlyRate' ||
				field === 'timeRoundingStepMinutes' ||
				field === 'timeZone'
			) {
				errors[field] ??= issue.message;
			}
		}
	}

	if (Object.keys(errors).length > 0) {
		return { errors, values: null };
	}

	return {
		errors,
		values: {
			currency,
			defaultHourlyRate,
			timeRoundingStepMinutes,
			timeZone,
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
	if (values.timeRoundingStepMinutes !== persisted.timeRoundingStepMinutes) {
		payload.timeRoundingStepMinutes = values.timeRoundingStepMinutes;
	}
	if (values.timeZone !== persisted.timeZone) {
		payload.timeZone = values.timeZone;
	}

	return Object.keys(payload).length > 0 ? payload : null;
}
