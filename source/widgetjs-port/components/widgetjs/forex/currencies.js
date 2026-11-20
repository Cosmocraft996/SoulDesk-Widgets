export const DEFAULT_CURRENCIES = ['CNY', 'USD', 'JPY'];
export const COMMON_CURRENCIES = [
  ...DEFAULT_CURRENCIES, 'EUR', 'GBP', 'HKD', 'TWD', 'MOP', 'KRW', 'AUD',
  'CAD', 'CHF', 'NZD', 'SGD', 'THB', 'MYR', 'VND', 'IDR', 'PHP', 'INR', 'RUB',
];

const names = new Intl.DisplayNames(['zh-CN'], { type: 'currency' });

export function currencyName(code) {
  return names.of(code);
}

export function configuredCurrencies(settings) {
  if (settings.currencies === '[]') return [];
  const saved = typeof settings.currencies === 'string' ? settings.currencies.split(',') : [];
  if (saved.length && saved.every(code => /^[A-Z]{3}$/.test(code))) return saved;
  if ([settings.from, settings.to].every(code => typeof code === 'string' && /^[A-Z]{3}$/.test(code))) {
    return [settings.from, settings.to];
  }
  return [...DEFAULT_CURRENCIES];
}
