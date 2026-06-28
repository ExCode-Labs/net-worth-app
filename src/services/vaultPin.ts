import * as Crypto from "expo-crypto";
import { apiPost } from "@/services/api";

const VAULT_SALT = "networth.vault.v1.";

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, VAULT_SALT + pin);
}

export async function setupVaultPin(pin: string): Promise<void> {
  const pinHash = await hashPin(pin);
  await apiPost("/auth/vault/setup", { pinHash });
}

export async function verifyVaultPin(pin: string): Promise<boolean> {
  const pinHash = await hashPin(pin);
  const result = await apiPost<{ ok: boolean }>("/auth/vault/verify", { pinHash });
  return result.ok;
}

export async function requestVaultPinReset(): Promise<void> {
  await apiPost("/auth/vault/reset-request", {});
}

export async function resetVaultPin(otp: string, pin: string): Promise<void> {
  const pinHash = await hashPin(pin);
  await apiPost("/auth/vault/reset-verify", { otp, pinHash });
}
