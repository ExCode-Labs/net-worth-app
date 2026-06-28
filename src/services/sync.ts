/**
 * Backend sync orchestration (normalized, per-entity).
 *
 * On login we `fetchBootstrap()`:
 *   • Fresh device (no local data) → adopt the server's data (this is how a
 *     returning user / guest reinstall restores), and take the server's
 *     `onboarded` flag so onboarding is skipped when already done.
 *   • Device with local data → the device wins: re-push all local entities up
 *     (idempotent upserts) so the server matches. Covers "set up offline, then
 *     signed in".
 *
 * Per-entity writes happen optimistically inside the stores (see each store's
 * actions calling backend.pushCreate/Update/Remove). This module only handles
 * the initial load + reconcile. No-ops cleanly when no backend is configured.
 */
import { fetchBootstrap, pushCreate, isDirty, clearDirty, type Bootstrap } from "@/services/backend";
import { apiEnabled } from "@/services/api";
import { useAccountStore } from "@/store/accountStore";
import { useCardStore } from "@/store/cardStore";
import { useLiabilityStore } from "@/store/liabilityStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useUserStore } from "@/store/userStore";
import { useAuthStore } from "@/store/authStore";

function localIsEmpty(): boolean {
  return (
    useAccountStore.getState().accounts.length === 0 &&
    useAccountStore.getState().assets.length === 0 &&
    useCardStore.getState().cards.length === 0 &&
    useLiabilityStore.getState().liabilities.length === 0 &&
    useTransactionStore.getState().transactions.length === 0
  );
}

function hydrateFromBootstrap(b: Bootstrap) {
  useAccountStore.setState({
    currency: b.me.currency ?? "INR",
    accounts: b.accounts ?? [],
    assets: b.assets ?? [],
  });
  useCardStore.setState({ cards: b.cards ?? [] });
  useLiabilityStore.setState({ liabilities: b.liabilities ?? [] });
  useTransactionStore.setState({ transactions: b.transactions ?? [] });
  if (b.me.guestName) useUserStore.setState({ guestName: b.me.guestName });
  if (b.me.phone) useUserStore.setState({ phone: b.me.phone });
  useUserStore.getState().setProfile({
    firstName: b.me.firstName,
    lastName:  b.me.lastName,
    fullName:  b.me.fullName,
    email:     b.me.email,
    avatarUrl: b.me.avatarUrl,
  });
}

/**
 * Force-push every local entity to the backend (idempotent upserts). Use after
 * onboarding so all just-entered data lands server-side even if an individual
 * optimistic push was dropped (offline, slow start, etc.).
 */
export function pushAllLocal() {
  reconcilePush();
}

/** Re-push every local entity (idempotent) so the server matches the device. */
function reconcilePush() {
  const a = useAccountStore.getState();
  a.accounts.forEach((x) => pushCreate("accounts", x));
  a.assets.forEach((x) => pushCreate("assets", x));
  useCardStore.getState().cards.forEach((x) => pushCreate("cards", x));
  useLiabilityStore.getState().liabilities.forEach((x) => pushCreate("liabilities", x));
  useTransactionStore.getState().transactions.forEach((x) => pushCreate("transactions", x));
  clearDirty();
}

/** Reject after `ms` so a hung network call can never trap the splash. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/**
 * Run once auth state is known. Loads server data (or pushes local up) and marks
 * the app bootstrapped so routing can decide onboarding. Always resolves the
 * bootstrap flag (even offline / server down) so the app never hangs on splash.
 */
export async function startSync(): Promise<void> {
  if (!apiEnabled) {
    useAuthStore.setState({ isBootstrapped: true });
    return;
  }
  try {
    const b = await withTimeout(fetchBootstrap(), 8000);
    if (b) {
      if (localIsEmpty()) {
        hydrateFromBootstrap(b);
        await useAuthStore.getState().applyServerOnboarded(b.me.onboarded);
      } else {
        reconcilePush();
        // Returning user with local data: honour server onboarding if it's set.
        if (b.me.onboarded) await useAuthStore.getState().applyServerOnboarded(true);
      }
    }
  } catch {
    // Offline / server down — keep local state, just unblock routing.
    if (isDirty()) reconcilePush();
  } finally {
    useAuthStore.setState({ isBootstrapped: true });
  }
}

export function stopSync() {
  // Per-entity pushes are fire-and-forget inside the stores; nothing to tear down.
}

/** Manual reconcile (e.g. pull-to-refresh / returning to foreground). */
export async function resync(): Promise<void> {
  if (!apiEnabled) return;
  try {
    const b = await fetchBootstrap();
    if (b && localIsEmpty()) hydrateFromBootstrap(b);
    else reconcilePush();
  } catch {
    /* ignore */
  }
}
