/**
 * Client-side entity id generator.
 *
 * Ids are supplied by the client and reused verbatim by the backend (optimistic
 * upserts use the same id end-to-end). We use RFC-4122 v4 UUIDs via expo-crypto,
 * which is backed by the platform CSPRNG — collision-safe and standard, unlike
 * the old Math.random()-based scheme.
 */
import * as Crypto from "expo-crypto";

export function uid(): string {
  return Crypto.randomUUID();
}
