import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSettingsTimeZoneOptions } from './time-zones';

const originalSupportedValuesOf = Intl.supportedValuesOf;

function stubSupportedValuesOf(value: typeof Intl.supportedValuesOf | undefined) {
	if (value) {
		Object.defineProperty(Intl, 'supportedValuesOf', {
			configurable: true,
			value,
		});
		return;
	}

	Reflect.deleteProperty(Intl, 'supportedValuesOf');
}

describe('getSettingsTimeZoneOptions', () => {
	afterEach(() => {
		if (originalSupportedValuesOf) {
			Object.defineProperty(Intl, 'supportedValuesOf', {
				configurable: true,
				value: originalSupportedValuesOf,
			});
		} else {
			Reflect.deleteProperty(Intl, 'supportedValuesOf');
		}

		vi.restoreAllMocks();
	});

	it('uses runtime-supported time zones when available with UTC first', () => {
		const supportedValuesOf = vi.fn().mockReturnValue([
			'Europe/London',
			'America/New_York',
			'Europe/Berlin',
		]);
		stubSupportedValuesOf(supportedValuesOf);

		expect(getSettingsTimeZoneOptions()).toEqual([
			{ label: 'UTC', value: 'UTC' },
			{ label: 'America/New York', value: 'America/New_York' },
			{ label: 'Europe/Berlin', value: 'Europe/Berlin' },
			{ label: 'Europe/London', value: 'Europe/London' },
		]);
		expect(supportedValuesOf).toHaveBeenCalledWith('timeZone');
	});

	it('formats labels with spaces while preserving IANA values', () => {
		stubSupportedValuesOf(vi.fn().mockReturnValue(['Africa/Addis_Ababa']));

		expect(getSettingsTimeZoneOptions()).toContainEqual({
			label: 'Africa/Addis Ababa',
			value: 'Africa/Addis_Ababa',
		});
	});

	it('falls back to the curated IANA list when runtime support is unavailable', () => {
		stubSupportedValuesOf(undefined);

		const values = getSettingsTimeZoneOptions().map((option) => option.value);

		expect(values[0]).toBe('UTC');
		expect(values).toContain('Europe/Kyiv');
		expect(values).toContain('America/New_York');
	});

	it('includes the current time zone when it is missing from the source', () => {
		stubSupportedValuesOf(vi.fn().mockReturnValue(['Europe/London']));

		const values = getSettingsTimeZoneOptions(['Pacific/Auckland']).map(
			(option) => option.value,
		);

		expect(values).toContain('Pacific/Auckland');
	});

	it('includes persisted and draft current time zones when both are missing from the source', () => {
		stubSupportedValuesOf(vi.fn().mockReturnValue(['Europe/London']));

		const values = getSettingsTimeZoneOptions([
			'Pacific/Auckland',
			'America/Phoenix',
		]).map((option) => option.value);

		expect(values).toContain('Pacific/Auckland');
		expect(values).toContain('America/Phoenix');
	});

	it('does not include invalid current values as options', () => {
		stubSupportedValuesOf(vi.fn().mockReturnValue(['Europe/London']));

		const values = getSettingsTimeZoneOptions(['Not/AZone']).map(
			(option) => option.value,
		);

		expect(values).not.toContain('Not/AZone');
	});

	it('deduplicates option values from runtime and current sources', () => {
		stubSupportedValuesOf(
			vi.fn().mockReturnValue(['Europe/Kyiv', 'Europe/Kyiv', 'UTC']),
		);

		const values = getSettingsTimeZoneOptions(['Europe/Kyiv']).map(
			(option) => option.value,
		);

		expect(values).toEqual(['UTC', 'Europe/Kyiv']);
	});
});
