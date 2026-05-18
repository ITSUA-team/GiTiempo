export const CurrencyCode = {
	USD: 'USD',
	EUR: 'EUR',
	GBP: 'GBP',
	CAD: 'CAD',
	AUD: 'AUD',
} as const;

export const DEFAULT_CURRENCY = CurrencyCode.USD;

export const CURRENCY_OPTIONS = Object.values(CurrencyCode).map((currency) => ({
	label: currency,
	value: currency,
}));
