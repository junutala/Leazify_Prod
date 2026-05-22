// ─── Currency Utility Library ─────────────────────────────────────────────────
// Handles multi-currency formatting, country-currency mapping, and validation

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', decimals: 2 },
  KWD: { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', decimals: 3 },
  SAR: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', decimals: 2 },
  QAR: { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal', decimals: 2 },
  BHD: { code: 'BHD', symbol: 'BHD', name: 'Bahraini Dinar', decimals: 3 },
  OMR: { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', decimals: 3 },
  USD: { code: 'USD', symbol: 'USD', name: 'US Dollar', decimals: 2 },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

// Default currency per country
export const COUNTRY_DEFAULT_CURRENCY: Record<string, string> = {
  'United Arab Emirates': 'AED',
  'Kuwait': 'KWD',
  'Saudi Arabia': 'SAR',
  'Qatar': 'QAR',
  'Bahrain': 'BHD',
  'Oman': 'OMR',
};

/**
 * Format a number as currency string
 * KWD uses 3 decimal places; most others use 2
 */
export function formatCurrency(amount: number, currencyCode: string = 'AED'): string {
  const config = CURRENCIES[currencyCode] ?? CURRENCIES['AED'];
  const decimals = config.decimals;

  if (amount >= 1_000_000) {
    return `${config.symbol} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${config.symbol} ${(amount / 1000).toFixed(0)}K`;
  }
  return `${config.symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/**
 * Format a number as full currency string (no abbreviation)
 */
export function formatCurrencyFull(amount: number, currencyCode: string = 'AED'): string {
  const config = CURRENCIES[currencyCode] ?? CURRENCIES['AED'];
  return `${config.symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals })}`;
}

/**
 * Get the default currency for a given country
 */
export function getDefaultCurrencyForCountry(country: string): string {
  return COUNTRY_DEFAULT_CURRENCY[country] ?? 'AED';
}

/**
 * Check if the selected currency matches the country's default currency
 */
export function isCurrencyMismatch(country: string, currency: string): boolean {
  const expected = getDefaultCurrencyForCountry(country);
  return expected !== currency;
}

/**
 * Get mismatch warning message
 */
export function getCurrencyMismatchMessage(country: string, currency: string): string {
  const expected = getDefaultCurrencyForCountry(country);
  const expectedConfig = CURRENCIES[expected];
  const selectedConfig = CURRENCIES[currency];
  return `The standard currency for ${country} is ${expectedConfig?.name ?? expected} (${expected}), but you've selected ${selectedConfig?.name ?? currency} (${currency}). You can proceed with your chosen currency.`;
}
