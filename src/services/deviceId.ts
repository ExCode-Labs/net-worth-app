/**
 * Device identity — used to restore a *guest's* data when they reinstall the app
 * on the same device (no account, so we key their server-side snapshot on the
 * device instead of a user id).
 *
 * Two ids:
 *   • hardwareId — Android SSAID (`Settings.Secure.ANDROID_ID`). Stable across
 *     uninstall/reinstall on the same device + app signing key, so it's the
 *     durable key the backend uses to find a returning guest. Android-only.
 *   • deviceId   — a UUID we generate once and keep in SecureStore. Usually
 *     cleared on uninstall, so it is NOT reliable for reinstall restore on its
 *     own; it's a stable session/local id and the fallback when SSAID is absent
 *     (iOS / web).
 *
 * The backend keys a guest on hardwareId when present, else deviceId.
 */
import { Platform } from "react-native";

// expo-crypto is native; lazy-require so an old build (module not linked yet)
// doesn't crash — we fall back to a JS UUID for the device id.
let Crypto: typeof import("expo-crypto") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Crypto = require("expo-crypto");
} catch {
  Crypto = null;
}

function jsUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function randomUuid(): string {
  try {
    return Crypto?.randomUUID() ?? jsUuid();
  } catch {
    return jsUuid();
  }
}

let secureStore: typeof import("expo-secure-store") | null = null;
let application: typeof import("expo-application") | null = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  secureStore = require("expo-secure-store");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  application = require("expo-application");
}

const KEY_DEVICE_ID = "nw_device_id";

async function readStored(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  }
  return secureStore!.getItemAsync(key);
}

async function writeStored(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try { globalThis.localStorage?.setItem(key, value); } catch {}
    return;
  }
  await secureStore!.setItemAsync(key, value);
}

/** Android SSAID — stable across reinstall on the same device. null elsewhere. */
export function getHardwareId(): string | null {
  if (Platform.OS !== "android" || !application) return null;
  try {
    const id = application.getAndroidId();
    return id && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

/** Locally-persisted UUID. Generated once; regenerated if storage was cleared. */
export async function getDeviceId(): Promise<string> {
  const existing = await readStored(KEY_DEVICE_ID);
  if (existing) return existing;
  const id = randomUuid();
  await writeStored(KEY_DEVICE_ID, id);
  return id;
}

export interface GuestIdentity {
  /** Durable key for reinstall restore: SSAID if available, else the local UUID. */
  guestKey:   string;
  deviceId:   string;
  hardwareId: string | null;
}

/** Resolve the identity sent to the backend for a guest session. */
export async function getGuestIdentity(): Promise<GuestIdentity> {
  const deviceId   = await getDeviceId();
  const hardwareId = getHardwareId();
  return { guestKey: hardwareId ?? deviceId, deviceId, hardwareId };
}
