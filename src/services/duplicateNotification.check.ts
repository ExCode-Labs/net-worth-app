/**
 * Minimal self-check for cross-source duplicate detection (BHIM/UPI-app alert
 * vs. the bank's SMS for the same transfer). Run with:
 *   npx tsx src/services/duplicateNotification.check.ts
 */
import { isCrossSourceDuplicate, type DuplicateCandidate } from "./duplicateNotification";

let failures = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) { failures++; console.error(`FAIL ${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`); }
}

const existing: DuplicateCandidate[] = [
  { source: "notification", amount: 500, type: "Expense", date: "2026-06-05T14:30:00.000Z" },
];

// Same amount/direction, 90s later — BHIM + SMS for the same UPI transfer.
eq(isCrossSourceDuplicate(existing, 500, false, "2026-06-05T14:31:30.000Z"), true, "same payment, 90s apart");

// Same amount/direction, well outside the window — a genuinely later txn.
eq(isCrossSourceDuplicate(existing, 500, false, "2026-06-05T15:00:00.000Z"), false, "same amount, 30 min later");

// Different amount within the window — not a duplicate.
eq(isCrossSourceDuplicate(existing, 700, false, "2026-06-05T14:31:00.000Z"), false, "different amount");

// Same amount but opposite direction (credit vs debit) — not a duplicate.
eq(isCrossSourceDuplicate(existing, 500, true, "2026-06-05T14:31:00.000Z"), false, "opposite direction");

// Manually-entered txn of the same amount shouldn't suppress a real notification txn.
const manual: DuplicateCandidate[] = [{ source: "manual", amount: 500, type: "Expense", date: "2026-06-05T14:30:00.000Z" }];
eq(isCrossSourceDuplicate(manual, 500, false, "2026-06-05T14:30:30.000Z"), false, "manual entry doesn't count as a source duplicate");

if (failures) throw new Error(`${failures} duplicateNotification check(s) failed`);

console.log("duplicateNotification: all checks passed");
