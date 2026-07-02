/**
 * Registers the headless JS task that the Notification Listener Service
 * dispatches to whenever a notification is posted. Bank/UPI notifications are
 * parsed by the bank-message engine and either auto-applied to a matching
 * account or queued for review (see bankIngest).
 *
 * Imported for its side effect from the app entry (index.js) so it runs once
 * at startup, before any notification can arrive. No-ops when the native
 * module isn't built in (e.g. Expo Go / iOS).
 */
import { AppRegistry, AppState } from "react-native";
import {
  NOTIFICATION_TASK_NAME,
  normalizeNativePayload,
  notificationListenerAvailable,
  getActiveNotificationsRaw,
  type RawNotification,
} from "./notificationListener";
import { ingestMessage } from "./bankIngest";
import { isDuplicateNotification } from "./notifDedup";
import { isNotifKeyClaimed, claimNotifKey } from "./processedNotifKeys";

/**
 * Single ingest path for both the live listener and the catch-up scan. Two
 * guards keep it money-safe (a notification becomes a txn at most once):
 *   1. notification key already produced a txn → skip (durable, any age) (#12)
 *   2. same text seen very recently → skip Android's rapid re-delivery (#3)
 * The key is claimed only after a txn is actually recorded, so a redacted
 * screen-share delivery (which parses to nothing) doesn't block the later
 * full-content copy that the catch-up scan recovers.
 */
async function ingestRaw(n: RawNotification): Promise<void> {
  if (n.key && (await isNotifKeyClaimed(n.key))) return;
  if (await isDuplicateNotification(n.app, n.text, Date.now())) return;
  // Body is parsed; the title (SMS sender, e.g. "VM-HDFCBK") identifies the bank.
  const outcome = ingestMessage(n.text, n.time, n.title);
  if (n.key && outcome !== "skipped") await claimNotifKey(n.key);
}

/**
 * Re-scan the notification shade for bank alerts we missed — arrived while
 * backgrounded, or redacted by Android while screen-sharing was active and now
 * readable again. Safe to call on every foreground; the guards above dedupe. (#12)
 */
export async function scanActiveNotifications(): Promise<void> {
  const actives = await getActiveNotificationsRaw();
  for (const n of actives) await ingestRaw(n);
}

if (notificationListenerAvailable) {
  AppRegistry.registerHeadlessTask(
    NOTIFICATION_TASK_NAME,
    () => async (payload: unknown) => {
      const n = normalizeNativePayload(payload);
      if (!n) return;
      await ingestRaw(n);
    },
  );

  // On return to the foreground, catch up on anything the live path missed.
  AppState.addEventListener("change", (s) => {
    if (s === "active") void scanActiveNotifications();
  });
}
