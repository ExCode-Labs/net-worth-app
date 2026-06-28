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

export async function updateMe(patch: {
  onboarded?: boolean;
  currency?: string;
  guestName?: string;
  phone?: string;
}): Promise<void> {
  if (!apiEnabled) return;
  try {
    await apiPatch("/me", patch);
  } catch {
    markDirty();
  }
}

/** Optimistic create (idempotent upsert server-side). */
export function pushCreate(resource: Resource, entity: { id: string }) {
  if (!apiEnabled) return;
  apiPost(`/${resource}`, { id: entity.id, data: entity }).catch(markDirty);
}

export function pushUpdate(resource: Resource, id: string, updates: object) {
  if (!apiEnabled) return;
  apiPatch(`/${resource}/${id}`, { data: updates }).catch(markDirty);
}

export function pushRemove(resource: Resource, id: string) {
  if (!apiEnabled) return;
  apiDelete(`/${resource}/${id}`).catch(markDirty);
}
