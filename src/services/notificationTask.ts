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
import { AppRegistry } from "react-native";
import {
  NOTIFICATION_TASK_NAME,
  normalizeNativePayload,
  notificationListenerAvailable,
} from "./notificationListener";
import { ingestMessage } from "./bankIngest";
import { isDuplicateNotification } from "./notifDedup";

if (notificationListenerAvailable) {
  AppRegistry.registerHeadlessTask(
    NOTIFICATION_TASK_NAME,
    () => async (payload: unknown) => {
      const n = normalizeNativePayload(payload);
      if (!n) return;
      // Android re-delivers the same notification on every update — skip repeats
      // so a txn isn't captured (and its balance applied) twice. (#3)
      if (await isDuplicateNotification(n.app, n.text, n.time)) return;
      // Body is parsed; the title (SMS sender, e.g. "VM-HDFCBK") identifies the bank.
      ingestMessage(n.text, n.time, n.title);
    },
  );
}
