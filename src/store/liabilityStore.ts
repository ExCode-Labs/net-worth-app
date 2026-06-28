/**
 * Stores liabilities — loans, EMIs, mortgages and other dues the user owes.
 * Persisted to AsyncStorage. Subtracted from assets/balances to compute net
 * worth. Card outstanding is tracked separately in cardStore.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { pushCreate, pushUpdate, pushRemove } from "@/services/backend";
import { uid } from "@/utils/id";
import type { LedgerRefs } from "@/store/accountStore";

export interface Liability {
  id:      string;
  type:    string;   // "loan" | "emi" | "mortgage" | "credit" | "other"
  name:    string;   // e.g. "Home Loan"
  lender:  string;   // person or institution, e.g. "Raj Sharma" / "HDFC Bank"
  phone:   string;   // lender's mobile (person borrows); "" otherwise
  balance: number;   // outstanding amount owed
  emi:     number;   // monthly instalment (0 if none)
  details?: LedgerRefs; // borrow: which account received/repaid + linked txns
  closed?: boolean;  // repaid/settled — kept as history, excluded from totals
                     // and the active list
  startDate?: string;     // ISO date the loan/EMI/borrow started
  periodMonths?: number;  // tenure in months
}

interface LiabilityStore {
  liabilities: Liability[];

  addLiability:    (l: Omit<Liability, "id">) => void;
  updateLiability: (id: string, updates: Partial<Omit<Liability, "id">>) => void;
  removeLiability: (id: string) => void;
  reset:           () => void;
}

export const useLiabilityStore = create<LiabilityStore>()(
  persist(
    (set) => ({
      liabilities: [],

      addLiability: (l) => {
        const liability = { ...l, id: uid() };
        set((s) => ({ liabilities: [...s.liabilities, liability] }));
        pushCreate("liabilities", liability);
      },

      updateLiability: (id, updates) => {
        set((s) => ({
          liabilities: s.liabilities.map((x) => (x.id === id ? { ...x, ...updates } : x)),
        }));
        pushUpdate("liabilities", id, updates);
      },

      removeLiability: (id) => {
        set((s) => ({ liabilities: s.liabilities.filter((x) => x.id !== id) }));
        pushRemove("liabilities", id);
      },

      reset: () => set({ liabilities: [] }),
    }),
    { name: "liability-store", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export function selectTotalLiabilities(s: LiabilityStore) {
  return s.liabilities.reduce((sum, l) => (l.closed ? sum : sum + l.balance), 0);
}
