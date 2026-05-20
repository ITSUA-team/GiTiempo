export interface SettingsTimeZoneOption {
	label: string;
	value: string;
}

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

const TIME_ZONE_NAME_PATTERN = /^(?:UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+)$/;

function isValidTimeZoneName(timeZone: string): boolean {
	if (!TIME_ZONE_NAME_PATTERN.test(timeZone)) return false;

	try {
		new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
		return true;
	} catch {
		return false;
	}
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

function compareTimeZones(a: string, b: string): number {
	if (a === b) return 0;
	if (a === 'UTC') return -1;
	if (b === 'UTC') return 1;
	return a < b ? -1 : 1;
}

export function getSettingsTimeZoneOptions(
	currentTimeZone?: string,
): SettingsTimeZoneOption[] {
	const source = getRuntimeTimeZones() ?? FALLBACK_TIME_ZONES;
	const values = new Set<string>(['UTC', ...source]);
	const current = currentTimeZone?.trim();

	if (current && isValidTimeZoneName(current)) {
		values.add(current);
	}

	return [...values].sort(compareTimeZones).map((value) => ({
		label: value,
		value,
	}));
}
