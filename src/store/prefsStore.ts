/**
 * UI preferences — display options that don't belong to a data domain.
 * Persisted to AsyncStorage. Currency lives in the account store.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PrefsStore {
  /** Mask monetary amounts on the dashboard for over-the-shoulder privacy. */
  hideAmounts: boolean;
  setHideAmounts: (v: boolean) => void;
}

export const usePrefsStore = create<PrefsStore>()(
  persist(
    (set) => ({
      hideAmounts: false,
      setHideAmounts: (hideAmounts) => set({ hideAmounts }),
    }),
    { name: "prefs-store", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Returns the masked string when amounts are hidden, else the value. */
export function maskAmount(value: string, hidden: boolean): string {
  return hidden ? "••••••" : value;
}
