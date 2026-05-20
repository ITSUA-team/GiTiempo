export const SettingsCurrencyOptionCode = {
	USD: 'USD',
	EUR: 'EUR',
	GBP: 'GBP',
	CAD: 'CAD',
	AUD: 'AUD',
} as const;

export const DEFAULT_SETTINGS_CURRENCY = SettingsCurrencyOptionCode.USD;

export const SETTINGS_CURRENCY_OPTIONS = Object.values(
	SettingsCurrencyOptionCode,
).map((currency) => ({
	label: currency,
	value: currency,
}));
