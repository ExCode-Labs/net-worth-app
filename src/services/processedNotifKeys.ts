/**
 * Durable record of notifications we've already turned into a transaction,
 * keyed by the notification's stable key (sbn.getKey). This is the money-safe
 * backstop for the foreground catch-up scan (#12): a notification that already
 * produced a txn — live or via a previous scan — is never ingested again, no
 * matter how long it lingers in the shade or how many times it's re-scanned.
 *
 * The short-window text dedup ([[notifDedup]]) handles rapid re-delivery; this
 * handles the long tail. Bounded FIFO so the blob can't grow unbounded.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORE_KEY = "notif-processed-keys-v1";
const MAX = 500; // keep the most recent N claimed keys

async function load(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

/** True if this notification key has already produced a transaction. */
export async function isNotifKeyClaimed(key: string): Promise<boolean> {
  return (await load()).includes(key);
}

/** Record that this notification key produced a transaction (idempotent). */
export async function claimNotifKey(key: string): Promise<void> {
  let list = await load();
  if (list.includes(key)) return;
  list.push(key);
  if (list.length > MAX) list = list.slice(list.length - MAX);
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    // best-effort — a failed write just means we might re-scan once more
  }
}
