/**
 * Locale-format a number, showing 2 fraction digits when it actually has
 * paise/cents — even for currencies configured with 0 decimals (INR) — so e.g.
 * 1.10 isn't rendered as 1. Whole values keep the clean no-decimal display.
 *
 * Split out of formatters.ts (which imports zustand stores → react-native →
 * expo-device, unparseable by tsx) so this pure core stays unit-testable.
 */
export function formatAmountDigits(amount: number, locale: string, decimals: number): string {
  // Threshold, not an exact test, so float noise (e.g. 500.0000001 from balance
  // math) doesn't spuriously render ".00" on an otherwise-whole amount.
  const hasFraction = Math.abs(amount - Math.round(amount)) >= 0.005;
  const opts = hasFraction
    ? { minimumFractionDigits: 2, maximumFractionDigits: Math.max(decimals, 2) }
    : { maximumFractionDigits: decimals };
  return amount.toLocaleString(locale, opts);
}
