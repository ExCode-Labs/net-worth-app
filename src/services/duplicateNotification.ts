/**
 * Same real payment often surfaces as two separate notifications — e.g. a UPI
 * app's own alert (BHIM, GPay, ...) and the bank's SMS for the same transfer —
 * with completely different text, so notifDedup's exact-text match can't catch
 * it. Two tiers, in order of reliability:
 *
 *   1. Reference match — both notifications carry the same UPI Ref / RRN / Txn
 *      ID (see bankMessageParser.extractRef). Same ref = same payment, full
 *      stop, regardless of arrival time. This is the primary key.
 *   2. Time-window fallback — for the minority of alerts that state no ref
 *      (some interest payouts, terse bank formats): same amount + direction that
 *      ARRIVED within a couple of minutes. Measured against real arrival time
 *      (`ingestedAt`), NOT the message's stated date — bank SMSes are frequently
 *      day-granular, so two genuinely different same-amount payments on one day
 *      would both collapse to midnight and wrongly dedupe if compared by date.
 *
 * ponytail: the time fallback can still merge two genuine ref-less same-amount
 * payments within ~2 min — rare, and far better than double-counting every UPI
 * transfer (bank SMS + app alert) as the default.
 *
 * Pure (takes the transaction list as an argument) so it's unit-testable
 * without pulling in bankIngest's store/expo-device dependency chain.
 */
export const CROSS_SOURCE_DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

export interface DuplicateCandidate {
  source: string;
  amount: number;
  type: string;    // "Income" | "Expense"
  ref?: string;    // UPI Ref / RRN / Txn ID, when the message stated one
  ingestedAt?: number; // epoch ms the notification arrived
}

export function isCrossSourceDuplicate(
  transactions: DuplicateCandidate[],
  amount: number,
  isCredit: boolean,
  ref: string | null,
  nowMs: number,
  windowMs = CROSS_SOURCE_DUPLICATE_WINDOW_MS,
): boolean {
  const notifs = transactions.filter((t) => t.source === "notification");

  // 1. Exact reference match — the same payment, whenever it arrived.
  if (ref && notifs.some((t) => t.ref === ref)) return true;

  // 2. Fallback: same amount + direction arrived within the window.
  return notifs.some((existing) => {
    if (existing.ingestedAt == null) return false; // pre-existing txns without an arrival time can't be compared
    if (existing.amount !== amount) return false;
    if ((existing.type === "Income") !== isCredit) return false;
    return Math.abs(nowMs - existing.ingestedAt) <= windowMs;
  });
}
