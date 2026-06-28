/**
 * Cached bank reference list. Seeded from the bundled constant, refreshed from
 * the backend (GET /banks) on launch, and persisted so the picker works offline.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { INDIAN_BANKS, type IndianBank } from "@/constants/indianBanks";
import { fetchBanks } from "@/services/banks";

interface BankStore {
  banks: IndianBank[];
  refresh: () => Promise<void>;
}

export const useBankStore = create<BankStore>()(
  persist(
    (set) => ({
      banks: INDIAN_BANKS,

      refresh: async () => {
        try {
          const rows = await fetchBanks();
          if (rows && rows.length) {
            set({
              banks: rows.map((b) => ({
                name: b.name,
                code: b.code,
                acct: b.acctExample ?? undefined,
                acctMin: b.acctMin,
                acctMax: b.acctMax,
                category: b.category as IndianBank["category"],
              })),
            });
          }
        } catch {
          // Keep the cached / bundled list on any failure.
        }
      },
    }),
    {
      name: "bank-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ banks: s.banks }),
    },
  ),
);
