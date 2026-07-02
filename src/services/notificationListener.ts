/**
 * Notification-based transaction capture.
 *
 * Replaces the old SMS reader. Instead of the Play-restricted READ_SMS
 * permission, we read bank/UPI app notifications via a Notification Listener
 * Service (`react-native-android-notification-listener`). The user grants
 * "Notification access" from system settings — this is optional and only
 * requested when the user opts in, never on launch.
 *
 * The native module declares BIND_NOTIFICATION_LISTENER_SERVICE on its own
 * service, so nothing Play-restricted is added to our app manifest.
 *
 * Requires a dev/native build — not available in Expo Go. If the native module
 * isn't present we degrade gracefully (`notificationListenerAvailable` = false).
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as IntentLauncher from "expo-intent-launcher";

export interface RawNotification {
  /** Package name of the posting app, e.g. "com.snapwork.hdfc" */
  app:   string;
  /** Notification title, e.g. "HDFC Bank" */
  title: string;
  /** Notification body text */
  text:  string;
  /** Posted-at epoch ms (the OS post time; falls back to now) */
  time:  number;
  /** Stable per-notification key (sbn.getKey). Used to guarantee a notification
   *  is turned into a transaction at most once across the live + catch-up paths. */
  key?:  string;
}

export type NotificationAccessStatus = "authorized" | "denied" | "unknown";

// ── Lazy native-module load (degrades gracefully if not built in) ─────────────
type NativeListener = {
  getPermissionStatus: () => Promise<NotificationAccessStatus>;
  requestPermission:   () => void;
  /** Added by our patch (patches/react-native-android-notification-listener+*).
   *  Absent on older builds — callers must feature-detect. Returns each active
   *  notification as the same JSON string the headless task receives. */
  getActiveNotifications?: () => Promise<string[]>;
};

let native: NativeListener | null = null;
let taskName = "RNAndroidNotificationListenerHeadlessJs";
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("react-native-android-notification-listener");
  native   = mod.default as NativeListener;
  taskName = mod.RNAndroidNotificationListenerHeadlessJsName ?? taskName;
} catch {
  native = null;
}

export const notificationListenerAvailable =
  Platform.OS === "android" &&
  !!native &&
  typeof native.getPermissionStatus === "function";

/** Name of the headless task the native module dispatches to (see index.js). */
export const NOTIFICATION_TASK_NAME = taskName;

/** Whether the user has granted notification access. */
export async function getNotificationAccessStatus(): Promise<NotificationAccessStatus> {
  if (!notificationListenerAvailable || !native) return "unknown";
  try {
    return await native.getPermissionStatus();
  } catch {
    return "unknown";
  }
}

// Component name of the bundled NotificationListenerService (from the
// react-native-android-notification-listener native package). Android needs the
// flattened "<applicationId>/<serviceClass>" to deep-link to NetWorth's own
// toggle instead of dumping the user in the full app list.
const LISTENER_SERVICE_CLASS =
  "com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener";

function listenerComponentName(): string | null {
  const pkg = Constants.expoConfig?.android?.package;
  return pkg ? `${pkg}/${LISTENER_SERVICE_CLASS}` : null;
}

/**
 * Opens the notification-access settings so the user can enable NetWorth.
 *
 * Notification-listener access is an Android "special app access" — there is no
 * in-app runtime dialog for it, so the user must flip a system toggle. The best
 * we can do is land them directly on NetWorth's own toggle:
 *
 *   • Android 11+ (API 30): ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS with
 *     the listener component → a single-toggle screen for NetWorth.
 *   • Older Android / any failure: fall back to the generic listener list.
 *
 * User-initiated only — call from a button, never automatically on launch.
 * Works via IntentLauncher regardless of whether the native module is available.
 */
export function requestNotificationAccess(): void {
  if (Platform.OS !== "android") return;

  const component = listenerComponentName();
  const apiLevel = typeof Platform.Version === "number" ? Platform.Version : 0;

  const openGeneric = () =>
    IntentLauncher.startActivityAsync(
      "android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS",
    ).catch(() => {
      // Last resort: use native module if available.
      native?.requestPermission();
    });

  if (component && apiLevel >= 30) {
    IntentLauncher.startActivityAsync(
      "android.settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS",
      {
        extra: {
          "android.provider.extra.NOTIFICATION_LISTENER_COMPONENT_NAME": component,
        },
      },
    ).catch(openGeneric);
    return;
  }

  openGeneric();
}

/**
 * Normalizes the raw payload delivered by the native module into a
 * RawNotification. The module delivers a JSON string under `notification`.
 */
export function normalizeNativePayload(payload: unknown): RawNotification | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  let data: Record<string, unknown> = p;
  if (typeof p.notification === "string") {
    try {
      data = JSON.parse(p.notification);
    } catch {
      return null;
    }
  }

  const app   = String(data.app ?? data.packageName ?? "");
  const title = String(data.title ?? "");
  const text  = String(data.text ?? data.bigText ?? data.message ?? "");
  if (!text) return null;

  // Prefer the OS post time (serialized as a ms string) so a catch-up scan dates
  // a recovered txn by when it actually arrived, not when we re-read it.
  const posted = Number(data.time);
  const time = Number.isFinite(posted) && posted > 0 ? posted : Date.now();
  const key = typeof data.key === "string" && data.key ? data.key : undefined;

  return { app, title, text, time, key };
}

/**
 * Re-read every notification currently in the shade (Android only, requires our
 * native patch). Used to recover bank alerts that arrived while the app was
 * backgrounded or while screen-sharing redacted them. Returns [] when the method
 * isn't present (older build) or the listener isn't connected.
 */
export async function getActiveNotificationsRaw(): Promise<RawNotification[]> {
  if (!native || typeof native.getActiveNotifications !== "function") return [];
  try {
    const jsonList = await native.getActiveNotifications();
    const out: RawNotification[] = [];
    for (const json of jsonList) {
      const n = normalizeNativePayload({ notification: json });
      if (n) out.push(n);
    }
    return out;
  } catch {
    return [];
  }
}
