/**
 * App security — app lock using phone biometrics / device credential.
 *
 * When app lock is enabled, `locked` is set true on cold start and whenever
 * the app returns from background. LockScreen clears it after the user
 * successfully authenticates with their phone's biometric or device PIN.
 *
 * No custom PIN lives here — the OS handles authentication (Face ID,
 * fingerprint, or device PIN/pattern/password). Custom vault PIN is a
 * separate concern managed by vault.tsx + vaultPin service.
 */
import { create } from "zustand";
import { Platform } from "react-native";

let secureStore: typeof import("expo-secure-store") | null = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  secureStore = require("expo-secure-store");
}

const KEY_APP_LOCK = "sec_app_lock";

async function get(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  }
  return secureStore!.getItemAsync(key);
}
async function set(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try { globalThis.localStorage?.setItem(key, value); } catch {}
    return;
  }
  await secureStore!.setItemAsync(key, value);
}

interface SecurityState {
  isHydrated:     boolean;
  appLockEnabled: boolean;
  /** Runtime: overlay should show until authenticate() succeeds. */
  locked:         boolean;

  hydrate:    () => Promise<void>;
  setAppLock: (on: boolean) => Promise<void>;
  lock:       () => void;
  unlock:     () => void;
}

export const useSecurityStore = create<SecurityState>((setState, getState) => ({
  isHydrated:     false,
  appLockEnabled: false,
  locked:         false,

  hydrate: async () => {
    const appLock = await get(KEY_APP_LOCK);
    const appLockEnabled = appLock === "true";
    setState({ appLockEnabled, locked: appLockEnabled, isHydrated: true });
  },

  setAppLock: async (on) => {
    await set(KEY_APP_LOCK, on ? "true" : "false");
    setState({ appLockEnabled: on, locked: false });
  },

  lock:   () => { if (getState().appLockEnabled) setState({ locked: true }); },
  unlock: () => setState({ locked: false }),
}));
