/**
 * Asset detail — read-only breakdown of one asset with Edit / Close / Delete.
 * Reached by tapping a row on the Assets list. "Close" archives the asset
 * (e.g. sold, matured, or — for lent money — repaid): it's kept as history but
 * drops out of net-worth totals. Edit reuses the shared Add Asset form.
 */
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useAccountStore, type Asset } from "@/store/accountStore";
import { useTransactionStore } from "@/store/transactionStore";
import { SettleSheet, accountRefLabel, txnRefLabel, txnDateLabel } from "@/components/ui/LedgerLink";
import { fmt } from "@/utils/formatters";
import { toast } from "@/store/toastStore";
import { confirm } from "@/store/confirmStore";
import { useAmountVisibilitySync } from "@/store/prefsStore";
import { ASSET_TYPES, assetSubtitle } from "../assets";

/** Labelled breakdown rows from an asset's type-specific details. */
function detailRows(a: Asset): { label: string; value: string }[] {
  const d = a.details ?? {};
  const rows: { label: string; value: string }[] = [
    { label: "Type", value: ASSET_TYPES[a.type]?.label ?? a.type },
  ];
  const push = (label: string, v: string | number | undefined, fn?: (n: number) => string) => {
    if (v === undefined || v === "" || v === null) return;
    rows.push({ label, value: typeof v === "number" && fn ? fn(v) : String(v) });
  };
  push("Quantity", d.quantity, (n) => n.toLocaleString("en-IN"));
  push("Rate", d.rate, (n) => `₹${n.toLocaleString("en-IN")}`);
  push("Bank", d.bank);
  push("Principal", d.principal, (n) => fmt(n));
  push("Interest Rate", d.interestRate, (n) => `${n}%`);
  push("Tenure", d.tenureMonths, (n) => `${n} months`);
  push("Maturity Amount", d.maturityAmount, (n) => fmt(Math.round(n)));
  push("Policy Number", d.policyNumber);
  push("Sum Assured", d.sumAssured, (n) => fmt(n));
  push("Premium", d.premium, (n) => fmt(n));
  push("Phone", d.phone);
  if (a.startDate) rows.push({ label: a.type === "lent" ? "Lent Date" : "Start date", value: new Date(a.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) });
  if (a.periodMonths) rows.push({ label: "Period", value: `${a.periodMonths} months` });
  return rows;
}

export default function AssetDetailScreen() {
  useAmountVisibilitySync();
  const { id }      = useLocalSearchParams<{ id: string }>();
  const asset       = useAccountStore((s) => s.assets.find((a) => a.id === id));
  const accounts    = useAccountStore((s) => s.accounts);
  const transactions = useTransactionStore((s) => s.transactions);
  const updateAsset = useAccountStore((s) => s.updateAsset);
  const removeAsset = useAccountStore((s) => s.removeAsset);
  const [settling, setSettling] = useState(false);

  if (!asset) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker items-center justify-center px-8 gap-3">
        <Ionicons name="trending-up-outline" size={30} color="#6b7280" />
        <Text className="text-sm text-muted text-center">This asset no longer exists.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-2 px-5 py-2.5 rounded-[12px] bg-accent-green">
          <Text className="text-sm font-bold" style={{ color: "#0a0e27" }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const meta = ASSET_TYPES[asset.type] ?? ASSET_TYPES.cash;
  const rows = detailRows(asset);
  const isLent = asset.type === "lent";
  const d = asset.details ?? {};

  // Money-movement legs: funded-from (all types), and proceeds-to once closed.
  if (d.fromAccountId) rows.push({ label: isLent ? "Paid from" : "Invested from", value: accountRefLabel(accounts, d.fromAccountId) });
  if (d.fromTxnId) {
    const tx = transactions.find((t) => t.id === d.fromTxnId);
    rows.push({ label: isLent ? "Paid txn" : "Invested txn", value: txnRefLabel(tx) });
    const when = txnDateLabel(tx);
    if (when) rows.push({ label: isLent ? "Paid on" : "Invested on", value: when });
  }
  if (asset.closed && d.toAccountId) rows.push({ label: isLent ? "Returned to" : "Proceeds to", value: accountRefLabel(accounts, d.toAccountId) });
  if (asset.closed && d.toTxnId) {
    const tx = transactions.find((t) => t.id === d.toTxnId);
    rows.push({ label: isLent ? "Return txn" : "Proceeds txn", value: txnRefLabel(tx) });
  }
  if (asset.closed && asset.closedDate) {
    rows.push({
      label: isLent ? "Returned on" : "Closed on",
      value: new Date(asset.closedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    });
  }

  const handleDelete = () => {
    confirm({
      title: "Delete asset",
      message: `Remove "${asset.name}"? This can't be undone.`,
      confirmText: "Delete",
      destructive: true,
      onConfirm: () => { removeAsset(asset.id); toast.success("Asset deleted."); router.back(); },
    });
  };

  const handleClose = () => {
    if (asset.closed) {
      updateAsset(asset.id, { closed: false, closedDate: undefined, details: { ...d, toAccountId: undefined, toTxnId: undefined } });
      toast.success(isLent ? "Marked as not returned." : "Asset reopened.");
      return;
    }
    // Capture where the money came back / proceeds went before closing.
    setSettling(true);
  };

  const handleSettle = (refs: { accountId?: string; txnId?: string; date?: string }) => {
    updateAsset(asset.id, { closed: true, closedDate: refs.date, details: { ...d, toAccountId: refs.accountId, toTxnId: refs.txnId } });
    setSettling(false);
    toast.success(isLent ? "Marked as returned." : "Asset closed.");
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
        <Text className="text-lg font-bold text-white">Asset</Text>
        <TouchableOpacity
          onPress={() => router.push(`/add-asset?id=${asset.id}`)}
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
          <View className="items-center pt-8 pb-6 px-6" style={{ backgroundColor: "rgba(74,222,128,0.08)" }}>
            <View className="w-[72px] h-[72px] rounded-full items-center justify-center mb-4" style={{ backgroundColor: "rgba(74,222,128,0.15)" }}>
              <Ionicons name={meta.icon} size={40} color="#4ade80" />
            </View>
            <Text className="text-base font-semibold text-white text-center" numberOfLines={2}>{asset.name}</Text>
            <Text style={{ fontSize: 36, fontWeight: "800", color: "#fff", marginTop: 6, letterSpacing: -1 }}>{fmt(asset.value)}</Text>
            <Text className="text-xs text-dim mt-1">{assetSubtitle(asset)}</Text>
            {asset.closed ? (
              <View className="flex-row items-center gap-1.5 mt-3 px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(156,163,175,0.18)" }}>
                <Ionicons name="archive-outline" size={12} color="#9ca3af" />
                <Text className="text-xs font-semibold text-muted">Closed</Text>
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
            className="flex-row items-center justify-center gap-2 rounded-[14px] py-3.5 border border-white/[0.1]"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            activeOpacity={0.85}
          >
            <Ionicons name={asset.closed ? "refresh-outline" : isLent ? "checkmark-circle-outline" : "archive-outline"} size={18} color="#9ca3af" />
            <Text className="text-[15px] font-bold text-secondary">
              {asset.closed ? "Reopen" : isLent ? "Mark as Returned" : "Close (sold / matured)"}
            </Text>
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
        title={isLent ? "Mark as returned" : "Close asset"}
        hint={
          isLent
            ? `Record how ${asset.name || "this"} paid you back. Optional — skip to just close it.`
            : "Record which account the proceeds went into. Optional — skip to just close it."
        }
        label={isLent ? "Returned to" : "Proceeds to"}
        confirmLabel={isLent ? "Mark as Returned" : "Close asset"}
        amount={asset.value}
        onClose={() => setSettling(false)}
        onConfirm={handleSettle}
      />
    </SafeAreaView>
  );
}
