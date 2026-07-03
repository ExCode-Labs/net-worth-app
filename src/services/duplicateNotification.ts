/**
 * Same real payment often surfaces as two separate notifications — e.g. a UPI
 * app's own alert (BHIM, GPay, ...) and the bank's SMS for the same transfer —
 * with completely different text, so notifDedup's exact-text match can't catch
 * it. Two tiers, in order of reliability:
 *
 *   1. When the incoming message states a reference (UPI Ref / RRN / Txn ID —
 *      see bankMessageParser.extractRef), the decision is PURELY ref-based: it's
 *      a duplicate iff an existing notification txn carries the same ref. A
 *      different (or absent) stored ref means a genuinely different payment —
 *      two distinct UPI transfers never share a reference — so it is captured
 *      even if the amount and arrival time coincide. No time window applies.
 *   2. Only when the incoming message states NO ref do we fall back to a coarse
 *      amount + direction + arrival-time window (some interest payouts, terse
 *      bank formats carry no ref). Measured against real arrival time
 *      (`ingestedAt`), NOT the message's stated date — bank SMSes are frequently
 *      day-granular, so two different same-amount payments on one day would both
 *      collapse to midnight and wrongly dedupe if compared by date.
 *
 * ponytail: the ref-less time fallback can still merge two genuine same-amount
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

  // 1. Ref stated → decision is purely ref-based. A matching stored ref is the
  //    same payment; anything else is a different one, so DON'T fall through to
  //    the time window (which would wrongly merge distinct same-amount payments).
  if (ref) return notifs.some((t) => t.ref === ref);

  // 2. No ref → coarse amount + direction + arrival-time window.
  return notifs.some((existing) => {
    if (existing.ingestedAt == null) return false; // pre-existing txns without an arrival time can't be compared
    if (existing.amount !== amount) return false;
    if ((existing.type === "Income") !== isCredit) return false;
    return Math.abs(nowMs - existing.ingestedAt) <= windowMs;
  });
}
