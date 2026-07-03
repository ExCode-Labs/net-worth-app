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

const T0 = 1_000_000_000_000; // arbitrary epoch ms of the first arrival

// ── Reference match (primary) ────────────────────────────────────────────────
const withRef: DuplicateCandidate[] = [
  { source: "notification", amount: 500, type: "Expense", ref: "142923550637", ingestedAt: T0 },
];
// Same ref = same payment, even hours later and even if the amount were misread.
eq(isCrossSourceDuplicate(withRef, 500, false, "142923550637", T0 + 6 * 60 * 60_000), true, "same ref, 6h later → duplicate");
// A stated, different ref is a DIFFERENT payment — captured even at the same
// amount seconds later. This is the fix for repeated captures being dropped.
eq(isCrossSourceDuplicate(withRef, 500, false, "999999999999", T0 + 10_000), false, "different ref, same amount 10s later → captured");
eq(isCrossSourceDuplicate(withRef, 500, false, "999999999999", T0 + 30 * 60_000), false, "different ref, 30 min later → captured");

// ── Time-window fallback (no ref stated) ─────────────────────────────────────
const noRef: DuplicateCandidate[] = [
  { source: "notification", amount: 500, type: "Expense", ingestedAt: T0 },
];
// Same amount/direction, arrived 30s later, neither states a ref → dedupe by time.
eq(isCrossSourceDuplicate(noRef, 500, false, null, T0 + 30_000), true, "no ref, same payment 30s apart");
// Regression: two different same-amount payments the SAME day used to collapse
// (both compared at midnight). Now keyed on real arrival time → captured.
eq(isCrossSourceDuplicate(noRef, 500, false, null, T0 + 4 * 60 * 60_000), false, "no ref, same amount 4h later → different payment");
// Different amount within the window → not a duplicate.
eq(isCrossSourceDuplicate(noRef, 700, false, null, T0 + 20_000), false, "different amount");
// Opposite direction → not a duplicate.
eq(isCrossSourceDuplicate(noRef, 500, true, null, T0 + 20_000), false, "opposite direction");
// Existing txn without an arrival time can't be time-compared.
const noTime: DuplicateCandidate[] = [{ source: "notification", amount: 500, type: "Expense" }];
eq(isCrossSourceDuplicate(noTime, 500, false, null, T0), false, "existing txn without ingestedAt is skipped");
// Manual entry never counts as a source duplicate.
const manual: DuplicateCandidate[] = [{ source: "manual", amount: 500, type: "Expense", ref: "142923550637", ingestedAt: T0 }];
eq(isCrossSourceDuplicate(manual, 500, false, "142923550637", T0 + 20_000), false, "manual entry doesn't count, even with matching ref");

if (failures) throw new Error(`${failures} duplicateNotification check(s) failed`);

console.log("duplicateNotification: all checks passed");
