/**
 * Learned category map — remembers which category a merchant/payee belongs to,
 * so once you categorise one "Swiggy" charge every other Swiggy charge (past and
 * future) follows. Same on-device learning pattern as the payee alias map.
 *
 *   resolveCategory(merchant) → the learned category, or null
 *   learnCategory(merchant, c) → save the rule AND retag all matching txns
 *
 * Persisted to AsyncStorage.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTransactionStore } from "@/store/transactionStore";

/** Normalise a merchant/payee into a stable lookup key. */
export function categoryKey(merchant: string): string {
  return merchant.trim().toLowerCase();
}

interface CategoryStore {
  rules: Record<string, string>; // merchantKey → category
  setRule: (merchant: string, category: string) => void;
  removeRule: (merchant: string) => void;
  reset: () => void;
}

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set) => ({
      rules: {},
      setRule: (merchant, category) => {
        const key = categoryKey(merchant);
        if (!key || !category) return;
        set((s) => ({ rules: { ...s.rules, [key]: category } }));
      },
      removeRule: (merchant) =>
        set((s) => {
          const next = { ...s.rules };
          delete next[categoryKey(merchant)];
          return { rules: next };
        }),
      reset: () => set({ rules: {} }),
    }),
    { name: "category-store", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Learned category for a merchant, or null if none. */
export function resolveCategory(merchant: string): string | null {
  const key = categoryKey(merchant);
  if (!key) return null;
  return useCategoryStore.getState().rules[key] ?? null;
}

/**
 * Remember merchant→category and immediately retag every existing transaction
 * with the same merchant. Called whenever the user sets a category. "Unknown"
 * merchants are skipped — too broad to learn from.
 */
export function learnCategory(merchant: string, category: string): void {
  const key = categoryKey(merchant);
  if (!key || key === "unknown" || !category) return;
  useCategoryStore.getState().setRule(merchant, category);
  useTransactionStore.getState().categorizeByMerchant(merchant, category);
}
