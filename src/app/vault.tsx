/**
 * Vault — the one screen that reveals full stored secrets (card numbers,
 * account numbers, IFSC, holder names). Everywhere else in the app these are
 * masked to the last 4 digits.
 *
 * Protection: the whole app sits behind LockGate (see _layout). When app lock
 * is enabled the LockScreen overlay guards this page like every other. Values
 * start hidden and are revealed per-item on tap; tap a value to copy it.
 *
 * CVV is never stored, so it never appears here.
 */
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
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
import { toast } from "@/store/toastStore";

// ── A single revealable secret row ──────────────────────────────────────────
function SecretRow({
  label,
  masked,
  full,
}: {
  label: string;
  masked: string;
  full: string;
}) {
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

export default function VaultScreen() {
  const accounts = useAccountStore((s) => s.accounts);
  const cards    = useCardStore((s) => s.cards);

  const isEmpty = accounts.length === 0 && cards.length === 0;

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
        <View style={{ width: 38 }} />
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
            {accounts.map((a) => (
              <SectionCard key={a.id} title={a.accountName?.trim() || a.nickname?.trim() || a.bank}>
                <SecretRow
                  label="Account Number"
                  masked={maskAccountNumber(a) || "—"}
                  full={a.accountNumber ?? ""}
                />
                <SecretRow label="IFSC" masked={a.ifsc ?? ""} full={a.ifsc ?? ""} />
                <SecretRow label="Branch" masked={a.branch ?? ""} full={a.branch ?? ""} />
                <View className="flex-row items-center justify-between pt-2">
                  <Text className="text-[11px] text-dim uppercase tracking-widest">Bank</Text>
                  <Text className="text-sm text-muted">
                    {a.bank}{accountLast4(a) ? ` · •••• ${accountLast4(a)}` : ""}
                  </Text>
                </View>
              </SectionCard>
            ))}

            {/* Cards */}
            {cards.length > 0 && (
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest mt-2">
                Cards
              </Text>
            )}
            {cards.map((c) => (
              <SectionCard key={c.id} title={c.cardName || `${c.bank} Card`}>
                <SecretRow
                  label="Card Number"
                  masked={maskCardNumber(c)}
                  full={formatCardNumber(c) || cardLast4(c)}
                />
                <SecretRow label="Card Holder" masked={c.cardHolder ?? ""} full={c.cardHolder ?? ""} />
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
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
