/**
 * Stores accounts and assets entered during onboarding (and later management screens).
 * Persisted to AsyncStorage so data survives app restarts.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { pushCreate, syncCreate, pushUpdate, pushRemove, updateMe } from "@/services/backend";
import { useBankStore } from "@/store/bankStore";

export interface Account {
  id: string;
  type: string;             // "bank" | "wallet" | "cash" | "upi"
  bank: string;             // e.g. "HDFC Bank" (display + fuzzy match; free text allowed)
  bankCode?: string;        // Bank reference code (IFSC prefix) when the bank is a listed one
  nickname: string;         // e.g. "HDFC - 1234"
  balance: number;
  accountName?: string;     // optional holder/label, e.g. "Salary Account"
  accountNumber?: string;   // full account number (vault) — masked outside vault page
  ifsc?: string;            // optional IFSC code
  branch?: string;          // optional branch name
}

/**
 * Optional links tying an asset/liability to the money movement behind it: which
 * account a leg touched (`accountId`, or the "cash" sentinel) and the transaction
 * that records it (`txnId`). Reference only — these never mutate balances (the
 * linked txns already do that).
 *   from — the initial leg: asset invested-from / lent paid-from; liability
 *          credited-into / borrow received-into.
 *   emi  — liabilities only: the account recurring EMIs are paid from.
 *   to   — the settlement, captured on close: asset proceeds-to / lent
 *          returned-into; liability repaid-from.
 */
export interface LedgerRefs {
  fromAccountId?: string;  // account id, or "cash"
  fromTxnId?: string;
  emiAccountId?: string;
  emiTxnId?: string;
  toAccountId?: string;
  toTxnId?: string;
}

export const CASH_ACCOUNT = "cash";

/**
 * Type-specific asset fields. `value` (on Asset) is always the rupee amount that
 * counts toward net worth; `details` holds the inputs that produced it so the
 * form can be re-edited and richer info shown.
 */
export interface AssetDetails extends LedgerRefs {
  // gold (grams × rate), stocks (shares × price), mutual_fund (units × NAV)
  quantity?: number;
  rate?: number;            // ₹/gram, ₹/share, or NAV
  // mutual fund
  schemeCode?: number;
  // fixed / recurring deposit
  bank?: string;            // chosen from the user's existing accounts
  principal?: number;       // FD: lump sum; RD: monthly instalment
  interestRate?: number;    // annual %
  tenureMonths?: number;
  maturityAmount?: number;  // computed
  startDate?: string;       // ISO
  // LIC
  policyNumber?: string;
  sumAssured?: number;
  premium?: number;         // annual premium
  // lent (money owed to the user)
  phone?: string;           // borrower's mobile
}

export interface Asset {
  id: string;
  type: string;       // mutual_fund | stocks | gold | property | fd | rd | lic | cash
  name: string;       // e.g. "HDFC Flexi Cap Fund"
  value: number;      // current value in ₹ (counts toward net worth)
  details?: AssetDetails;
  closed?: boolean;   // archived (e.g. sold / matured / repaid) — kept as history,
                      // excluded from net-worth totals and the active list
  startDate?: string;     // ISO date acquired / invested
  periodMonths?: number;  // holding period / lock-in / tenure, in months
}

interface AccountStore {
  currency: string;
  accounts: Account[];
  assets:   Asset[];

  setCurrency:   (c: string) => void;
  addAccount:    (a: Omit<Account, "id">) => Promise<Account>;
  updateAccount: (id: string, updates: Partial<Omit<Account, "id">>) => void;
  removeAccount: (id: string) => void;
  addAsset:      (a: Omit<Asset, "id">) => Promise<Asset>;
  updateAsset:   (id: string, updates: Partial<Omit<Asset, "id">>) => void;
  removeAsset:   (id: string) => void;
  reset:         () => void;
}

const DEFAULT: Pick<AccountStore, "currency" | "accounts" | "assets"> = {
  currency: "INR",
  accounts: [],
  assets:   [],
};

export const useAccountStore = create<AccountStore>()(
  persist(
    (set) => ({
      ...DEFAULT,

      setCurrency: (currency) => {
        set({ currency });
        void updateMe({ currency });
      },

      addAccount: async (a) => {
        const base = { ...a, bankCode: a.bankCode ?? resolveBankCode(a.bank) };
        const { id } = await pushCreate("accounts", base);
        const account = { ...base, id };
        set((s) => ({ accounts: [...s.accounts, account] }));
        return account;
      },

      updateAccount: (id, updates) => {
        // Re-resolve the reference code whenever the bank name changes.
        const patch = updates.bank !== undefined
          ? { ...updates, bankCode: resolveBankCode(updates.bank) }
          : updates;
        set((s) => ({
          accounts: s.accounts.map((acc) =>
            acc.id === id ? { ...acc, ...patch } : acc,
          ),
        }));
        pushUpdate("accounts", id, patch);
      },

      removeAccount: (id) => {
        set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
        pushRemove("accounts", id);
      },

      addAsset: async (a) => {
        const { id } = await pushCreate("assets", a);
        const asset = { ...a, id };
        set((s) => ({ assets: [...s.assets, asset] }));
        return asset;
      },

      updateAsset: (id, updates) => {
        set((s) => ({
          assets: s.assets.map((asset) =>
            asset.id === id ? { ...asset, ...updates } : asset,
          ),
        }));
        pushUpdate("assets", id, updates);
      },

      removeAsset: (id) => {
        set((s) => ({ assets: s.assets.filter((a) => a.id !== id) }));
        pushRemove("assets", id);
      },

      reset: () => set(DEFAULT),
    }),
    {
      name:    "account-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ── Account matching helpers ───────────────────────────────────────────────────
/** Last 4 digits of an account's number, or "" if none on file. */
export function accountLast4(a: Account): string {
  return (a.accountNumber ?? "").replace(/\D/g, "").slice(-4);
}

/** "•••• 1234" — masks all but the last 4. For use outside the vault page. */
export function maskAccountNumber(a: Account): string {
  const last4 = accountLast4(a);
  return last4 ? `•••• ${last4}` : "";
}

/** Short label for an account in pickers/rows: nickname → name → "Bank ••1234". */
export function accountLabel(a: Account): string {
  const last4 = accountLast4(a);
  return (
    a.nickname?.trim() ||
    a.accountName?.trim() ||
    (last4 ? `${a.bank} ••${last4}` : a.bank) ||
    "Account"
  );
}

/** Normalise a bank name for fuzzy comparison ("Kotak Bank" ≈ "kotak"). */
function normalizeBank(s: string): string {
  return s.toLowerCase().replace(/\bbank\b/g, "").replace(/[^a-z]/g, "");
}

/** True if two bank names refer to the same bank (one contains the other). */
export function bankMatches(a: string, b: string): boolean {
  const na = normalizeBank(a), nb = normalizeBank(b);
  return !!na && !!nb && (na.includes(nb) || nb.includes(na));
}

/**
 * Resolve a bank name to its reference `code` (exact name, then fuzzy). Returns
 * undefined for custom/unknown banks — the display name stays the source of
 * truth, this just adds an integrity link when the bank is a listed one.
 */
export function resolveBankCode(name: string): string | undefined {
  const n = name.trim();
  if (!n) return undefined;
  const banks = useBankStore.getState().banks;
  const exact = banks.find((b) => b.name.toLowerCase() === n.toLowerCase());
  if (exact) return exact.code;
  return banks.find((b) => bankMatches(b.name, n))?.code;
}

/**
 * Find the stored bank account a parsed transaction belongs to, by matching
 * bank name + last-4 digits. Falls back to a unique last-4 match across banks.
 */
export function findMatchingAccount(
  accounts: Account[],
  bank: string,
  last4: string,
): Account | undefined {
  if (last4) {
    const byBankAndNumber = accounts.find(
      (a) => accountLast4(a) === last4 && bankMatches(a.bank, bank),
    );
    if (byBankAndNumber) return byBankAndNumber;

    const byNumber = accounts.filter((a) => accountLast4(a) === last4);
    return byNumber.length === 1 ? byNumber[0] : undefined;
  }

  // No account number in the alert (e.g. Airtel Payments Bank) — match by bank
  // name only, and only when it's unambiguous.
  const byBank = accounts.filter((a) => bankMatches(a.bank, bank));
  return byBank.length === 1 ? byBank[0] : undefined;
}

/**
 * True when a transaction references a bank account that isn't in the store —
 * e.g. the account was removed, or never added. Such txns are kept out of the
 * main list and surfaced as "add this account" prompts. Manual entries (generic
 * account label, no bank) and card txns (belong to a card, not an account) are
 * never orphaned. The txn's `account` carries the last-4 (e.g. "XX1234").
 */
export function isOrphanTransaction(
  accounts: Account[],
  t: { account: string; bank: string; source: string; cardId?: string },
): boolean {
  if (t.source === "manual") return false;
  if (t.account.startsWith("Card ")) return false;
  // Notification misrouted through the bank parser but later stamped by
  // replayForNewCard — it belongs to a card now, not an account orphan.
  if (t.cardId) return false;
  const last4 = t.account.replace(/\D/g, "").slice(-4);
  return !findMatchingAccount(accounts, t.bank, last4);
}

// ── Computed selectors ─────────────────────────────────────────────────────────
export function selectTotalBalance(s: AccountStore) {
  return s.accounts.reduce((sum, a) => sum + a.balance, 0);
}
export function selectTotalAssets(s: AccountStore) {
  return s.assets.reduce((sum, a) => (a.closed ? sum : sum + a.value), 0);
}
export function selectNetWorth(s: AccountStore) {
  return selectTotalBalance(s) + selectTotalAssets(s);
}
