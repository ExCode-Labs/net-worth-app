/**
 * Self-check for SMS-sender → bank identification. Run:
 *   npx tsx src/services/bankSenders.check.ts
 */
import { bankFromSender } from "./bankSenders";

let failures = 0;
const eq = (a: unknown, b: unknown, label: string) => {
  if (a !== b) { failures++; console.error(`FAIL ${label}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }
};

// Standard "prefix-CODE" and "prefix-CODE-route" shapes.
eq(bankFromSender("VM-HDFCBK")?.bank, "HDFC Bank", "carrier prefix + code");
eq(bankFromSender("AD-SBIINB-S")?.bank, "State Bank of India", "prefix + code + route");

// Bare code, no prefix.
eq(bankFromSender("PNB")?.bank, "Punjab National Bank", "bare code");

// Longer/more specific token wins over a shorter one also present (sorted longest-first).
eq(bankFromSender("JD-SBIINB")?.bank, "State Bank of India", "longest token preferred");

// Case-insensitivity.
eq(bankFromSender("vm-hdfcbk")?.bank, "HDFC Bank", "lowercase title");

// Glued prefix (no separator) — falls back to substring scan.
eq(bankFromSender("VMHDFCBK")?.bank, "HDFC Bank", "glued prefix substring fallback");

// Unknown sender → null (dispatcher treats this as "not a targeted bank").
eq(bankFromSender("SPAM-PROMO"), null, "unknown sender");
eq(bankFromSender(""), null, "empty title");

// Short (<3 char) tokens are ignored even if they'd otherwise collide.
eq(bankFromSender("AD-BK-IN")?.bank, undefined, "short tokens filtered out");

if (failures) throw new Error(`${failures} bankSenders check(s) failed`);
console.log("bankSenders: all checks passed");
