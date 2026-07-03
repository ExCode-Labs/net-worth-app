/**
 * Full-screen transaction picker for LedgerLink's "Link a transaction". A screen
 * (not a bottom sheet) so it opens reliably even from within the settle sheet.
 * If the picked transaction's amount doesn't match the amount entered on the
 * form, it asks whether to link it anyway. Selection is delivered via
 * [[pickTxnStore]].
 */
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTransactionStore, type Transaction } from "@/store/transactionStore";
import { usePickTxnStore } from "@/store/pickTxnStore";
import { confirm } from "@/store/confirmStore";
import { fmt } from "@/utils/formatters";
import { useAmountVisibilitySync } from "@/store/prefsStore";

const matches = (amount: number, expected: number | null) =>
  expected != null && expected > 0 && Math.abs(amount - expected) < 0.01;

export default function PickTransactionScreen() {
  useAmountVisibilitySync();
  const transactions = useTransactionStore((s) => s.transactions);
  const expectedAmount = usePickTxnStore((s) => s.expectedAmount);
  const fulfill = usePickTxnStore((s) => s.fulfill);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? transactions.filter((t) =>
          (t.merchant + " " + t.category + " " + t.amount).toLowerCase().includes(needle),
        )
      : transactions;
    // Surface exact-amount matches first so the right txn is easy to find.
    return [...list]
      .sort((a, b) => Number(matches(b.amount, expectedAmount)) - Number(matches(a.amount, expectedAmount)))
      .slice(0, 100);
  }, [transactions, q, expectedAmount]);

  const choose = (item: Transaction) => {
    if (expectedAmount != null && expectedAmount > 0 && !matches(item.amount, expectedAmount)) {
      confirm({
        title: "Amount doesn't match",
        message: `That transaction is ${fmt(item.amount)}, but you entered ${fmt(expectedAmount)}. Link it anyway?`,
        confirmText: "Link anyway",
        cancelText: "Cancel",
        onConfirm: () => { fulfill(item.id); router.back(); },
      });
      return;
    }
    fulfill(item.id);
    router.back();
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      {/* Header */}
      <View className="flex-row items-center px-xl pt-3 pb-[10px] gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white flex-1">Link a transaction</Text>
      </View>

      <View className="px-xl pb-2">
        {expectedAmount != null && expectedAmount > 0 && (
          <Text className="text-xs text-dim mb-2">
            Looking for a transaction around <Text className="text-accent-purple font-semibold">{fmt(expectedAmount)}</Text>
          </Text>
        )}
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by merchant or amount"
          placeholderTextColor="#374151"
          className="rounded-[12px] px-4 py-3 text-sm text-white border border-white/10"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(t) => t.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 24 }}
        ListEmptyComponent={
          <Text className="text-sm text-muted text-center py-8">No transactions found.</Text>
        }
        renderItem={({ item }) => {
          const sign = item.type === "Expense" ? "−" : item.type === "Income" ? "+" : "";
          const color = item.type === "Expense" ? "#f87171" : item.type === "Income" ? "#4ade80" : "#9ca3af";
          const isMatch = matches(item.amount, expectedAmount);
          return (
            <TouchableOpacity
              onPress={() => choose(item)}
              className="flex-row items-center gap-3 py-3"
              style={{ borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" }}
            >
              <View className="flex-1">
                <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                  {item.merchant || item.category || item.type}
                </Text>
                <Text className="text-xs text-dim">
                  {new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  {item.bank ? ` · ${item.bank}` : ""}
                </Text>
              </View>
              {isMatch && (
                <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(74,222,128,0.14)" }}>
                  <Ionicons name="checkmark" size={11} color="#4ade80" />
                  <Text className="text-[10px] font-bold" style={{ color: "#4ade80" }}>Match</Text>
                </View>
              )}
              <Text style={{ fontSize: 14, fontWeight: "700", color }}>{sign}{fmt(item.amount)}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}
