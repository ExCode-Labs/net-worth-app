/**
 * Payee alias map — remembers a friendly name for a UPI VPA / raw counterparty.
 *
 * Bank messages give either a name ("RAHULKUMAR") or a bare VPA
 * ("6200881612@ptsbi") — rarely both. This store lets the app show a stable
 * friendly name instead of a cryptic handle:
 *   - resolve(key)  → the saved alias, or null
 *   - setAlias(key) → user/manual override (e.g. from a future "Payees" screen)
 *
 * No external API is involved (VPA→name lookup isn't publicly available);
 * aliases are built on-device over time. Persisted to AsyncStorage.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Normalise a counterparty/VPA into a stable lookup key. */
export function payeeKey(raw: string): string {
  return raw.trim().toLowerCase();
}

interface PayeeStore {
  aliases: Record<string, string>;
  setAlias: (key: string, name: string) => void;
  removeAlias: (key: string) => void;
  reset: () => void;
}

export const usePayeeStore = create<PayeeStore>()(
  persist(
    (set) => ({
      aliases: {},
      setAlias: (key, name) =>
        set((s) => ({ aliases: { ...s.aliases, [payeeKey(key)]: name.trim() } })),
      removeAlias: (key) =>
        set((s) => {
          const next = { ...s.aliases };
          delete next[payeeKey(key)];
          return { aliases: next };
        }),
      reset: () => set({ aliases: {} }),
    }),
    { name: "payee-store", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Friendly display name for a counterparty, applying any saved alias. */
export function resolvePayee(raw: string): string {
  if (!raw) return "";
  return usePayeeStore.getState().aliases[payeeKey(raw)] ?? raw;
}
