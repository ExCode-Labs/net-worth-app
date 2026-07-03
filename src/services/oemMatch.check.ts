/**
 * Self-check for OEM brand matching. Run with:
 *   npx tsx src/services/oemMatch.check.ts
 */
import { matchOemKey } from "./oemMatch";

let failures = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) { failures++; console.error(`FAIL ${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`); }
}

eq(matchOemKey("Xiaomi"), "xiaomi", "exact brand");
eq(matchOemKey("POCO"), "poco", "sub-brand");
eq(matchOemKey("Redmi Note 12"), "redmi", "model string containing brand");
eq(matchOemKey("vivo"), "vivo", "vivo lowercase");
eq(matchOemKey("realme"), "realme", "realme");
// "oppo" is a substring check, so make sure it doesn't accidentally match unrelated brands.
eq(matchOemKey("Google"), undefined, "unknown/unrestricted brand");
eq(matchOemKey("samsung"), undefined, "samsung has no known separate autostart activity");
eq(matchOemKey(""), undefined, "empty brand");

if (failures) throw new Error(`${failures} oemMatch check(s) failed`);

console.log("oemMatch: all checks passed");
