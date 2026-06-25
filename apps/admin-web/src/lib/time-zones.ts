import { updateWorkspaceSettingsSchema } from '@gitiempo/shared';

export interface SettingsTimeZoneOption {
	label: string;
	value: string;
}

type CurrentTimeZoneValue = string | null | undefined;

const FALLBACK_TIME_ZONES = [
	'UTC',
	'Africa/Cairo',
	'Africa/Johannesburg',
	'America/Argentina/Buenos_Aires',
	'America/Chicago',
	'America/Denver',
	'America/Los_Angeles',
	'America/Mexico_City',
	'America/New_York',
	'America/Sao_Paulo',
	'America/Toronto',
	'Asia/Dubai',
	'Asia/Hong_Kong',
	'Asia/Jakarta',
	'Asia/Jerusalem',
	'Asia/Kolkata',
	'Asia/Seoul',
	'Asia/Singapore',
	'Asia/Tokyo',
	'Australia/Melbourne',
	'Australia/Sydney',
	'Europe/Amsterdam',
	'Europe/Berlin',
	'Europe/Kyiv',
	'Europe/London',
	'Europe/Madrid',
	'Europe/Paris',
	'Europe/Rome',
	'Europe/Stockholm',
	'Europe/Warsaw',
] as const;

function isValidTimeZoneName(timeZone: string): boolean {
	return updateWorkspaceSettingsSchema.safeParse({ timeZone }).success;
}

function getRuntimeTimeZones(): string[] | null {
	const supportedValuesOf = Intl.supportedValuesOf;

	if (typeof supportedValuesOf !== 'function') return null;

	try {
		const values = supportedValuesOf('timeZone');
		return values.length > 0 ? values : null;
	} catch {
		return null;
	}
}

export function getRuntimeDefaultTimeZone(): string {
	try {
		const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();

		return timeZone && isValidTimeZoneName(timeZone) ? timeZone : 'UTC';
	} catch {
		return 'UTC';
	}
}

function compareTimeZones(a: string, b: string): number {
	if (a === b) return 0;
	if (a === 'UTC') return -1;
	if (b === 'UTC') return 1;
	return a < b ? -1 : 1;
}

function formatTimeZoneLabel(timeZone: string): string {
	return timeZone.replaceAll('_', ' ');
}

export function getSettingsTimeZoneOptions(
	currentTimeZones: readonly CurrentTimeZoneValue[] = [],
): SettingsTimeZoneOption[] {
	const source = getRuntimeTimeZones() ?? FALLBACK_TIME_ZONES;
	const values = new Set<string>(['UTC', ...source]);

	for (const timeZone of currentTimeZones) {
		const current = timeZone?.trim();

		if (current && isValidTimeZoneName(current)) {
			values.add(current);
		}
	}

	return [...values].sort(compareTimeZones).map((value) => ({
		label: formatTimeZoneLabel(value),
		value,
	}));
}
