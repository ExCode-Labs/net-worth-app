/**
 * Device identity sent with every unauthenticated request (guests + registration).
 *
 * Two ids:
 *   • hardwareId — Android SSAID (`Settings.Secure.ANDROID_ID`). Stable across
 *     uninstall/reinstall on the same device + app signing key. Android-only.
 *   • deviceId   — a UUID we generate once and keep in SecureStore. Cleared on
 *     uninstall; used as the stable key on iOS / web.
 *
 * The backend uses hardwareId when present, else deviceId:
 *   - Guests: deviceKey IS their identity (upsert by key).
 *   - Auth users: deviceKey is stored once at account creation (informational).
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

export interface DeviceIdentity {
  /** Durable key sent as X-Device-Key: SSAID if available, else the local UUID. */
  deviceKey:  string;
  deviceId:   string;
  hardwareId: string | null;
}

/** Resolve the device identity sent to the backend on unauthenticated requests. */
export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  const deviceId   = await getDeviceId();
  const hardwareId = getHardwareId();
  return { deviceKey: hardwareId ?? deviceId, deviceId, hardwareId };
}

/** @deprecated use getDeviceIdentity() */
export const getGuestIdentity = getDeviceIdentity;
