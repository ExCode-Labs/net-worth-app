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

/**
 * Call once at the top of any screen that renders fmt()/fmtShort() output.
 * Those read hideAmounts as a store snapshot (they're plain functions, not
 * hooks), so a screen that never subscribes won't re-render — and stays
 * stuck showing whatever masked/unmasked state was true at its last render
 * — when the toggle is flipped from elsewhere (e.g. the home screen).
 */
export function useAmountVisibilitySync(): void {
  usePrefsStore((s) => s.hideAmounts);
}
