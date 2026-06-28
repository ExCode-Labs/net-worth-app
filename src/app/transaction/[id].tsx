/**
 * Transaction detail — payment-app style. Big income/expense icon, the amount,
 * and a labelled breakdown. Share renders the receipt card to a PNG and opens
 * the system share sheet (WhatsApp, etc.); Edit/Delete manage the entry.
 */
import React, { useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useTransactionStore } from "@/store/transactionStore";
import { TX_TYPE_COLORS } from "@/constants/categories";
import { fmt } from "@/utils/formatters";
import { toast } from "@/store/toastStore";
import { confirm } from "@/store/confirmStore";

const ICON: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  Expense:  "arrow-up-circle",
  Income:   "arrow-down-circle",
  Transfer: "swap-horizontal",
};

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx       = useTransactionStore((s) => s.transactions.find((t) => t.id === id));
  const remove   = useTransactionStore((s) => s.removeTransaction);
  const receipt  = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  if (!tx) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker items-center justify-center px-8 gap-3">
        <Ionicons name="receipt-outline" size={30} color="#6b7280" />
        <Text className="text-sm text-muted text-center">This transaction no longer exists.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-2 px-5 py-2.5 rounded-[12px] bg-accent-purple">
          <Text className="text-sm font-bold text-white">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const color   = TX_TYPE_COLORS[tx.type];
  const isExp   = tx.type === "Expense";
  const sign    = isExp ? "−" : tx.type === "Income" ? "+" : "";
  const d       = new Date(tx.date);
  const dateStr = d.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const rows: { label: string; value: string }[] = [
    { label: "Category", value: tx.category || "—" },
    { label: "Account",  value: [tx.bank, tx.account].filter(Boolean).join(" · ") || "—" },
    { label: "Date",     value: dateStr },
    { label: "Time",     value: timeStr },
    { label: "Type",     value: tx.type },
    { label: "Source",   value: tx.source === "manual" ? "Added manually" : "Auto-imported" },
  ];
  if (tx.note) rows.push({ label: "Note", value: tx.note });

  const handleShare = async () => {
    try {
      setSharing(true);
      const uri = await captureRef(receipt, { format: "png", quality: 1, result: "tmpfile" });
      if (!(await Sharing.isAvailableAsync())) {
        toast.error("Sharing isn't available on this device.");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share transaction" });
    } catch {
      toast.error("Couldn't create the image. Try again.");
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = () => {
    confirm({
      title: "Delete transaction",
      message: "Remove this transaction? This can't be undone.",
      confirmText: "Delete",
      destructive: true,
      onConfirm: () => { remove(tx.id); toast.success("Transaction deleted."); router.back(); },
    });
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
        <Text className="text-lg font-bold text-white">Transaction</Text>
        <TouchableOpacity
          onPress={() => router.push(`/edit-transaction?id=${tx.id}`)}
          className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="create-outline" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Captured receipt card */}
        <View ref={receipt} collapsable={false} className="mx-xl rounded-[24px] border border-white/[0.08] overflow-hidden" style={{ backgroundColor: "#0d1225" }}>
          {/* Hero */}
          <View className="items-center pt-8 pb-6 px-6" style={{ backgroundColor: color + "14" }}>
            <View className="w-[72px] h-[72px] rounded-full items-center justify-center mb-4" style={{ backgroundColor: color + "26" }}>
              <Ionicons name={ICON[tx.type] ?? "receipt"} size={42} color={color} />
            </View>
            <Text className="text-base font-semibold text-white text-center" numberOfLines={2}>
              {tx.merchant || tx.category || "Transaction"}
            </Text>
            <Text style={{ fontSize: 38, fontWeight: "800", color, marginTop: 6, letterSpacing: -1 }}>
              {sign}{fmt(tx.amount)}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: color + "1f" }}>
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              <Text className="text-xs font-semibold" style={{ color }}>{tx.type}</Text>
            </View>
          </View>

          {/* Breakdown */}
          <View className="px-6 py-5 gap-0">
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

          {/* Footer brand */}
          <View className="px-6 pb-5 pt-1 flex-row items-center justify-center gap-1.5">
            <Ionicons name="sparkles" size={12} color="#a855f7" />
            <Text className="text-[11px] text-dim font-semibold">Tracked with NetWorth</Text>
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row gap-3 px-xl mt-5">
          <TouchableOpacity
            onPress={handleShare}
            disabled={sharing}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px] py-3.5 bg-accent-purple"
            style={{ opacity: sharing ? 0.6 : 1 }}
            activeOpacity={0.85}
          >
            {sharing ? <ActivityIndicator color="#fff" /> : <Ionicons name="share-social-outline" size={18} color="#fff" />}
            <Text className="text-[15px] font-bold text-white">Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            className="flex-row items-center justify-center gap-2 rounded-[14px] py-3.5 px-5 border border-accent-red/30"
            style={{ backgroundColor: "rgba(248,113,113,0.12)" }}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={18} color="#f87171" />
            <Text className="text-[15px] font-bold text-accent-red">Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
