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

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export const SHARE_CATEGORIES: { key: string; label: string; icon: IconName }[] = [
  { key: "balance",     label: "Bank Balance",       icon: "wallet-outline" },
  { key: "cards",       label: "Card Usage",         icon: "card-outline" },
  { key: "assets",      label: "Assets",             icon: "trending-up-outline" },
  { key: "liabilities", label: "Liabilities",        icon: "trending-down-outline" },
];

// ── Phone hashing (mirror of api/src/common/phone.ts) ─────────────────────────
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}
export function hashPhone(raw: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalizePhone(raw));
}

// ── Lazy contacts module (degrades if not built in) ───────────────────────────
type ContactsMod = typeof import("expo-contacts");
let contacts: ContactsMod | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  contacts = require("expo-contacts") as ContactsMod;
} catch {
  contacts = null;
}
export const contactsAvailable = !!contacts;

export interface AppUser {
  id: string;
  name: string;          // server display name
  avatarUrl: string | null;
  phoneHash: string;
  contactName?: string;  // local address-book name, if matched
}

/**
 * Read contacts, hash their numbers, and ask the backend which are registered
 * users. Returns matched app users with the local contact name attached.
 */
export async function discoverFromContacts(): Promise<{ status: "ok" | "denied" | "unavailable"; users: AppUser[] }> {
  if (!contacts) return { status: "unavailable", users: [] };
  const { status } = await contacts.requestPermissionsAsync();
  if (status !== "granted") return { status: "denied", users: [] };

  const { data } = await contacts.getContactsAsync({
    fields: [contacts.Fields.PhoneNumbers, contacts.Fields.Name],
  });

  // Map each hashed number → contact name so we can label matches.
  const hashToName = new Map<string, string>();
  for (const c of data) {
    for (const p of c.phoneNumbers ?? []) {
      if (!p.number) continue;
      const h = await hashPhone(p.number);
      if (!hashToName.has(h)) hashToName.set(h, c.name ?? "");
    }
  }
  const hashes = [...hashToName.keys()];
  if (hashes.length === 0) return { status: "ok", users: [] };

  const matched = await apiPost<AppUser[]>("/share/discover", { hashes });
  return {
    status: "ok",
    users: matched.map((u) => ({ ...u, contactName: hashToName.get(u.phoneHash) || undefined })),
  };
}

// ── Share management ──────────────────────────────────────────────────────────
export interface OutgoingShare {
  id: string;
  recipient: { id: string; name: string; avatarUrl: string | null };
  categories: string[];
}
export interface IncomingShare {
  owner: { id: string; name: string; avatarUrl: string | null };
  categories: string[];
}

export function listOutgoing() {
  return apiGet<OutgoingShare[]>("/share/out");
}
export function listIncoming() {
  return apiGet<IncomingShare[]>("/share/in");
}
export function upsertShare(recipientId: string, categories: string[]) {
  return apiPut<unknown>("/share/out", { recipientId, categories });
}
export function revokeShare(recipientId: string) {
  return apiDelete<unknown>(`/share/out/${recipientId}`);
}

export interface SharedData {
  owner: { id: string; name: string; avatarUrl: string | null } | null;
  categories: string[];
  balance?: { total: number; accounts: number };
  cards?: { cardName: string; bank: string; limit: number; usage: number }[];
  assets?: { total: number; items: { name: string; type: string; value: number }[] };
  liabilities?: { total: number; items: { name: string; type: string; balance: number }[] };
}
export function fetchSharedData(ownerId: string) {
  return apiGet<SharedData>(`/share/in/${ownerId}`);
}
