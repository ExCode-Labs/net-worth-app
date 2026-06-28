/**
 * User store — device-level identity + profile.
 * Persists: deviceId (guest tracking), guestName, and the authenticated user's
 * profile fields (populated from the backend on login and on each bootstrap sync).
 */
import { create } from "zustand";
import { Platform } from "react-native";
import { updateMe } from "@/services/backend";

let nativeSecureStore: typeof import("expo-secure-store") | null = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nativeSecureStore = require("expo-secure-store");
}

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
    }
    return nativeSecureStore!.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try { globalThis.localStorage?.setItem(key, value); } catch {}
      return;
    }
    await nativeSecureStore!.setItemAsync(key, value);
  },
};

const KEY_DEVICE_ID = "device_id";
const KEY_PHONE     = "user_phone";

function uuidV4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface UserStore {
  deviceId:  string | null;
  guestName: string | null;
  phone:     string | null; // mandatory; used for sharing discovery

  // Authenticated user profile (populated from backend on login + each sync)
  firstName:   string | null;
  lastName:    string | null;
  fullName:    string | null;
  email:       string | null;
  avatarUrl:   string | null;
  hasVaultPin: boolean;

  hydrateDeviceId: () => Promise<void>;
  setGuestName:    (name: string) => void;
  /** Alias used by setup.tsx — delegates to setGuestName */
  setName:         (name: string) => void;
  setPhone:        (phone: string) => void;
  setProfile:      (p: { firstName?: string | null; lastName?: string | null; fullName?: string | null; email?: string | null; avatarUrl?: string | null; hasVaultPin?: boolean }) => void;
  reset:           () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  deviceId:    null,
  guestName:   null,
  phone:       null,
  firstName:   null,
  lastName:    null,
  fullName:    null,
  email:       null,
  avatarUrl:   null,
  hasVaultPin: false,

  hydrateDeviceId: async () => {
    let id = await storage.get(KEY_DEVICE_ID);
    if (!id) {
      id = uuidV4();
      await storage.set(KEY_DEVICE_ID, id);
    }
    const phone = await storage.get(KEY_PHONE);
    set({ deviceId: id, phone });
  },

  setGuestName: (name) => { set({ guestName: name }); void updateMe({ guestName: name }); },
  setName:      (name) => { set({ guestName: name }); void updateMe({ guestName: name }); }, // legacy alias

  setPhone: (phone) => {
    set({ phone });
    void storage.set(KEY_PHONE, phone);
    void updateMe({ phone });
  },

  setProfile: (p) => set(p),

  reset: () => set({ guestName: null, firstName: null, lastName: null, fullName: null, email: null, avatarUrl: null }), // deviceId + phone kept
}));
