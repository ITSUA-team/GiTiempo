export interface CurrencyOption {
	label: string;
	value: string;
}

export const SettingsCurrencyOptionCode = {
	USD: 'USD',
	EUR: 'EUR',
	GBP: 'GBP',
	CAD: 'CAD',
	AUD: 'AUD',
} as const;

export const DEFAULT_SETTINGS_CURRENCY = SettingsCurrencyOptionCode.USD;

export const SETTINGS_CURRENCY_OPTIONS: readonly CurrencyOption[] = Object
	.values(SettingsCurrencyOptionCode)
	.map((currency) => ({
		label: currency,
		value: currency,
	}));

export function getSettingsCurrencyOptions(
	currentCurrency?: string | null,
): CurrencyOption[] {
	if (!currentCurrency) {
		return [...SETTINGS_CURRENCY_OPTIONS];
	}

	const isKnownCurrency = SETTINGS_CURRENCY_OPTIONS.some(
		(option) => option.value === currentCurrency,
	);

	if (isKnownCurrency) {
		return [...SETTINGS_CURRENCY_OPTIONS];
	}

	return [
		{ label: currentCurrency, value: currentCurrency },
		...SETTINGS_CURRENCY_OPTIONS,
	];
}
