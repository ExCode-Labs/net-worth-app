/**
 * Stores transactions — manually added or parsed from bank notifications.
 * Parsed bank txns are applied automatically (no review step); see bankIngest.
 * Persisted to AsyncStorage so history survives app restarts.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncCreate, pushUpdate, pushRemove } from "@/services/backend";
import { useAccountStore } from "@/store/accountStore";
import { uid } from "@/utils/id";

export type TxSource = "manual" | "notification" | "email";
export type TxType   = "Expense" | "Income" | "Transfer";
export type TxStatus = "pending" | "confirmed" | "skipped";

export interface Transaction {
  id:           string;
  type:         TxType;
  amount:       number;       // always positive; sign derived from type
  category:     string;
  merchant:     string;
  account:      string;       // last-4 or account label (display only)
  accountId?:   string;       // account store id — set for manual txns, drives balance update
  toAccountId?: string;       // destination account id for Transfer type
  cardId?:      string;       // card store id — set when a notification txn is matched to a card
  bank:         string;
  date:         string;       // ISO string
  note:         string;
  source:       TxSource;
  status:       TxStatus;
  rawText?:     string;
  confidence:   "high" | "low";
}

interface TransactionStore {
  transactions: Transaction[];

  addTransaction:    (t: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, "id">>) => void;
  removeTransaction: (id: string) => void;
  /** Retag every transaction sharing this merchant with the given category. */
  categorizeByMerchant: (merchant: string, category: string) => void;
  reset:             () => void;
}

/**
 * Apply (or reverse) a transaction's effect on account balances.
 * Only fires when accountId is set (manual txns). Notification txns are
 * handled by bankIngest directly — don't set accountId on them.
 */
function applyTxBalance(tx: Omit<Transaction, "id"> & { id?: string }, sign: 1 | -1) {
  // Only manual txns drive balances here. Notification/card txns are applied
  // out-of-band by bankIngest (to the bank's authoritative balance) and carry no
  // accountId — without this guard, opening one in the edit screen (which invents
  // an accountId from the label) would subtract the amount on save even if nothing
  // changed, because the reverse pass finds no old accountId to cancel it. (#15)
  if (tx.source !== "manual") return;
  if (!tx.accountId && !tx.toAccountId) return;
  const { accounts, updateAccount } = useAccountStore.getState();

  if (tx.accountId) {
    const acc = accounts.find((a) => a.id === tx.accountId);
    if (acc) {
      // Income adds to balance; Expense and Transfer (from-side) subtract.
      const delta = tx.type === "Income" ? tx.amount : -tx.amount;
      updateAccount(acc.id, { balance: acc.balance + sign * delta });
    }
  }

  if (tx.type === "Transfer" && tx.toAccountId) {
    // Re-read state so we see the updated from-account balance.
    const fresh = useAccountStore.getState().accounts.find((a) => a.id === tx.toAccountId);
    if (fresh) {
      // TO side always receives the amount (opposite sign for reversal).
      updateAccount(fresh.id, { balance: fresh.balance + sign * tx.amount });
    }
  }
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (t) => {
        const tx = { ...t, id: uid() };
        set((s) => ({ transactions: [tx, ...s.transactions] }));
        syncCreate("transactions", tx);
        applyTxBalance(tx, 1);
      },

      updateTransaction: (id, updates) => {
        const old = get().transactions.find((t) => t.id === id);
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
        pushUpdate("transactions", id, updates);
        if (old) {
          applyTxBalance(old, -1);                   // reverse old effect
          applyTxBalance({ ...old, ...updates }, 1); // apply new effect
        }
      },

      removeTransaction: (id) => {
        const tx = get().transactions.find((t) => t.id === id);
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
        pushRemove("transactions", id);
        if (tx) applyTxBalance(tx, -1);
      },

      categorizeByMerchant: (merchant, category) => {
        const key = merchant.trim().toLowerCase();
        if (!key || !category) return;
        const changed: string[] = [];
        set((s) => ({
          transactions: s.transactions.map((t) => {
            if (t.merchant.trim().toLowerCase() === key && t.category !== category) {
              changed.push(t.id);
              return { ...t, category };
            }
            return t;
          }),
        }));
        changed.forEach((id) => pushUpdate("transactions", id, { category }));
      },

      reset: () => set({ transactions: [] }),
    }),
    {
      name:    "transaction-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
