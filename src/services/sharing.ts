/**
 * Sharing client: contact discovery (hashed) + share management.
 *
 * Phone numbers are hashed locally (SHA-256 of the last 10 digits — identical
 * to the backend's normalization) so the address book never leaves the device
 * in clear text. Contacts is lazy-required so the app doesn't crash on a build
 * made before the native module was added.
 */
import type React from "react";
import * as Crypto from "expo-crypto";
import type { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPost, apiPut, apiDelete } from "@/services/api";
import { useUserStore } from "@/store/userStore";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export const SHARE_CATEGORIES: {
  key: string;
  label: string;
  icon: IconName;
}[] = [
  { key: "balance", label: "Bank Balance", icon: "wallet-outline" },
  { key: "transactions", label: "Transactions", icon: "swap-horizontal-outline" },
  { key: "cards", label: "Card Usage", icon: "card-outline" },
  { key: "assets", label: "Assets", icon: "trending-up-outline" },
  { key: "liabilities", label: "Liabilities", icon: "trending-down-outline" },
];

// ── Phone hashing (mirror of api/src/common/phone.ts) ─────────────────────────
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}
export function hashPhone(raw: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalizePhone(raw),
  );
}

// ── Lazy contacts module (degrades if not built in) ───────────────────────────
type ContactsMod = typeof import("expo-contacts");
let contactsMod: ContactsMod | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  contactsMod = require("expo-contacts") as ContactsMod;
} catch {
  contactsMod = null;
}
export const contactsAvailable = !!contactsMod;

export interface AppUser {
  id: string;
  name: string; // server display name
  avatarUrl: string | null;
  phoneHash: string;
  contactName?: string; // local address-book name, if matched
}

export interface InviteContact {
  name: string;
  phone: string;
}

/**
 * Read contacts, hash their numbers, and ask the backend which are registered
 * users. Returns matched app users + non-matched contacts for invite.
 */
export async function discoverFromContacts(): Promise<{
  status: "ok" | "denied" | "unavailable";
  users: AppUser[];
  invitable: InviteContact[];
}> {
  if (!contactsMod) return { status: "unavailable", users: [], invitable: [] };
  const { Contact, ContactField, requestPermissionsAsync } = contactsMod;

  const { status } = await requestPermissionsAsync();
  if (status !== "granted")
    return { status: "denied", users: [], invitable: [] };

  const allContacts = await Contact.getAllDetails(
    [ContactField.PHONES, ContactField.GIVEN_NAME, ContactField.FAMILY_NAME, ContactField.FULL_NAME] as const,
  );

  const myPhone = useUserStore.getState().phone;
  const myHash = myPhone ? await hashPhone(myPhone) : null;

  // hash → { name, phone } for all device contacts
  const hashToContact = new Map<string, InviteContact>();
  for (const c of allContacts) {
    const displayName =
      c.fullName || [c.givenName, c.familyName].filter(Boolean).join(" ") || "";
    for (const p of c.phones ?? []) {
      if (!p.number) continue;
      const h = await hashPhone(p.number);
      if (h !== myHash && !hashToContact.has(h))
        hashToContact.set(h, { name: displayName, phone: p.number });
    }
  }

  const hashes = [...hashToContact.keys()];
  if (hashes.length === 0) return { status: "ok", users: [], invitable: [] };

  const matched = await apiPost<AppUser[]>("/share/discover", { hashes });
  const matchedHashes = new Set(matched.map((u) => u.phoneHash));

  const users = matched.map((u) => ({
    ...u,
    contactName: hashToContact.get(u.phoneHash)?.name || undefined,
  }));

  const seenNames = new Set<string>();
  const invitable: InviteContact[] = [];
  for (const [h, c] of hashToContact) {
    if (matchedHashes.has(h) || !c.name || seenNames.has(c.name)) continue;
    seenNames.add(c.name);
    invitable.push(c);
  }
  invitable.sort((a, b) => a.name.localeCompare(b.name));

  return { status: "ok", users, invitable };
}

// ── Share management ──────────────────────────────────────────────────────────
/** Per-category selected item IDs. A category absent here = share all of it. */
export type ShareItems = Record<string, string[]>;

export interface OutgoingShare {
  id: string;
  recipient: { id: string; name: string; avatarUrl: string | null };
  categories: string[];
  items?: ShareItems;
}
export interface IncomingShare {
  owner: { id: string; name: string; avatarUrl: string | null };
  categories: string[];
}

/**
 * In-memory cache of the sharing lists so re-opening the Sharing screen shows
 * data instantly instead of a spinner. MUST be cleared on sign-out (see
 * resetShareCache in clearAllDataStores) or one account's shares leak into the
 * next account's session.
 */
export const shareCache: { data: { out: OutgoingShare[]; inc: IncomingShare[] } | null } = { data: null };
export function resetShareCache() { shareCache.data = null; }

export function listOutgoing() {
  return apiGet<OutgoingShare[]>("/share/out");
}
export function listIncoming() {
  return apiGet<IncomingShare[]>("/share/in");
}
export function upsertShare(recipientId: string, categories: string[], items?: ShareItems) {
  return apiPut<unknown>("/share/out", { recipientId, categories, items });
}
export function revokeShare(recipientId: string) {
  return apiDelete<unknown>(`/share/out/${recipientId}`);
}
/** Opt out of an owner sharing their data with me (#20). */
export function optOutIncoming(ownerId: string) {
  return apiDelete<unknown>(`/share/in/${ownerId}`);
}

export interface SharedData {
  owner: { id: string; name: string; avatarUrl: string | null } | null;
  categories: string[];
  balance?: {
    total: number;
    accounts: number;
    items: { name: string; bank: string; balance: number }[];
  };
  transactions?: {
    items: { type: string; amount: number; category: string; merchant: string; date: string }[];
  };
  cards?: { cardName: string; bank: string; limit: number; usage: number }[];
  assets?: {
    total: number;
    items: { name: string; type: string; value: number }[];
  };
  liabilities?: {
    total: number;
    items: { name: string; type: string; balance: number }[];
  };
}
export function fetchSharedData(ownerId: string) {
  return apiGet<SharedData>(`/share/in/${ownerId}`);
}
