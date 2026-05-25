import { describe, expect, it, vi } from 'vitest';

import { useAdminSettingsPage } from './useAdminSettingsPage';
import type { AdminSettingsClient } from '@/services/admin-settings-client';

const originalSupportedValuesOf = Intl.supportedValuesOf;

const workspaceResponse = {
	createdAt: '2026-05-01T10:00:00.000Z',
	id: '11111111-1111-4111-8111-111111111111',
	name: 'GiTiempo Studio',
	updatedAt: '2026-05-01T10:00:00.000Z',
};

const settingsResponse = {
	createdAt: '2026-05-01T10:00:00.000Z',
	currency: 'USD',
	defaultHourlyRate: 120,
	id: '22222222-2222-4222-8222-222222222222',
	timeZone: 'UTC',
	updatedAt: '2026-05-01T10:00:00.000Z',
	workspaceId: '11111111-1111-4111-8111-111111111111',
};

function createClient(overrides: Partial<AdminSettingsClient> = {}) {
	return {
		getWorkspace: vi.fn().mockResolvedValue(workspaceResponse),
		getWorkspaceSettings: vi.fn().mockResolvedValue(settingsResponse),
		updateWorkspace: vi.fn().mockResolvedValue(workspaceResponse),
		updateWorkspaceSettings: vi.fn().mockResolvedValue(settingsResponse),
		...overrides,
	} satisfies AdminSettingsClient;
}

function createSubject(client = createClient()) {
	const authStore = {
		accessToken: 'access-token',
		setWorkspaceName: vi.fn(),
	};
	const toasts = {
		errorToast: vi.fn(),
		successToast: vi.fn(),
	};

	return {
		authStore,
		client,
		page: useAdminSettingsPage({
			authStore,
			client,
			toasts,
		}),
		toasts,
	};
}

function stubSupportedValuesOf(value: typeof Intl.supportedValuesOf) {
	Object.defineProperty(Intl, 'supportedValuesOf', {
		configurable: true,
		value,
	});
}

function restoreSupportedValuesOf() {
	if (originalSupportedValuesOf) {
		Object.defineProperty(Intl, 'supportedValuesOf', {
			configurable: true,
			value: originalSupportedValuesOf,
		});
		return;
	}

	Reflect.deleteProperty(Intl, 'supportedValuesOf');
}

describe('useAdminSettingsPage', () => {
	it('loads workspace and settings into form state', async () => {
		const { authStore, client, page, toasts } = createSubject();

		await page.loadSettings();

		expect(client.getWorkspace).toHaveBeenCalledWith('access-token');
		expect(client.getWorkspaceSettings).toHaveBeenCalledWith('access-token');
		expect(page.form.workspaceName).toBe('GiTiempo Studio');
		expect(page.form.defaultHourlyRate).toBe(120);
		expect(page.form.currency).toBe('USD');
		expect(page.form.timeZone).toBe('UTC');
		expect(page.initialLoaded.value).toBe(true);
		expect(page.requestError.value).toBeNull();
		expect(authStore.setWorkspaceName).toHaveBeenCalledWith('GiTiempo Studio');
		expect(toasts.errorToast).not.toHaveBeenCalled();
	});

	it('keeps failed initial load retryable', async () => {
		const client = createClient({
			getWorkspace: vi
				.fn()
				.mockRejectedValueOnce(new Error('Network unavailable'))
				.mockResolvedValueOnce(workspaceResponse),
		});
		const { authStore, page, toasts } = createSubject(client);

		await page.loadSettings();

		expect(page.requestError.value).toBe('Network unavailable');
		expect(toasts.errorToast).toHaveBeenCalledWith(
			'Network unavailable',
			expect.objectContaining({
				logContext: { action: 'load-settings', feature: 'settings' },
			}),
		);

		await page.retryLoad();

		expect(page.requestError.value).toBeNull();
		expect(page.form.workspaceName).toBe('GiTiempo Studio');
		expect(authStore.setWorkspaceName).toHaveBeenCalledWith('GiTiempo Studio');
	});

	it('derives dirty state from form edits', async () => {
		const { page } = createSubject();
		await page.loadSettings();

		expect(page.isDirty.value).toBe(false);

		page.form.currency = 'EUR';

		expect(page.isDirty.value).toBe(true);
		expect(page.canSave.value).toBe(true);
	});

	it('resets pending edits without update requests', async () => {
		const { client, page } = createSubject();
		await page.loadSettings();

		page.form.workspaceName = 'Draft Name';
		page.form.defaultHourlyRate = null;
		page.form.timeZone = 'Europe/Kyiv';
		page.resetForm();

		expect(page.form.workspaceName).toBe('GiTiempo Studio');
		expect(page.form.defaultHourlyRate).toBe(120);
		expect(page.form.timeZone).toBe('UTC');
		expect(client.updateWorkspace).not.toHaveBeenCalled();
		expect(client.updateWorkspaceSettings).not.toHaveBeenCalled();
	});

	it('keeps persisted and draft time zones available in selector options', async () => {
		stubSupportedValuesOf(vi.fn().mockReturnValue(['Europe/London']));

		try {
			const client = createClient({
				getWorkspaceSettings: vi.fn().mockResolvedValue({
					...settingsResponse,
					timeZone: 'Pacific/Auckland',
				}),
			});
			const { page } = createSubject(client);

			await page.loadSettings();
			page.form.timeZone = 'America/Phoenix';

			const values = page.timeZoneOptions.value.map((option) => option.value);

			expect(values).toContain('Pacific/Auckland');
			expect(values).toContain('America/Phoenix');
			expect(values).toContain('Europe/London');
		} finally {
			restoreSupportedValuesOf();
		}
	});

	it('saves workspace-only changes', async () => {
		const client = createClient({
			updateWorkspace: vi.fn().mockResolvedValue({
				...workspaceResponse,
				name: 'Updated Workspace',
			}),
		});
		const { authStore, page, toasts } = createSubject(client);
		await page.loadSettings();

		page.form.workspaceName = 'Updated Workspace';

		await expect(page.saveSettings()).resolves.toBe(true);
		expect(client.updateWorkspace).toHaveBeenCalledWith('access-token', {
			name: 'Updated Workspace',
		});
		expect(client.updateWorkspaceSettings).not.toHaveBeenCalled();
		expect(toasts.successToast).toHaveBeenCalledWith('Settings saved.');
		expect(authStore.setWorkspaceName).toHaveBeenCalledWith('Updated Workspace');
		expect(page.isDirty.value).toBe(false);
	});

	it('saves settings-only changes', async () => {
		const client = createClient({
			updateWorkspaceSettings: vi.fn().mockResolvedValue({
				...settingsResponse,
				currency: 'EUR',
				defaultHourlyRate: null,
				timeZone: 'Europe/Kyiv',
			}),
		});
		const { page } = createSubject(client);
		await page.loadSettings();

		page.form.currency = 'EUR';
		page.form.defaultHourlyRate = null;
		page.form.timeZone = 'Europe/Kyiv';

		await expect(page.saveSettings()).resolves.toBe(true);
		expect(client.updateWorkspace).not.toHaveBeenCalled();
		expect(client.updateWorkspaceSettings).toHaveBeenCalledWith('access-token', {
			currency: 'EUR',
			defaultHourlyRate: null,
			timeZone: 'Europe/Kyiv',
		});
	});

	it('saves time zone-only changes without sending unchanged settings fields', async () => {
		const client = createClient({
			updateWorkspaceSettings: vi.fn().mockResolvedValue({
				...settingsResponse,
				timeZone: 'Europe/Kyiv',
			}),
		});
		const { page } = createSubject(client);
		await page.loadSettings();

		page.form.timeZone = 'Europe/Kyiv';

		await expect(page.saveSettings()).resolves.toBe(true);
		expect(client.updateWorkspace).not.toHaveBeenCalled();
		expect(client.updateWorkspaceSettings).toHaveBeenCalledWith('access-token', {
			timeZone: 'Europe/Kyiv',
		});
		expect(page.form.timeZone).toBe('Europe/Kyiv');
		expect(page.isDirty.value).toBe(false);
	});

	it('saves workspace and settings changes together', async () => {
		const client = createClient({
			updateWorkspace: vi.fn().mockResolvedValue({
				...workspaceResponse,
				name: 'Updated Workspace',
			}),
			updateWorkspaceSettings: vi.fn().mockResolvedValue({
				...settingsResponse,
				currency: 'GBP',
			}),
		});
		const { page } = createSubject(client);
		await page.loadSettings();

		page.form.workspaceName = 'Updated Workspace';
		page.form.currency = 'GBP';

		await expect(page.saveSettings()).resolves.toBe(true);
		expect(client.updateWorkspace).toHaveBeenCalledWith('access-token', {
			name: 'Updated Workspace',
		});
		expect(client.updateWorkspaceSettings).toHaveBeenCalledWith('access-token', {
			currency: 'GBP',
		});
	});

	it('blocks invalid form values before update requests', async () => {
		const { client, page } = createSubject();
		await page.loadSettings();

		page.form.workspaceName = ' ';
		page.form.defaultHourlyRate = -1;
		page.form.timeZone = 'Not/AZone';

		await expect(page.saveSettings()).resolves.toBe(false);
		expect(page.fieldErrors.workspaceName).toBe('Workspace name is required.');
		expect(page.fieldErrors.defaultHourlyRate).toBe(
			'Default hourly rate cannot be negative.',
		);
		expect(page.fieldErrors.timeZone).toBe('Invalid time zone');
		expect(client.updateWorkspace).not.toHaveBeenCalled();
		expect(client.updateWorkspaceSettings).not.toHaveBeenCalled();
	});

	it('preserves pending values when save fails', async () => {
		const client = createClient({
			updateWorkspaceSettings: vi
				.fn()
				.mockRejectedValue(new Error('Could not save settings')),
		});
		const { page, toasts } = createSubject(client);
		await page.loadSettings();

		page.form.timeZone = 'Europe/Kyiv';

		await expect(page.saveSettings()).resolves.toBe(false);
		expect(page.form.timeZone).toBe('Europe/Kyiv');
		expect(page.isDirty.value).toBe(true);
		expect(toasts.errorToast).toHaveBeenCalledWith(
			'Could not save settings',
			expect.objectContaining({
				logContext: { action: 'save-settings', feature: 'settings' },
			}),
		);
	});
});
