/**
 * Self-check for amount fraction-digit formatting. Run with:
 *   npx tsx src/utils/formatAmount.check.ts
 */
import { formatAmountDigits } from "./formatAmount";

let failures = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) { failures++; console.error(`FAIL ${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`); }
}

// INR (decimals: 0) — the reported bug: paise must survive.
eq(formatAmountDigits(1.1, "en-IN", 0), "1.10", "INR 1.10 keeps two decimals");
eq(formatAmountDigits(104.89, "en-IN", 0), "104.89", "INR 104.89 keeps two decimals");
eq(formatAmountDigits(500, "en-IN", 0), "500", "INR whole stays clean, no .00");
eq(formatAmountDigits(123456, "en-IN", 0), "1,23,456", "INR grouping preserved for whole amounts");

// Float noise from balance math shouldn't force decimals onto a whole amount.
eq(formatAmountDigits(500.0000001, "en-IN", 0), "500", "float noise below threshold reads as whole");

// A currency that already shows 2 decimals is unaffected for whole values.
eq(formatAmountDigits(500, "en-US", 2), "500", "USD whole with maxFractionDigits 2 stays 500");
eq(formatAmountDigits(500.5, "en-US", 2), "500.50", "USD fractional shows two decimals");

if (failures) throw new Error(`${failures} formatters check(s) failed`);

console.log("formatters: all checks passed");
