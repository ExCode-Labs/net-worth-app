import { create } from "zustand";
import { Platform } from "react-native";
import {
  getNotificationAccessStatus,
  notificationListenerAvailable,
  type NotificationAccessStatus,
} from "@/services/notificationListener";
import { updateMe } from "@/services/backend";

// ── Cross-platform secure storage ─────────────────────────────────────────────
let nativeSecureStore: typeof import("expo-secure-store") | null = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nativeSecureStore = require("expo-secure-store");
}

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return nativeSecureStore!.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {}
      return;
    }
    await nativeSecureStore!.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {}
      return;
    }
    await nativeSecureStore!.deleteItemAsync(key);
  },
};

const KEY_WELCOME        = "has_seen_welcome";
const KEY_GUEST          = "guest_mode";
const KEY_ONBOARDED      = "has_onboarded";
const KEY_ACCESS_TOKEN   = "app_access_token";
const KEY_REFRESH_TOKEN  = "app_refresh_token";
const KEY_BATTERY_OPTIM  = "battery_optim_done";

// ── Store interface ───────────────────────────────────────────────────────────
interface AuthState {
  isGuest:        boolean;
  hasSeenWelcome: boolean;
  hasOnboarded:   boolean;
  isHydrated:     boolean;
  isBootstrapped: boolean;

  accessToken:  string | null;
  refreshToken: string | null;
  isSignedIn:   boolean;

  notifGateRequired:   boolean;
  notifAccess:         NotificationAccessStatus;
  batteryOptimDone:    boolean;

  hydrate:              () => Promise<void>;
  refreshNotifAccess:   () => Promise<void>;
  setBatteryOptimDone:  () => Promise<void>;
  completeWelcome:      () => Promise<void>;
  continueAsGuest:      () => Promise<void>;
  completeOnboarding:   () => Promise<void>;
  applyServerOnboarded: (value: boolean) => Promise<void>;
  setSession:           (accessToken: string, refreshToken: string) => Promise<void>;
  updateAccessToken:    (accessToken: string, refreshToken: string) => Promise<void>;
  signOut:              () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isGuest:        false,
  hasSeenWelcome: false,
  hasOnboarded:   false,
  isHydrated:     false,
  isBootstrapped: false,
  accessToken:    null,
  refreshToken:   null,
  isSignedIn:     false,

  notifGateRequired: notificationListenerAvailable,
  notifAccess:       "unknown",
  batteryOptimDone:  false,

  refreshNotifAccess: async () => {
    const status = await getNotificationAccessStatus();
    set({ notifAccess: status });
  },

  setBatteryOptimDone: async () => {
    await storage.set(KEY_BATTERY_OPTIM, "true");
    set({ batteryOptimDone: true });
  },

  hydrate: async () => {
    try {
      const [welcome, guest, onboarded, access, refresh, battery] = await Promise.all([
        storage.get(KEY_WELCOME),
        storage.get(KEY_GUEST),
        storage.get(KEY_ONBOARDED),
        storage.get(KEY_ACCESS_TOKEN),
        storage.get(KEY_REFRESH_TOKEN),
        storage.get(KEY_BATTERY_OPTIM),
      ]);
      set({
        hasSeenWelcome:  welcome   === "true",
        isGuest:         guest     === "true",
        hasOnboarded:    onboarded === "true",
        accessToken:     access  || null,
        refreshToken:    refresh || null,
        isSignedIn:      !!access,
        batteryOptimDone: battery === "true",
        isHydrated:      true,
      });
    } catch {
      set({ isHydrated: true });
    }
  },

  completeWelcome: async () => {
    await storage.set(KEY_WELCOME, "true");
    set({ hasSeenWelcome: true });
  },

  continueAsGuest: async () => {
    await storage.set(KEY_GUEST, "true");
    set({ isGuest: true });
  },

  completeOnboarding: async () => {
    await storage.set(KEY_ONBOARDED, "true");
    set({ hasOnboarded: true });
    await updateMe({ onboarded: true });
  },

  applyServerOnboarded: async (value) => {
    await storage.set(KEY_ONBOARDED, value ? "true" : "false");
    set({ hasOnboarded: value });
  },

  setSession: async (accessToken, refreshToken) => {
    await Promise.all([
      storage.set(KEY_ACCESS_TOKEN, accessToken),
      storage.set(KEY_REFRESH_TOKEN, refreshToken),
    ]);
    set({ accessToken, refreshToken, isSignedIn: true, isGuest: false, isBootstrapped: false });
  },

  updateAccessToken: async (accessToken, refreshToken) => {
    await Promise.all([
      storage.set(KEY_ACCESS_TOKEN, accessToken),
      storage.set(KEY_REFRESH_TOKEN, refreshToken),
    ]);
    set({ accessToken, refreshToken });
  },

  signOut: async () => {
    await Promise.all([
      storage.remove(KEY_GUEST),
      storage.remove(KEY_ONBOARDED),
      storage.remove(KEY_ACCESS_TOKEN),
      storage.remove(KEY_REFRESH_TOKEN),
      // KEY_WELCOME kept — returning user skips intro
    ]);
    set({ isGuest: false, hasOnboarded: false, accessToken: null, refreshToken: null, isSignedIn: false });
  },
}));
