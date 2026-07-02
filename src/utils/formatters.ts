/** Shared number and date formatting utilities */
import { usePrefsStore } from "@/store/prefsStore";
import { useAccountStore } from "@/store/accountStore";
import { convertFromINR } from "@/store/currencyStore";
import { currencyInfo } from "@/constants/currencies";

/**
 * Fixed-length mask shown in place of the number while "hide amounts" is on.
 * A fixed token (not a per-digit replacement) so it neither leaks the amount's
 * magnitude via digit count, nor silently fails to mask when the value has no
 * digits to replace (e.g. a NaN aggregate would format to "NaN").
 */
const MASK = "✦✦✦✦";

/** All amounts are stored in INR; convert to the user's selected currency for display. */
function toDisplay(n: number): { amount: number; symbol: string; locale: string; decimals: number } {
  const info = currencyInfo(useAccountStore.getState().currency);
  // Guard against NaN/Infinity inputs so a bad aggregate shows ₹0, not "₹NaN".
  const safe = Number.isFinite(n) ? n : 0;
  return { amount: convertFromINR(safe, info.code), symbol: info.symbol, locale: info.locale, decimals: info.decimals };
}

/** ₹1,23,456 (or the equivalent in the selected currency) */
export function fmt(n: number): string {
  const { amount, symbol, locale, decimals } = toDisplay(Math.abs(n));
  if (usePrefsStore.getState().hideAmounts) return `${symbol}${MASK}`;
  return `${symbol}${amount.toLocaleString(locale, { maximumFractionDigits: decimals })}`;
}

/** Like fmt but keeps a leading minus for negative values — for raw aggregates
 *  (net worth, total balance) that can legitimately go negative and are shown
 *  without a caller-supplied sign. fmt() itself stays abs-only for the many call
 *  sites that add their own +/− prefix. */
export function fmtSigned(n: number): string {
  return (n < 0 ? "−" : "") + fmt(n);
}

/** ₹1.2L · ₹4.5K · $1.2M (one decimal, trailing .0 trimmed; keeps sign).
 *  INR uses lakh (L); other currencies use million (M) — both fall back to K under 1000. */
const trimDec = (v: number) => v.toFixed(1).replace(/\.0$/, "");
export function fmtShort(n: number): string {
  const { amount: abs, symbol } = toDisplay(Math.abs(n));
  const sign = n < 0 ? "-" : "";
  if (usePrefsStore.getState().hideAmounts) return `${sign}${symbol}${MASK}`;

  const bigUnit = useAccountStore.getState().currency === "INR"
    ? { threshold: 1_00_000, div: 1_00_000, suffix: "L" }
    : { threshold: 1_000_000, div: 1_000_000, suffix: "M" };

  if (abs >= bigUnit.threshold) return `${sign}${symbol}${trimDec(abs / bigUnit.div)}${bigUnit.suffix}`;
  if (abs >= 1000) return `${sign}${symbol}${trimDec(abs / 1000)}K`;
  return `${sign}${symbol}${Math.round(abs)}`;
}

/** "Good Morning" / "Good Afternoon" / "Good Evening" */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

/** Format a JS Date → "12 June 2024" */
export function fmtDate(d: Date = new Date()): string {
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
}
