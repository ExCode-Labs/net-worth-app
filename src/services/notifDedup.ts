/**
 * De-duplicates notifications on the live capture path. Android re-delivers the
 * same notification on every update (and posts persistent/ongoing ones
 * repeatedly), so without this the same bank-txn alert is ingested — and its
 * balance applied — multiple times. (#3)
 *
 * A notification is a duplicate if the exact same (app + text) was already seen
 * within WINDOW_MS. Bank alerts for distinct txns carry a unique ref/UPI id in
 * the text, so exact-text matching within a short window won't swallow genuine
 * repeat payments. State is persisted (AsyncStorage) because each headless-task
 * dispatch may run in a fresh JS context — an in-memory set wouldn't survive.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "notif-dedup-v1";
const WINDOW_MS = 5 * 60 * 1000; // same alert text within 5 min = re-delivery
const MAX = 100; // cap stored signatures so the blob can't grow unbounded

type Seen = Record<string, number>; // signature → last-seen epoch ms

/** Pure decision + pruned next-state. Exported for the self-check. */
export function decideDuplicate(
  seen: Seen,
  sig: string,
  nowMs: number,
  windowMs = WINDOW_MS,
  max = MAX,
): { duplicate: boolean; next: Seen } {
  // Drop entries older than the window.
  const next: Seen = {};
  for (const [k, t] of Object.entries(seen)) {
    if (nowMs - t <= windowMs) next[k] = t;
  }
  const duplicate = next[sig] !== undefined;
  next[sig] = nowMs; // record/refresh this signature
  // Cap size: keep the most recent `max` signatures.
  const keys = Object.keys(next);
  if (keys.length > max) {
    for (const k of keys.sort((a, b) => next[a] - next[b]).slice(0, keys.length - max)) {
      delete next[k];
    }
  }
  return { duplicate, next };
}

/** True if this notification was already ingested recently (skip it). */
export async function isDuplicateNotification(
  app: string,
  text: string,
  nowMs: number,
): Promise<boolean> {
  const sig = `${app}|${text}`;
  let seen: Seen = {};
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) seen = JSON.parse(raw) as Seen;
  } catch {
    seen = {};
  }
  const { duplicate, next } = decideDuplicate(seen, sig, nowMs);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best-effort — if we can't persist, worst case is a missed dedup
  }
  return duplicate;
}
