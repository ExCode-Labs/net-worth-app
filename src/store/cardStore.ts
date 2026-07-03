/**
 * Stores credit/debit cards. Card spends parsed from notifications update each
 * card's `usage` (see cardIngest). Persisted to AsyncStorage.
 *
 * Vault: the full card number (PAN), holder name and network are stored so the
 * card can double as a secure vault entry. CVV is the ONE field never stored.
 * The vault page (app-lock protected) reveals the full number; everywhere else
 * only `last4` is shown — use cardLast4() / maskCardNumber() for display.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { bankMatches, resolveBankCode } from "@/store/accountStore";
import { useBankStore } from "@/store/bankStore";
import { pushCreate, pushUpdate, pushRemove } from "@/services/backend";

export interface Card {
  id:               string;
  cardName:         string;   // e.g. "Regalia Gold"
  bank:             string;   // e.g. "HDFC Bank" (display + fuzzy match; free text allowed)
  bankCode?:        string;   // Bank reference code (IFSC prefix) when the bank is a listed one
  type:             "credit" | "debit";
  billCycle:        string;   // statement generation day of month, e.g. "5"
  dueDate?:         string;   // payment due day of month, e.g. "25"
  number?:          string;   // full PAN — stripped from bootstrap, served only via GET /vault
  cardHolder?:      string;   // name on card — included in bootstrap (not sensitive)
  network?:         string;   // "Visa" | "Mastercard" | "RuPay" | "Amex"
  last4:            string;   // last 4 digits of the card (always shown)
  expiry?:          string;   // MM/YY — stripped from bootstrap, served only via GET /vault
  limit:            number;   // total credit limit (0 for debit cards)
  usage:            number;   // current outstanding (credit) / unused (debit — not tracked)
  linkedAccountId?: string;   // Account.id — required when type = "debit"
}

interface CardStore {
  cards: Card[];
  addCard:    (c: Omit<Card, "id" | "usage"> & { usage?: number }) => Promise<Card>;
  updateCard: (id: string, updates: Partial<Omit<Card, "id">>) => void;
  removeCard: (id: string) => void;
  reset:      () => void;
}

export const useCardStore = create<CardStore>()(
  persist(
    (set) => ({
      cards: [],

      addCard: async (c) => {
        const base = { usage: 0, ...c, bankCode: c.bankCode ?? resolveBankCode(c.bank) };
        const { id } = await pushCreate("cards", base);
        const card = { ...base, id };
        set((s) => ({ cards: [...s.cards, card] }));
        return card;
      },

      updateCard: (id, updates) => {
        // Re-resolve the reference code whenever the bank name changes.
        const patch = updates.bank !== undefined
          ? { ...updates, bankCode: resolveBankCode(updates.bank) }
          : updates;
        set((s) => ({
          cards: s.cards.map((card) => (card.id === id ? { ...card, ...patch } : card)),
        }));
        pushUpdate("cards", id, patch);
      },

      removeCard: (id) => {
        set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }));
        pushRemove("cards", id);
      },

      reset: () => set({ cards: [] }),
    }),
    { name: "card-store", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

// ── Issuer → bank ───────────────────────────────────────────────────────────
// Card-product issuer labels that aren't the bank's reference name. Most issuers
// ("HDFC Bank", "ICICI Bank", …) resolve straight from the Bank list; only the
// card-subsidiary / co-brand labels need a hint. Fintechs with no single issuing
// bank (e.g. "OneCard") are left to fall through and stay unlinked.
const ISSUER_BANK_CODE: Record<string, string> = {
  "SBI Card": "SBIN", // SBI Cards & Payment Services → State Bank of India
};

/**
 * Canonical reference-bank name for a card-product issuer label, so a picked
 * card stores a real bank (and resolves a bankCode) instead of the raw label.
 * Falls back to the issuer itself when it maps to no listed bank.
 */
export function bankForIssuer(issuer: string): string {
  const code = ISSUER_BANK_CODE[issuer] ?? resolveBankCode(issuer);
  if (!code) return issuer;
  return useBankStore.getState().banks.find((b) => b.code === code)?.name ?? issuer;
}

// ── Display helpers ─────────────────────────────────────────────────────────
/** Last 4 digits, preferring the stored full PAN, falling back to `last4`. */
export function cardLast4(c: Card): string {
  const fromFull = (c.number ?? "").replace(/\D/g, "").slice(-4);
  return fromFull || c.last4 || "";
}

/** "•••• •••• •••• 1234" — masks all but the last 4 of the full PAN. */
export function maskCardNumber(c: Card): string {
  const last4 = cardLast4(c);
  return last4 ? `•••• •••• •••• ${last4}` : "••••";
}

/** "1234 5678 9012 3456" — full PAN, grouped. Vault/reveal only. */
export function formatCardNumber(c: Card): string {
  const digits = (c.number ?? "").replace(/\D/g, "");
  return digits ? digits.replace(/(.{4})/g, "$1 ").trim() : "";
}

// ── Matching + selectors ────────────────────────────────────────────────────
/** Find the card a parsed card txn belongs to, by bank + last-4 (or unique last-4). */
export function findMatchingCard(
  cards: Card[],
  bank: string,
  last4: string,
): Card | undefined {
  if (!last4) return undefined;
  const byBankAndNumber = cards.find((c) => cardLast4(c) === last4 && bankMatches(c.bank, bank));
  if (byBankAndNumber) return byBankAndNumber;
  const byNumber = cards.filter((c) => cardLast4(c) === last4);
  return byNumber.length === 1 ? byNumber[0] : undefined;
}

/**
 * True when a card transaction references a card that isn't added (removed or
 * never added). Mirrors isOrphanTransaction for accounts. Manual entries and
 * non-card txns are never orphaned. The txn's `account` is "Card ••1234".
 */
export function isOrphanCardTransaction(
  cards: Card[],
  t: { account: string; bank: string; source: string },
): boolean {
  if (t.source === "manual") return false;
  if (!t.account.startsWith("Card ")) return false;
  const last4 = t.account.replace(/\D/g, "").slice(-4);
  return !findMatchingCard(cards, t.bank, last4);
}

export function selectTotalLimit(s: CardStore) {
  return s.cards.reduce((sum, c) => sum + c.limit, 0);
}
export function selectTotalUsage(s: CardStore) {
  return s.cards.reduce((sum, c) => sum + c.usage, 0);
}
