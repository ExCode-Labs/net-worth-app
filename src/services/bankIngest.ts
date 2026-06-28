/**
 * Bridges the bank-message parsing engine to app state.
 *
 * For each raw bank message:
 *   1. parse it with the engine (bankMessageParser)
 *   2. record it as a transaction immediately (no review step)
 *   3. if it matches a stored account (bank name + last-4), update that
 *      account's balance too
 *
 * The balance is set to the message's stated available balance when present
 * (most accurate), otherwise the amount is applied as a delta. The counterparty
 * is resolved through the payee alias map so saved friendly names win over
 * raw VPAs.
 */
import {
  parseBankMessage,
  parseCardMessage,
  type ParsedBankTxn,
  type ParsedCardTxn,
} from "./bankMessageParser";
import {
  useAccountStore,
  findMatchingAccount,
  type Account,
} from "@/store/accountStore";
import { useCardStore, findMatchingCard, type Card } from "@/store/cardStore";
import { useTransactionStore, type Transaction } from "@/store/transactionStore";
import { resolvePayee } from "@/store/payeeStore";
import { resolveCategory } from "@/store/categoryStore";

export type IngestOutcome = "applied" | "recorded" | "skipped";

export interface IngestSummary {
  applied:  number; // matched an account → balance updated
  recorded: number; // no matching account → logged only
  skipped:  number; // not a parseable bank-account txn
}

/** Build a store Transaction (sans id) from a parsed bank txn. */
function toTransaction(p: ParsedBankTxn): Omit<Transaction, "id"> {
  const merchant = resolvePayee(p.counterparty) || "Unknown";
  const fallback = p.direction === "credit" ? "Income" : "Others";
  return {
    type:       p.direction === "credit" ? "Income" : "Expense",
    amount:     p.amount,
    category:   resolveCategory(merchant) ?? fallback,
    merchant,
    account:    p.accountLast4 ? `XX${p.accountLast4}` : p.bank,
    bank:       p.bank,
    date:       p.occurredAt,
    note:       "",
    source:     "notification",
    status:     "confirmed",
    rawText:    p.raw,
    confidence: p.confidence,
  };
}

/** New balance for an account after a parsed txn. */
function nextBalance(account: Account, p: ParsedBankTxn): number {
  if (p.balance != null) return p.balance;
  return p.direction === "credit"
    ? account.balance + p.amount
    : account.balance - p.amount;
}

/** Ingest a single raw message. `sender` is the notification title/SMS sender,
 *  used to identify the bank. Returns what happened to it. */
export function ingestBankMessage(raw: string, receivedAtMs?: number, sender?: string): IngestOutcome {
  const parsed = parseBankMessage(raw, receivedAtMs, sender);
  if (!parsed) return "skipped";

  // Link to a stored account by bank+last4, falling back to last-4 alone (see
  // findMatchingAccount) — the account-number-only fallback.
  const account = findMatchingAccount(
    useAccountStore.getState().accounts,
    parsed.bank,
    parsed.accountLast4,
  );

  useTransactionStore.getState().addTransaction(toTransaction(parsed));

  if (account) {
    useAccountStore.getState().updateAccount(account.id, {
      balance: nextBalance(account, parsed),
    });
    return "applied";
  }
  return "recorded";
}

/** Build a store Transaction (sans id) from a parsed card txn. */
function cardToTransaction(p: ParsedCardTxn): Omit<Transaction, "id"> {
  const merchant = resolvePayee(p.merchant) || "Unknown";
  const fallback = p.direction === "payment" ? "Card Payment" : "Card Spend";
  return {
    type:       p.direction === "payment" ? "Income" : "Expense",
    amount:     p.amount,
    category:   resolveCategory(merchant) ?? fallback,
    merchant,
    account:    p.cardLast4 ? `Card ••${p.cardLast4}` : p.bank,
    bank:       p.bank,
    date:       p.occurredAt,
    note:       "",
    source:     "notification",
    status:     "confirmed",
    rawText:    p.raw,
    confidence: p.merchant ? "high" : "low",
  };
}

/** Ingest a single raw CARD message. Updates the matching card's usage. */
export function ingestCardMessage(raw: string, receivedAtMs?: number, sender?: string): IngestOutcome {
  const parsed = parseCardMessage(raw, receivedAtMs, sender);
  if (!parsed) return "skipped";

  const card = findMatchingCard(useCardStore.getState().cards, parsed.bank, parsed.cardLast4);

  // Stamp cardId immediately when the card is known, so this transaction is
  // never picked up by replayForNewCard and double-counted.
  const txData = cardToTransaction(parsed);
  useTransactionStore.getState().addTransaction(card ? { ...txData, cardId: card.id } : txData);

  if (card) {
    const delta = parsed.direction === "payment" ? -parsed.amount : parsed.amount;
    useCardStore.getState().updateCard(card.id, {
      usage: Math.max(0, card.usage + delta),
    });
    return "applied";
  }
  return "recorded";
}

/**
 * Ingest any bank/UPI/card alert: tries the bank-account parser first, then
 * falls back to the card parser. The single entry point for the live pipeline.
 */
export function ingestMessage(raw: string, receivedAtMs?: number, sender?: string): IngestOutcome {
  const bank = ingestBankMessage(raw, receivedAtMs, sender);
  if (bank !== "skipped") return bank;
  return ingestCardMessage(raw, receivedAtMs, sender);
}

/**
 * Called after a new account is saved. Finds all unlinked notification
 * transactions that match this account and applies their net delta to the
 * account's starting balance.
 */
export function replayForNewAccount(account: Account): void {
  const txns = useTransactionStore.getState().transactions;
  const last4 = (t: Transaction) => t.account.replace(/\D/g, "").slice(-4);
  const matched = txns.filter(
    (t) => t.source === "notification" && !t.accountId &&
      findMatchingAccount([account], t.bank, last4(t)),
  );
  if (!matched.length) return;
  const net = matched.reduce(
    (sum, t) => sum + (t.type === "Income" ? t.amount : -t.amount),
    0,
  );
  useAccountStore.getState().updateAccount(account.id, {
    balance: account.balance + net,
  });
}

/**
 * Called after a new card is saved. Finds all unlinked notification
 * transactions that match this card and adds their net spend to usage.
 * Also stamps each matched transaction with cardId so future replays
 * don't double-count them.
 */
export function replayForNewCard(card: Card): void {
  const { transactions, updateTransaction } = useTransactionStore.getState();
  const last4 = (t: Transaction) => t.account.replace(/\D/g, "").slice(-4);
  const matched = transactions.filter(
    // !t.cardId: skip transactions already linked to a card (this or another)
    (t) => t.source === "notification" && !t.cardId && !t.accountId &&
      findMatchingCard([card], t.bank, last4(t)),
  );
  if (!matched.length) return;
  const net = matched.reduce(
    (sum, t) => sum + (t.type === "Expense" ? t.amount : -t.amount),
    0,
  );
  useCardStore.getState().updateCard(card.id, {
    usage: Math.max(0, card.usage + net),
  });
  matched.forEach((t) => updateTransaction(t.id, { cardId: card.id }));
}

/** Ingest a batch of raw messages and return a summary count. */
export function ingestBankMessages(
  items: { text: string; time?: number }[],
): IngestSummary {
  const summary: IngestSummary = { applied: 0, recorded: 0, skipped: 0 };
  for (const item of items) {
    const outcome = ingestBankMessage(item.text, item.time);
    if (outcome === "applied") summary.applied += 1;
    else if (outcome === "recorded") summary.recorded += 1;
    else summary.skipped += 1;
  }
  return summary;
}
