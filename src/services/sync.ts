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
 * actions calling backend.pushCreate/syncCreate/Update/Remove). This module only handles
 * the initial load + reconcile. No-ops cleanly when no backend is configured.
 */
import { fetchBootstrap, syncBulk, isDirty, clearDirty, type Bootstrap } from "@/services/backend";
import type { Resource } from "@/services/backend";
import { apiEnabled } from "@/services/api";
import { useAccountStore } from "@/store/accountStore";
import { useCardStore } from "@/store/cardStore";
import { useLiabilityStore } from "@/store/liabilityStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useUserStore } from "@/store/userStore";
import { useAuthStore } from "@/store/authStore";
import { resetShareCache } from "@/services/sharing";

function localIsEmpty(): boolean {
  return (
    useAccountStore.getState().accounts.length === 0 &&
    useAccountStore.getState().assets.length === 0 &&
    useCardStore.getState().cards.length === 0 &&
    useLiabilityStore.getState().liabilities.length === 0 &&
    useTransactionStore.getState().transactions.length === 0
  );
}

/**
 * Apply the server profile (identity) to the local store. Safe to run on every
 * sync — it's server-authoritative and independent of local financial data, so
 * returning users (who skip the entity hydrate below) still get their name,
 * email and avatar populated.
 */
function hydrateProfile(b: Bootstrap) {
  useAccountStore.setState({ currency: b.me.currency ?? "INR" });
  if (b.me.guestName) useUserStore.setState({ guestName: b.me.guestName });
  if (b.me.phone) useUserStore.setState({ phone: b.me.phone });
  useUserStore.getState().setProfile({
    firstName:        b.me.firstName,
    lastName:         b.me.lastName,
    fullName:         b.me.fullName,
    email:            b.me.email,
    avatarUrl:        b.me.avatarUrl,
    hasVaultPin:      b.me.hasVaultPin ?? false,
    hasPassword:      b.me.hasPassword ?? false,
    twoFactorEnabled: b.me.twoFactorEnabled ?? false,
  });
  useUserStore.setState({ userId: b.me.id });
}

function hydrateFromBootstrap(b: Bootstrap) {
  hydrateProfile(b);
  useAccountStore.setState({
    accounts: b.accounts ?? [],
    assets: b.assets ?? [],
  });
  useCardStore.setState({ cards: b.cards ?? [] });
  useLiabilityStore.setState({ liabilities: b.liabilities ?? [] });
  useTransactionStore.setState({ transactions: b.transactions ?? [] });
}

/**
 * Force-push every local entity to the backend (idempotent upserts). Use after
 * onboarding so all just-entered data lands server-side even if an individual
 * optimistic push was dropped (offline, slow start, etc.).
 */
export function pushAllLocal() {
  void reconcilePush();
}

/** Re-push every local entity (idempotent) so the server matches the device. One bulk call. */
async function reconcilePush() {
  const a = useAccountStore.getState();
  const entities: Array<{ resource: Resource; id: string; data: object }> = [
    ...a.accounts.map((x) => ({ resource: "accounts" as Resource, id: x.id, data: x })),
    ...a.assets.map((x) => ({ resource: "assets" as Resource, id: x.id, data: x })),
    ...useCardStore.getState().cards.map((x) => ({ resource: "cards" as Resource, id: x.id, data: x })),
    ...useLiabilityStore.getState().liabilities.map((x) => ({ resource: "liabilities" as Resource, id: x.id, data: x })),
    ...useTransactionStore.getState().transactions.map((x) => ({ resource: "transactions" as Resource, id: x.id, data: x })),
  ];
  await syncBulk(entities);
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
      // If the stored userId doesn't match the signed-in account, wipe stale local
      // data so it can't cross-contaminate the new account (handles kill-during-logout).
      const storedUserId = useUserStore.getState().userId;
      if (storedUserId && storedUserId !== b.me.id) {
        clearAllDataStores();
      }

      hydrateProfile(b); // always — independent of local financial data

      const serverHasData =
        b.accounts.length > 0 || b.cards.length > 0 ||
        b.transactions.length > 0 || b.assets.length > 0 || b.liabilities.length > 0;

      if (serverHasData) {
        // Server is authoritative when it has data — always adopt it.
        hydrateFromBootstrap(b);
        await useAuthStore.getState().applyServerOnboarded(b.me.onboarded);
      } else if (!localIsEmpty()) {
        // Fresh server + local data → offline-first onboarding: push local up.
        await reconcilePush();
        if (b.me.onboarded) await useAuthStore.getState().applyServerOnboarded(true);
      } else {
        await useAuthStore.getState().applyServerOnboarded(b.me.onboarded);
      }
    }
  } catch {
    // Offline / server down — keep local state, just unblock routing.
    if (isDirty()) void reconcilePush();
  } finally {
    useAuthStore.setState({ isBootstrapped: true });
  }
}

export function stopSync() {
  // Per-entity pushes are fire-and-forget inside the stores; nothing to tear down.
}

/**
 * Wipe all persisted financial data from every store.
 * Call before signing out so the next login (possibly a different account)
 * starts with an empty local state and hydrates cleanly from the server.
 */
export function clearAllDataStores(): void {
  useAccountStore.getState().reset();
  useCardStore.getState().reset();
  useLiabilityStore.getState().reset();
  useTransactionStore.getState().reset();
  useUserStore.getState().reset();
  resetShareCache();
}

/** Manual reconcile (e.g. pull-to-refresh / returning to foreground). */
export async function resync(): Promise<void> {
  if (!apiEnabled) return;
  try {
    const b = await fetchBootstrap();
    if (b) {
      hydrateProfile(b);
      const serverHasData =
        b.accounts.length > 0 || b.cards.length > 0 ||
        b.transactions.length > 0 || b.assets.length > 0 || b.liabilities.length > 0;
      if (serverHasData) hydrateFromBootstrap(b);
      else if (!localIsEmpty()) void reconcilePush();
    }
  } catch {
    /* ignore */
  }
}
