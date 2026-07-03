/**
 * Liability detail — read-only breakdown of one liability with Edit / Close /
 * Delete. Reached by tapping a row on the Liabilities list. "Close" marks the
 * liability repaid: it's kept as history but drops out of the Total Owed and
 * net worth. Edit reuses the Add Liability form in edit mode.
 */
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useLiabilityStore } from "@/store/liabilityStore";
import { useAccountStore } from "@/store/accountStore";
import { useTransactionStore } from "@/store/transactionStore";
import { SettleSheet, accountRefLabel, txnRefLabel } from "@/components/ui/LedgerLink";
import { fmt } from "@/utils/formatters";
import { toast } from "@/store/toastStore";
import { confirm } from "@/store/confirmStore";
import { useAmountVisibilitySync } from "@/store/prefsStore";
import { LIABILITY_TYPES } from "../liabilities";

export default function LiabilityDetailScreen() {
  useAmountVisibilitySync();
  const { id }          = useLocalSearchParams<{ id: string }>();
  const liability       = useLiabilityStore((s) => s.liabilities.find((l) => l.id === id));
  const accounts        = useAccountStore((s) => s.accounts);
  const transactions    = useTransactionStore((s) => s.transactions);
  const updateLiability = useLiabilityStore((s) => s.updateLiability);
  const removeLiability = useLiabilityStore((s) => s.removeLiability);
  const [settling, setSettling] = useState(false);

  if (!liability) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker items-center justify-center px-8 gap-3">
        <Ionicons name="trending-down-outline" size={30} color="#6b7280" />
        <Text className="text-sm text-muted text-center">This liability no longer exists.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-2 px-5 py-2.5 rounded-[12px]" style={{ backgroundColor: "#f87171" }}>
          <Text className="text-sm font-bold" style={{ color: "#0a0e27" }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const meta = LIABILITY_TYPES[liability.type] ?? LIABILITY_TYPES.other;
  const isBorrow = liability.type === "borrow";
  const d = liability.details ?? {};
  const rows: { label: string; value: string }[] = [
    { label: "Type", value: meta.label },
  ];
  if (liability.lender) rows.push({ label: isBorrow ? "Lender" : "Lender / Financier", value: liability.lender });
  if (liability.emi > 0) rows.push({ label: "Monthly EMI", value: fmt(liability.emi) });
  if (liability.startDate) rows.push({ label: "Start date", value: new Date(liability.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) });
  if (liability.periodMonths) rows.push({ label: "Period", value: `${liability.periodMonths} months` });
  // Money-movement legs: where it landed, which account pays the EMI, and the
  // repayment account once closed.
  if (d.fromAccountId) rows.push({ label: isBorrow ? "Received in" : "Credited to", value: accountRefLabel(accounts, d.fromAccountId) });
  if (d.fromTxnId) rows.push({ label: isBorrow ? "Received txn" : "Credit txn", value: txnRefLabel(transactions.find((t) => t.id === d.fromTxnId)) });
  if (d.emiAccountId) rows.push({ label: "EMI paid from", value: accountRefLabel(accounts, d.emiAccountId) });
  if (d.emiTxnId) rows.push({ label: "EMI txn", value: txnRefLabel(transactions.find((t) => t.id === d.emiTxnId)) });
  if (liability.closed && d.toAccountId) rows.push({ label: "Repaid from", value: accountRefLabel(accounts, d.toAccountId) });
  if (liability.closed && d.toTxnId) rows.push({ label: "Repaid txn", value: txnRefLabel(transactions.find((t) => t.id === d.toTxnId)) });

  const handleDelete = () => {
    confirm({
      title: "Delete liability",
      message: `Remove "${liability.name}"? This can't be undone.`,
      confirmText: "Delete",
      destructive: true,
      onConfirm: () => { removeLiability(liability.id); toast.success("Liability deleted."); router.back(); },
    });
  };

  const handleClose = () => {
    if (liability.closed) {
      updateLiability(liability.id, { closed: false, details: { ...d, toAccountId: undefined, toTxnId: undefined } });
      toast.success("Liability reopened.");
      return;
    }
    // Capture which account it was repaid from (+ optional txn) before closing.
    setSettling(true);
  };

  const handleSettle = (refs: { accountId?: string; txnId?: string }) => {
    updateLiability(liability.id, { closed: true, details: { ...d, toAccountId: refs.accountId, toTxnId: refs.txnId } });
    setSettling(false);
    toast.success("Marked repaid.");
  };

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
        <Text className="text-lg font-bold text-white">Liability</Text>
        <TouchableOpacity
          onPress={() => router.push(`/add-liability?id=${liability.id}`)}
          className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="create-outline" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero card */}
        <View className="mx-xl rounded-[24px] border border-white/[0.08] overflow-hidden" style={{ backgroundColor: "#0d1225" }}>
          <View className="items-center pt-8 pb-6 px-6" style={{ backgroundColor: "rgba(248,113,113,0.08)" }}>
            <View className="w-[72px] h-[72px] rounded-full items-center justify-center mb-4" style={{ backgroundColor: "rgba(248,113,113,0.15)" }}>
              <Ionicons name={meta.icon} size={40} color="#f87171" />
            </View>
            <Text className="text-base font-semibold text-white text-center" numberOfLines={2}>{liability.name}</Text>
            <Text style={{ fontSize: 36, fontWeight: "800", color: "#f87171", marginTop: 6, letterSpacing: -1 }}>{fmt(liability.balance)}</Text>
            {liability.phone ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${liability.phone}`)} hitSlop={6} className="mt-1">
                <Text className="text-xs text-accent-purple">{liability.phone}</Text>
              </TouchableOpacity>
            ) : null}
            {liability.closed ? (
              <View className="flex-row items-center gap-1.5 mt-3 px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(74,222,128,0.18)" }}>
                <Ionicons name="checkmark-circle-outline" size={12} color="#4ade80" />
                <Text className="text-xs font-semibold text-accent-green">Repaid</Text>
              </View>
            ) : null}
          </View>

          {/* Breakdown */}
          <View className="px-6 py-5">
            {rows.map((r, i) => (
              <View
                key={r.label}
                className="flex-row items-start justify-between py-3"
                style={i < rows.length - 1 ? { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" } : undefined}
              >
                <Text className="text-[13px] text-muted">{r.label}</Text>
                <Text className="text-[13px] font-semibold text-white text-right flex-1 ml-6" numberOfLines={2}>{r.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View className="px-xl mt-5 gap-3">
          <TouchableOpacity
            onPress={handleClose}
            className="flex-row items-center justify-center gap-2 rounded-[14px] py-3.5 border"
            style={{ backgroundColor: liability.closed ? "rgba(255,255,255,0.05)" : "rgba(74,222,128,0.12)", borderColor: liability.closed ? "rgba(255,255,255,0.1)" : "rgba(74,222,128,0.3)" }}
            activeOpacity={0.85}
          >
            <Ionicons name={liability.closed ? "refresh-outline" : "checkmark-circle-outline"} size={18} color={liability.closed ? "#9ca3af" : "#4ade80"} />
            <Text className="text-[15px] font-bold" style={{ color: liability.closed ? "#9ca3af" : "#4ade80" }}>{liability.closed ? "Reopen" : "Mark as Repaid"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            className="flex-row items-center justify-center gap-2 rounded-[14px] py-3.5 border border-accent-red/30"
            style={{ backgroundColor: "rgba(248,113,113,0.12)" }}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={18} color="#f87171" />
            <Text className="text-[15px] font-bold text-accent-red">Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SettleSheet
        visible={settling}
        title="Mark as repaid"
        hint={`Record how you repaid ${liability.name || "this"}. Optional — skip to just mark it repaid.`}
        label="Repaid from"
        confirmLabel="Mark as Repaid"
        amount={liability.balance}
        onClose={() => setSettling(false)}
        onConfirm={handleSettle}
      />
    </SafeAreaView>
  );
}
