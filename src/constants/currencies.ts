/**
 * Popular currencies the app supports for display. All amounts are stored in
 * INR (the app is India-focused — bank parsing only handles Indian banks);
 * this list is purely for the display conversion in formatters.ts.
 */
export interface CurrencyInfo {
  code:     string;
  symbol:   string;
  name:     string;
  locale:   string;   // grouping style for toLocaleString
  decimals: number;   // max fraction digits shown
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "INR", symbol: "₹",   name: "Indian Rupee",        locale: "en-IN", decimals: 0 },
  { code: "USD", symbol: "$",   name: "US Dollar",           locale: "en-US", decimals: 2 },
  { code: "GBP", symbol: "£",   name: "British Pound",       locale: "en-GB", decimals: 2 },
  { code: "EUR", symbol: "€",   name: "Euro",                locale: "en-US", decimals: 2 },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham",          locale: "en-US", decimals: 2 },
  { code: "SGD", symbol: "S$",  name: "Singapore Dollar",    locale: "en-US", decimals: 2 },
  { code: "JPY", symbol: "¥",   name: "Japanese Yen",        locale: "en-US", decimals: 0 },
  { code: "CNY", symbol: "¥",   name: "Chinese Yuan",        locale: "en-US", decimals: 2 },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar",    locale: "en-US", decimals: 2 },
  { code: "KRW", symbol: "₩",   name: "South Korean Won",    locale: "en-US", decimals: 0 },
  { code: "AUD", symbol: "A$",  name: "Australian Dollar",   locale: "en-US", decimals: 2 },
  { code: "CAD", symbol: "C$",  name: "Canadian Dollar",     locale: "en-US", decimals: 2 },
];

export function currencyInfo(code: string): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}
