/**
 * Vault — reveals full stored secrets (card numbers, account numbers, IFSC,
 * holder names). Everywhere else in the app these are masked to the last 4.
 *
 * Protection: gated by a 4-digit vault PIN stored as SHA-256 hash in the DB
 * (persists across reinstalls). First open prompts creation; subsequent opens
 * prompt entry. Forgot PIN → OTP reset via registered email.
 *
 * CVV is never stored, so it never appears here.
 */
import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import {
  useAccountStore,
  accountLast4,
  maskAccountNumber,
} from "@/store/accountStore";
import {
  useCardStore,
  cardLast4,
  maskCardNumber,
  formatCardNumber,
} from "@/store/cardStore";
import { useUserStore } from "@/store/userStore";
import { toast } from "@/store/toastStore";
import {
  setupVaultPin,
  verifyVaultPin,
  requestVaultPinReset,
  resetVaultPin,
} from "@/services/vaultPin";
import { fetchVaultData, type VaultData } from "@/services/backend";
import { apiError } from "@/utils/apiError";
import PinPad from "@/components/security/PinPad";

// ── A single revealable secret row ──────────────────────────────────────────
function SecretRow({ label, masked, full }: { label: string; masked: string; full: string }) {
  const [shown, setShown] = useState(false);
  const hasValue = !!full;

  const copy = async () => {
    if (!hasValue) return;
    await Clipboard.setStringAsync(full);
    toast.success(`${label} copied.`);
  };

  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <View className="flex-1">
        <Text className="text-[11px] text-dim uppercase tracking-widest mb-0.5">{label}</Text>
        <TouchableOpacity onPress={copy} disabled={!hasValue} activeOpacity={0.6}>
          <Text
            className="text-base font-semibold text-white"
            style={{ letterSpacing: shown ? 1 : 2 }}
          >
            {hasValue ? (shown ? full : masked) : "—"}
          </Text>
        </TouchableOpacity>
      </View>
      {hasValue && (
        <TouchableOpacity
          onPress={() => setShown((s) => !s)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-9 h-9 rounded-[10px] items-center justify-center border border-white/[0.08]"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          <Ionicons name={shown ? "eye-off-outline" : "eye-outline"} size={18} color="#a855f7" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      className="rounded-2xl border border-white/[0.08] p-4"
      style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
    >
      <Text className="text-base font-bold text-white mb-1">{title}</Text>
      <View className="divide-y divide-white/[0.06]">{children}</View>
    </View>
  );
}

// ── PIN gate types ──────────────────────────────────────────────────────────
type VaultState =
  | "setup-enter"
  | "setup-confirm"
  | "unlock"
  | "reset-send"      // waiting user to tap "Send OTP"
  | "reset-verify"    // OTP + new PIN entry
  | "open";

export default function VaultScreen() {
  const accounts = useAccountStore((s) => s.accounts);
  const cards    = useCardStore((s) => s.cards);
  const { hasVaultPin, email } = useUserStore();

  const [vaultState, setVaultState] = useState<VaultState>(hasVaultPin ? "unlock" : "setup-enter");
  const [pin, setPin]       = useState("");
  const [firstPin, setFirst] = useState("");
  const [error, setError]   = useState<string | null>(null);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);

  // Reset flow
  const [otp, setOtp]         = useState("");
  const [newPin, setNewPin]   = useState("");
  const [newPinC, setNewPinC] = useState("");

  const clearPin = () => { setPin(""); setError(null); };

  const openVault = useCallback(() => {
    setVaultState("open");
    fetchVaultData().then(setVaultData).catch(() => {
      toast.error("Could not load sensitive data. Check your connection.");
    });
  }, []);

  // ── Setup: enter + confirm ──────────────────────────────────────────────────
  const onSetupComplete = useCallback(async (entered: string) => {
    if (vaultState === "setup-enter") {
      setFirst(entered);
      clearPin();
      setVaultState("setup-confirm");
      return;
    }
    if (entered !== firstPin) {
      setError("PINs don't match. Re-enter your chosen PIN.");
      clearPin();
      setVaultState("setup-enter");
      setFirst("");
      return;
    }
    try {
      await setupVaultPin(entered);
      useUserStore.setState({ hasVaultPin: true });
      toast.success("Vault PIN set.");
      openVault();
    } catch (e) {
      toast.error(apiError(e, "Failed to save PIN. Try again."));
      clearPin();
      setVaultState("setup-enter");
    }
  }, [vaultState, firstPin, openVault]);

  // ── Unlock: verify PIN ──────────────────────────────────────────────────────
  const onUnlockComplete = useCallback(async (entered: string) => {
    try {
      const ok = await verifyVaultPin(entered);
      if (ok) {
        openVault();
      } else {
        setError("Incorrect PIN. Try again.");
        setPin("");
      }
    } catch (e) {
      setError(apiError(e, "Could not verify PIN. Check your connection."));
      setPin("");
    }
  }, [openVault]);

  // ── Reset flow ──────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    try {
      await requestVaultPinReset();
      toast.success("OTP sent to your email.");
      setVaultState("reset-verify");
    } catch (e) {
      toast.error(apiError(e, "Failed to send OTP. Try again."));
    }
  };

  const handleResetVerify = async () => {
    if (newPin.length < 4) { toast.error("PIN must be at least 4 digits."); return; }
    if (newPin !== newPinC)  { toast.error("PINs don't match."); return; }
    if (otp.length !== 6)    { toast.error("OTP must be 6 digits."); return; }
    try {
      await resetVaultPin(otp, newPin);
      useUserStore.setState({ hasVaultPin: true });
      toast.success("Vault PIN reset.");
      openVault();
    } catch (e) {
      toast.error(apiError(e, "Invalid OTP or PIN. Try again."));
    }
  };

  // ── Common back button in header ────────────────────────────────────────────
  const headerBack = () => router.back();

  // ── PIN gate screens ────────────────────────────────────────────────────────
  if (vaultState === "setup-enter" || vaultState === "setup-confirm") {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
        <View className="flex-row items-center px-xl pt-3 pb-2">
          <TouchableOpacity
            onPress={() => {
              if (vaultState === "setup-confirm") { setVaultState("setup-enter"); clearPin(); }
              else router.back();
            }}
            className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <Ionicons name="chevron-back" size={22} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center">
          <PinPad
            value={pin}
            onChange={(v) => { if (error) setError(null); setPin(v); }}
            length={4}
            title={vaultState === "setup-enter" ? "Create Vault PIN" : "Confirm Vault PIN"}
            subtitle={
              vaultState === "setup-enter"
                ? "Choose a 4-digit PIN to protect your vault"
                : "Re-enter your chosen PIN"
            }
            error={error}
            onComplete={onSetupComplete}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (vaultState === "unlock") {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
        <View className="flex-row items-center justify-between px-xl pt-3 pb-2">
          <TouchableOpacity
            onPress={headerBack}
            className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <Ionicons name="chevron-back" size={22} color="#9ca3af" />
          </TouchableOpacity>
          {email && (
            <TouchableOpacity onPress={() => setVaultState("reset-send")}>
              <Text className="text-xs text-accent-purple font-semibold">Forgot PIN?</Text>
            </TouchableOpacity>
          )}
        </View>
        <View className="flex-1 items-center justify-center">
          <PinPad
            value={pin}
            onChange={(v) => { if (error) setError(null); setPin(v); }}
            length={4}
            title="Enter Vault PIN"
            subtitle="Unlock to access your full card and account details"
            error={error}
            onComplete={onUnlockComplete}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (vaultState === "reset-send") {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
        <View className="flex-row items-center px-xl pt-3 pb-2">
          <TouchableOpacity
            onPress={() => setVaultState("unlock")}
            className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <Ionicons name="chevron-back" size={22} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 px-xl justify-center gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl items-center justify-center border border-accent-purple/30" style={{ backgroundColor: "rgba(168,85,247,0.12)" }}>
              <Ionicons name="mail-outline" size={26} color="#a855f7" />
            </View>
            <Text className="text-xl font-bold text-white text-center">Reset Vault PIN</Text>
            <Text className="text-sm text-muted text-center" style={{ lineHeight: 20 }}>
              We&apos;ll send a 6-digit code to your email{email ? ` (${email})` : ""} to verify it&apos;s you.
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSendOtp}
            className="rounded-2xl py-4 items-center"
            style={{ backgroundColor: "rgba(168,85,247,0.9)" }}
            activeOpacity={0.8}
          >
            <Text className="text-base font-bold text-white">Send OTP</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (vaultState === "reset-verify") {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
        <View className="flex-row items-center px-xl pt-3 pb-2">
          <TouchableOpacity
            onPress={() => setVaultState("reset-send")}
            className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <Ionicons name="chevron-back" size={22} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <Text className="text-xl font-bold text-white mb-1 mt-4">Enter reset code</Text>
          <Text className="text-sm text-muted mb-6" style={{ lineHeight: 20 }}>
            Check your email for the 6-digit code, then choose a new vault PIN.
          </Text>

          <Text className="text-xs text-dim uppercase tracking-widest mb-2">OTP Code</Text>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="6-digit code"
            placeholderTextColor="#4b5563"
            className="rounded-xl border border-white/[0.08] px-4 py-3 text-white text-lg tracking-widest mb-5"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          />

          <Text className="text-xs text-dim uppercase tracking-widest mb-2">New PIN</Text>
          <TextInput
            value={newPin}
            onChangeText={setNewPin}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            placeholder="4–6 digits"
            placeholderTextColor="#4b5563"
            className="rounded-xl border border-white/[0.08] px-4 py-3 text-white text-lg tracking-widest mb-3"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          />

          <Text className="text-xs text-dim uppercase tracking-widest mb-2">Confirm New PIN</Text>
          <TextInput
            value={newPinC}
            onChangeText={setNewPinC}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            placeholder="Re-enter new PIN"
            placeholderTextColor="#4b5563"
            className="rounded-xl border border-white/[0.08] px-4 py-3 text-white text-lg tracking-widest mb-8"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          />

          <TouchableOpacity
            onPress={handleResetVerify}
            className="rounded-2xl py-4 items-center"
            style={{ backgroundColor: "rgba(168,85,247,0.9)" }}
            activeOpacity={0.8}
          >
            <Text className="text-base font-bold text-white">Set New PIN</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Vault content ───────────────────────────────────────────────────────────
  const creditCards = cards.filter((c) => c.type !== "debit");
  const isEmpty = accounts.length === 0 && creditCards.length === 0;

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      {/* Header */}
      <View className="flex-row items-center justify-between px-xl pt-3 pb-[14px]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Vault</Text>
        {/* Re-lock */}
        <TouchableOpacity
          onPress={() => { setVaultState(hasVaultPin ? "unlock" : "setup-enter"); setVaultData(null); clearPin(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-[38px] h-[38px] items-center justify-center"
        >
          <Ionicons name="lock-closed-outline" size={20} color="#a855f7" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
      >
        {/* Privacy note */}
        <View
          className="flex-row items-start gap-2.5 rounded-[14px] border border-accent-purple/25 p-3.5 mb-5"
          style={{ backgroundColor: "rgba(168,85,247,0.1)" }}
        >
          <Ionicons name="lock-closed" size={16} color="#a855f7" style={{ marginTop: 1 }} />
          <Text className="flex-1 text-xs text-muted" style={{ lineHeight: 17 }}>
            Full numbers live only here. Tap the eye to reveal, tap a value to copy.
            CVV is never stored.
          </Text>
        </View>

        {/* Show loading while vault data is being fetched from server */}
        {!vaultData && !isEmpty && (
          <View className="items-center py-4">
            <Text className="text-sm text-muted">Loading sensitive data…</Text>
          </View>
        )}

        {isEmpty ? (
          <View className="items-center pt-16 gap-3">
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center border border-white/[0.08]"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              <Ionicons name="lock-closed-outline" size={30} color="#6b7280" />
            </View>
            <Text className="text-base font-semibold text-white">Vault is empty</Text>
            <Text className="text-sm text-muted text-center">
              Add a bank account or card and its details will be stored here securely.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {/* Accounts */}
            {accounts.length > 0 && (
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
                Bank Accounts
              </Text>
            )}
            {accounts.map((a) => {
              const va = vaultData?.accounts.find((v) => v.id === a.id);
              return (
                <SectionCard key={a.id} title={a.accountName?.trim() || a.nickname?.trim() || a.bank}>
                  <SecretRow
                    label="Account Number"
                    masked={maskAccountNumber({ ...a, accountNumber: va?.accountNumber ?? undefined }) || "—"}
                    full={va?.accountNumber ?? ""}
                  />
                  <SecretRow label="IFSC" masked={va?.ifsc ?? "—"} full={va?.ifsc ?? ""} />
                  <SecretRow label="Branch" masked={va?.branch ?? "—"} full={va?.branch ?? ""} />
                  <View className="flex-row items-center justify-between pt-2">
                    <Text className="text-[11px] text-dim uppercase tracking-widest">Bank</Text>
                    <Text className="text-sm text-muted">
                      {a.bank}{accountLast4(a) ? ` · •••• ${accountLast4(a)}` : ""}
                    </Text>
                  </View>
                </SectionCard>
              );
            })}

            {/* Cards — only credit cards in vault (debit cards have no stored PAN secrets) */}
            {cards.filter((c) => c.type !== "debit").length > 0 && (
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest mt-2">
                Cards
              </Text>
            )}
            {cards.filter((c) => c.type !== "debit").map((c) => {
              const vc = vaultData?.cards.find((v) => v.id === c.id);
              const fullNumber = vc?.number ?? "";
              return (
                <SectionCard key={c.id} title={c.cardName || `${c.bank} Card`}>
                  <SecretRow
                    label="Card Number"
                    masked={maskCardNumber({ ...c, number: vc?.number ?? undefined })}
                    full={formatCardNumber({ ...c, number: fullNumber }) || cardLast4(c)}
                  />
                  <SecretRow label="Card Holder" masked={vc?.cardHolder ? `${vc.cardHolder.slice(0, 1)}***` : "—"} full={vc?.cardHolder ?? ""} />
                  <View className="flex-row items-center justify-between pt-2">
                    <Text className="text-[11px] text-dim uppercase tracking-widest">Expiry</Text>
                    <Text className="text-sm text-muted">{c.expiry || "—"}</Text>
                  </View>
                  <View className="flex-row items-center justify-between pt-2">
                    <Text className="text-[11px] text-dim uppercase tracking-widest">Network · Bank</Text>
                    <Text className="text-sm text-muted">
                      {[c.network, c.bank].filter(Boolean).join(" · ") || "—"}
                    </Text>
                  </View>
                </SectionCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
