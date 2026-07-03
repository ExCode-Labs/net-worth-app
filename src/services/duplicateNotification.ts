/**
 * Same real payment often surfaces as two separate notifications — e.g. a UPI
 * app's own alert (BHIM, GPay, ...) and the bank's SMS for the same transfer —
 * with completely different text, so notifDedup's exact-text match can't catch
 * it. This is a coarser amount+direction+time-window heuristic: if a
 * notification-sourced txn with the same amount and direction was already
 * recorded within the last few minutes, treat this one as the same payment.
 * ponytail: a second genuine transaction of the identical amount within the
 * window gets dropped too — rare enough to be the right default given every
 * UPI transfer otherwise double-counts every single time.
 *
 * Pure (takes the transaction list as an argument) so it's unit-testable
 * without pulling in bankIngest's store/expo-device dependency chain.
 */
export const CROSS_SOURCE_DUPLICATE_WINDOW_MS = 3 * 60 * 1000;

export interface DuplicateCandidate {
  source: string;
  amount: number;
  type: string;   // "Income" | "Expense"
  date: string;   // ISO
}

export function isCrossSourceDuplicate(
  transactions: DuplicateCandidate[],
  amount: number,
  isCredit: boolean,
  occurredAt: string,
  windowMs = CROSS_SOURCE_DUPLICATE_WINDOW_MS,
): boolean {
  const t = new Date(occurredAt).getTime();
  return transactions.some((existing) => {
    if (existing.source !== "notification") return false;
    if (existing.amount !== amount) return false;
    if ((existing.type === "Income") !== isCredit) return false;
    return Math.abs(new Date(existing.date).getTime() - t) <= windowMs;
  });
}
