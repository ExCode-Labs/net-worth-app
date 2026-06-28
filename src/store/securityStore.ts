/**
 * App security — bank-style app lock.
 *
 * Two factors the user can enable from the Security screen:
 *   • PIN        — 4–6 digits. Only a salted SHA-256 hash is stored (never the
 *                  PIN itself), in SecureStore.
 *   • Biometric  — device biometrics / credential via expo-local-authentication.
 *
 * `locked` is the runtime gate: when app lock is on, LockGate sets it true on
 * cold start and whenever the app returns from the background, and the
 * LockScreen overlay clears it after a successful unlock.
 */
import { create } from "zustand";
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";

let secureStore: typeof import("expo-secure-store") | null = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  secureStore = require("expo-secure-store");
}

const KEY_PIN_HASH  = "sec_pin_hash";
const KEY_APP_LOCK  = "sec_app_lock";
const KEY_BIOMETRIC = "sec_biometric";
// Static app salt — raises the cost of a stolen-hash dictionary attack.
const SALT = "networth.v1.";

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
async function remove(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try { globalThis.localStorage?.removeItem(key); } catch {}
    return;
  }
  await secureStore!.deleteItemAsync(key);
}

function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, SALT + pin);
}

interface SecurityState {
  isHydrated:       boolean;
  appLockEnabled:   boolean;
  biometricEnabled: boolean;
  hasPin:           boolean;
  /** Runtime: app is currently locked and the LockScreen overlay should show. */
  locked:           boolean;

  hydrate:      () => Promise<void>;
  setPin:       (pin: string) => Promise<void>;
  verifyPin:    (pin: string) => Promise<boolean>;
  setAppLock:   (on: boolean) => Promise<void>;
  setBiometric: (on: boolean) => Promise<void>;
  lock:         () => void;
  unlock:       () => void;
}

export const useSecurityStore = create<SecurityState>((setState, getState) => ({
  isHydrated:       false,
  appLockEnabled:   false,
  biometricEnabled: false,
  hasPin:           false,
  locked:           false,

  hydrate: async () => {
    const [pinHash, appLock, biometric] = await Promise.all([
      get(KEY_PIN_HASH),
      get(KEY_APP_LOCK),
      get(KEY_BIOMETRIC),
    ]);
    const appLockEnabled = appLock === "true" && !!pinHash;
    setState({
      hasPin:           !!pinHash,
      appLockEnabled,
      biometricEnabled: biometric === "true",
      // Start locked if app lock is on, so the overlay shows before first frame.
      locked:           appLockEnabled,
      isHydrated:       true,
    });
  },

  setPin: async (pin) => {
    await set(KEY_PIN_HASH, await hashPin(pin));
    setState({ hasPin: true });
  },

  verifyPin: async (pin) => {
    const stored = await get(KEY_PIN_HASH);
    if (!stored) return false;
    return stored === (await hashPin(pin));
  },

  setAppLock: async (on) => {
    // App lock requires a PIN to exist (the fallback when biometrics fail).
    if (on && !getState().hasPin) return;
    await set(KEY_APP_LOCK, on ? "true" : "false");
    if (!on) {
      // Turning lock off also clears the PIN + biometric so the app is open.
      await Promise.all([remove(KEY_PIN_HASH), set(KEY_BIOMETRIC, "false")]);
      setState({ appLockEnabled: false, biometricEnabled: false, hasPin: false, locked: false });
      return;
    }
    setState({ appLockEnabled: true });
  },

  setBiometric: async (on) => {
    await set(KEY_BIOMETRIC, on ? "true" : "false");
    setState({ biometricEnabled: on });
  },

  lock:   () => { if (getState().appLockEnabled) setState({ locked: true }); },
  unlock: () => setState({ locked: false }),
}));
