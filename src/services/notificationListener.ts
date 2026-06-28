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
  /** Posted-at epoch ms (defaults to now if the OS doesn't provide it) */
  time:  number;
}

export type NotificationAccessStatus = "authorized" | "denied" | "unknown";

// ── Lazy native-module load (degrades gracefully if not built in) ─────────────
type NativeListener = {
  getPermissionStatus: () => Promise<NotificationAccessStatus>;
  requestPermission:   () => void;
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
 */
export function requestNotificationAccess(): void {
  if (!notificationListenerAvailable || !native) return;

  const component = listenerComponentName();
  // Platform.Version is the API level (number) on Android.
  const apiLevel = typeof Platform.Version === "number" ? Platform.Version : 0;

  if (component && apiLevel >= 30) {
    IntentLauncher.startActivityAsync(
      "android.settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS",
      {
        extra: {
          "android.provider.extra.NOTIFICATION_LISTENER_COMPONENT_NAME": component,
        },
      },
    ).catch(() => {
      // OEMs that don't honour the detail action → generic list.
      native?.requestPermission();
    });
    return;
  }

  native.requestPermission();
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

  return { app, title, text, time: Date.now() };
}
