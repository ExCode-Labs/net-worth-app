/**
 * Typed backend client over the normalized API.
 *
 * Reads: `fetchBootstrap()` pulls everything in one call (used at login).
 * Writes: the per-resource push helpers are fire-and-forget — the store applies
 * the change locally first (optimistic UI) and calls these in the background.
 * Creates are idempotent upserts on the server, so a failed push can be safely
 * re-sent by the reconcile pass in sync.ts. We never roll back the local change
 * on a network error (offline-first); a definitive failure just flags a
 * reconcile. All helpers no-op when no backend is configured.
 */
import { apiGet, apiPost, apiPatch, apiDelete, apiEnabled } from "@/services/api";
import type { Account, Asset } from "@/store/accountStore";
import type { Card } from "@/store/cardStore";
import type { Liability } from "@/store/liabilityStore";
import type { Transaction } from "@/store/transactionStore";

export type Resource =
  | "accounts" | "cards" | "assets" | "liabilities" | "transactions";

export interface MeDto {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  provider: string;
  phone: string | null;
  currency: string;
  guestName: string | null;
  onboarded: boolean;
  hasVaultPin: boolean;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
}

export interface Bootstrap {
  me: MeDto;
  accounts: Account[];
  cards: Card[];
  assets: Asset[];
  liabilities: Liability[];
  transactions: Transaction[];
}

// Set when a push fails so sync.ts knows to re-push local state.
let dirty = false;
export const isDirty = () => dirty;
export const clearDirty = () => { dirty = false; };
function markDirty() { dirty = true; }

export async function fetchBootstrap(): Promise<Bootstrap | null> {
  if (!apiEnabled) return null;
  return apiGet<Bootstrap>("/bootstrap");
}

export interface VaultData {
  cards:    { id: string; number?: string | null; cardHolder?: string | null; expiry?: string | null }[];
  accounts: { id: string; accountNumber?: string | null; ifsc?: string | null; branch?: string | null }[];
}

export async function fetchVaultData(): Promise<VaultData> {
  return apiGet<VaultData>("/vault");
}

export async function updateMe(patch: {
  onboarded?: boolean;
  currency?: string;
  guestName?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
}): Promise<MeDto | void> {
  if (!apiEnabled) return;
  try {
    return await apiPatch<MeDto>("/me", patch);
  } catch {
    markDirty();
  }
}

/**
 * Create an entity without a client ID — the server assigns a cuid via
 * @default(cuid()). Returns the created entity (at minimum `{ id }`).
 * Throws on network error so the caller can surface it.
 */
export async function pushCreate<T extends { id: string }>(
  resource: Resource,
  data: Record<string, unknown>,
): Promise<T> {
  if (!apiEnabled) throw new Error("Backend not configured");
  return apiPost<T>(`/${resource}`, { data });
}

/**
 * Fire-and-forget create with a client-supplied id (used for notification
 * transactions which must work offline and can be retried idempotently).
 *
 * Calls are serialised through a queue (one at a time, 30 ms apart) so a
 * burst of hundreds of notification-txn syncs doesn't exhaust the server's
 * rate-limit bucket before the user's next intentional action goes through.
 */
const _syncQueue: Array<() => Promise<void>> = [];
let _syncDraining = false;
async function _drainSync() {
  if (_syncDraining) return;
  _syncDraining = true;
  while (_syncQueue.length) {
    await _syncQueue.shift()!().catch(markDirty);
    if (_syncQueue.length) await new Promise((r) => setTimeout(r, 30));
  }
  _syncDraining = false;
}

export function syncCreate(resource: Resource, entity: { id: string }) {
  if (!apiEnabled) return;
  _syncQueue.push(() => apiPost(`/${resource}`, { id: entity.id, data: entity }));
  void _drainSync();
}

/** Upsert a collection of entities in one server round-trip. Used by the startup reconcile. */
export async function syncBulk(
  entities: Array<{ resource: Resource; id: string; data: object }>,
): Promise<void> {
  if (!apiEnabled || entities.length === 0) return;
  await apiPost("/bulk", { entities }).catch(markDirty);
}

export function pushUpdate(resource: Resource, id: string, updates: object) {
  if (!apiEnabled) return;
  apiPatch(`/${resource}/${id}`, { data: updates }).catch(markDirty);
}

export function pushRemove(resource: Resource, id: string) {
  if (!apiEnabled) return;
  apiDelete(`/${resource}/${id}`).catch(markDirty);
}
