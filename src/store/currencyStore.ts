/**
 * Live INR → foreign-currency exchange rates, for display conversion only
 * (all amounts are stored in INR — see constants/currencies.ts). Uses a free,
 * no-key endpoint. Persisted so a stale rate is available offline; refetched
 * in the background when older than REFRESH_MS, or immediately (bypassing the
 * cache) when the user actively switches currency.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REFRESH_MS = 60 * 60 * 1000; // 1 hour
const RATES_URL = "https://open.er-api.com/v6/latest/INR";

interface CurrencyStore {
  rates:      Record<string, number> | null;  // 1 INR expressed in each currency
  updatedAt:  number | null;
  fetchRates: (force?: boolean) => Promise<void>;
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      rates: null,
      updatedAt: null,
      fetchRates: async (force = false) => {
        const { updatedAt } = get();
        if (!force && updatedAt && Date.now() - updatedAt < REFRESH_MS) return;
        try {
          const res = await fetch(RATES_URL);
          const json = await res.json();
          if (json?.result === "success" && json.rates) {
            set({ rates: json.rates, updatedAt: Date.now() });
          }
        } catch {
          // keep the last known rates (or null) — convertFromINR falls back to unconverted
        }
      },
    }),
    { name: "currency-store", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Convert an amount stored in INR to `toCode` using the last-fetched rate. */
export function convertFromINR(amountInINR: number, toCode: string): number {
  if (toCode === "INR") return amountInINR;
  const rate = useCurrencyStore.getState().rates?.[toCode];
  return rate ? amountInINR * rate : amountInINR;
}
