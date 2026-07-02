import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useUserStore } from "@/store/userStore";
import { useAuthStore } from "@/store/authStore";
import { useAccountStore, selectNetWorth, selectTotalBalance } from "@/store/accountStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useCardStore, selectTotalLimit, selectTotalUsage } from "@/store/cardStore";
import { useLiabilityStore, selectTotalLiabilities } from "@/store/liabilityStore";
import { usePrefsStore } from "@/store/prefsStore";
import { fmt, fmtSigned, fmtShort, getGreeting } from "@/utils/formatters";
import AiInsightsCard from "@/components/home/AiInsightsCard";
import type { Transaction } from "@/store/transactionStore";

// ── Real monthly-expense series (last 6 calendar months) ──────────────────────
function buildMonthlyExpense(transactions: Transaction[]) {
  const now = new Date();
  const months: { key: string; label: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-IN", { month: "short" }),
      total: 0,
    });
  }
  const idx = new Map(months.map((m, i) => [m.key, i]));
  for (const t of transactions) {
    if (t.type !== "Expense") continue;
    const d = new Date(t.date);
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) months[i].total += t.amount;
  }
  const max = Math.max(1, ...months.map((m) => m.total));
  const thisMonth = months[months.length - 1].total;
  const lastMonth = months[months.length - 2]?.total ?? 0;
  const changePct =
    lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;
  return { months, max, thisMonth, changePct };
}

// ── Quick action ──────────────────────────────────────────────────────────────
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
function QuickAction({ icon, label, bg, onPress }: { icon: IoniconName; label: string; bg: string; onPress?: () => void }) {
  return (
    <TouchableOpacity className="items-center gap-1.5" activeOpacity={0.75} onPress={onPress}>
      <View
        className="w-[54px] h-[54px] rounded-2xl items-center justify-center border border-white/[0.08]"
        style={{ backgroundColor: bg }}
      >
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      <Text className="text-xs text-secondary font-semibold">{label}</Text>
    </TouchableOpacity>
  );
}

// ── Transaction row ───────────────────────────────────────────────────────────
type TxRowItem = { id: string; icon: IoniconName; name: string; cat: string; amount: number; when: string };
const TxRow = React.memo(function TxRow({ item }: { item: TxRowItem }) {
  const pos = item.amount > 0;
  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: item.id } })}
      activeOpacity={0.7}
      className="flex-row items-center gap-3 py-3"
      style={{ borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" }}
    >
      <View
        className="w-11 h-11 rounded-[12px] items-center justify-center"
        style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
      >
        <Ionicons name={item.icon} size={22} color="#9ca3af" />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-semibold text-white mb-0.5">{item.name}</Text>
        <Text className="text-xs text-muted">{item.cat}</Text>
      </View>
      <View className="items-end">
        <Text className="text-lg font-bold mb-0.5" style={{ color: pos ? "#4ade80" : "#f87171" }}>
          {pos ? "+" : "−"}{fmt(item.amount)}
        </Text>
        <Text className="text-xs text-dim">{item.when}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { guestName, firstName } = useUserStore();
  const { isGuest }              = useAuthStore();
  const accountStore  = useAccountStore();
  const { transactions } = useTransactionStore();
  const cardStore     = useCardStore();
  const liabilityStore = useLiabilityStore();
  const hideAmounts   = usePrefsStore((s) => s.hideAmounts);
  const setHideAmounts = usePrefsStore((s) => s.setHideAmounts);

  const displayName = firstName ?? guestName ?? (isGuest ? "Guest" : "there");

  // Real values from store (fall back to 0 if not set up)
  const totalLiabilities = selectTotalLiabilities(liabilityStore);
  // Credit-card outstanding is a real debt (shown under Liabilities) → subtract.
  const cardDue       = selectTotalUsage(cardStore);
  const netWorth     = selectNetWorth(accountStore) - totalLiabilities - cardDue;
  const totalBalance = selectTotalBalance(accountStore);
  const hasRealData  =
    accountStore.accounts.length > 0 ||
    accountStore.assets.length > 0 ||
    liabilityStore.liabilities.length > 0;

  // Credit utilization from real cards
  const creditLimit = selectTotalLimit(cardStore);
  const creditUsed  = selectTotalUsage(cardStore);
  const hasCards    = cardStore.cards.length > 0;
  const creditPct   = creditLimit > 0 ? Math.round((creditUsed / creditLimit) * 100) : 0;

  const expense = useMemo(() => buildMonthlyExpense(transactions), [transactions]);
  const recentTx = useMemo(
    () => transactions.filter((t) => t.status === "confirmed").slice(0, 4),
    [transactions],
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-cosmic-darker">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>

        {/* Header */}
        <View className="flex-row justify-between items-center px-xl pt-2 pb-5">
          <View>
            <Text className="text-base text-muted mb-0.5">{getGreeting()}!</Text>
            <Text className="text-[22px] font-bold text-white">Hello, {displayName} 👋</Text>
          </View>
          <TouchableOpacity
            onPress={() => setHideAmounts(!hideAmounts)}
            accessibilityRole="switch"
            accessibilityState={{ checked: hideAmounts }}
            accessibilityLabel={hideAmounts ? "Show amounts" : "Hide amounts"}
            className="w-[42px] h-[42px] rounded-[21px] border items-center justify-center"
            style={{
              backgroundColor: hideAmounts ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)",
              borderColor: hideAmounts ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.08)",
            }}
          >
            <Ionicons
              name={hideAmounts ? "lock-closed" : "lock-open-outline"}
              size={20}
              color={hideAmounts ? "#a855f7" : "#9ca3af"}
            />
          </TouchableOpacity>
        </View>

        <View className="px-xl gap-4">

          {/* Net Worth card */}
          <View
            className="rounded-[20px] border border-accent-purple/[0.28] p-5 overflow-hidden"
            style={{ backgroundColor: "rgba(168,85,247,0.1)" }}
          >
            <View style={{ position: "absolute", top: -30, right: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(168,85,247,0.12)" }} pointerEvents="none" />
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-base text-secondary font-semibold tracking-wide">Total Net Worth</Text>
              <TouchableOpacity
                onPress={() => router.push("/badge")}
                hitSlop={8}
                className="flex-row items-center gap-1 rounded-full border border-accent-purple/30 px-2.5 py-1"
                style={{ backgroundColor: "rgba(168,85,247,0.14)" }}
              >
                <Ionicons name="ribbon-outline" size={13} color="#a855f7" />
                <Text className="text-[11px] font-bold text-accent-purple">Badge</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row justify-between items-end">
              <View className="flex-1">
                <Text style={{ fontSize: 30, fontWeight: "800", color: "#fff", marginBottom: 8 }}>
                  {fmtSigned(netWorth)}
                </Text>
                {hasRealData ? (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="wallet-outline" size={11} color="#a855f7" />
                    <Text className="text-xs text-accent-purple font-semibold">
                      {accountStore.accounts.length} account{accountStore.accounts.length !== 1 ? "s" : ""} · {accountStore.assets.length} asset{accountStore.assets.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                ) : (
                  <View
                    className="flex-row items-center rounded-full px-[10px] py-1 self-start"
                    style={{ backgroundColor: "rgba(168,85,247,0.13)" }}
                  >
                    <Ionicons name="add-circle-outline" size={11} color="#a855f7" />
                    <Text className="text-xs text-accent-purple font-semibold"> Add accounts to get started</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Accounts Overview */}
          <View
            className="rounded-[18px] border border-white/[0.08] p-[18px]"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <View className="flex-row justify-between items-center mb-[14px]">
              <Text className="text-xl font-bold text-white">Accounts Overview</Text>
              <TouchableOpacity onPress={() => router.push("/accounts")}><Text className="text-base text-accent-purple font-semibold">See All</Text></TouchableOpacity>
            </View>

            <View className="flex-row gap-3 mb-4">
              <View
                className="flex-1 rounded-[12px] p-[14px] border border-white/[0.08]"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                <Text className="text-xs text-muted mb-1.5">Total Balance</Text>
                <Text className="text-xl font-bold text-white">{fmtSigned(totalBalance)}</Text>
              </View>
              <View
                className="flex-1 rounded-[12px] p-[14px] border border-white/[0.08]"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                <Text className="text-xs text-muted mb-1.5">Credit Utilization</Text>
                {hasCards ? (
                  <>
                    <Text className="text-xl font-bold text-white">{creditPct}%</Text>
                    <Text className="text-xs text-dim mt-0.5 mb-2">of {fmtShort(creditLimit)}</Text>
                    <View className="h-1 rounded-[2px]" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                      <View
                        style={{ width: `${creditPct}%`, height: 4, borderRadius: 2, backgroundColor: creditPct > 70 ? "#f87171" : "#a855f7" }}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <Text className="text-xl font-bold text-white">—</Text>
                    <Text className="text-xs text-dim mt-0.5">No cards added</Text>
                  </>
                )}
              </View>
            </View>

            <View className="flex-row justify-between">
              <QuickAction icon="wallet-outline"        label="Accounts"    bg="rgba(59,130,246,0.25)" onPress={() => router.push("/accounts")} />
              <QuickAction icon="card-outline"          label="Cards"       bg="rgba(168,85,247,0.25)" onPress={() => router.push("/analytics")} />
              <QuickAction icon="trending-up-outline"   label="Assets"      bg="rgba(74,222,128,0.2)" onPress={() => router.push("/assets")} />
              <QuickAction icon="trending-down-outline" label="Liabilities" bg="rgba(248,113,113,0.2)" onPress={() => router.push("/liabilities")} />
            </View>
          </View>

          <AiInsightsCard />

          {/* Monthly Expense */}
          <View
            className="rounded-[18px] border border-white/[0.08] p-[18px]"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <View className="flex-row justify-between items-center mb-[14px]">
              <Text className="text-xl font-bold text-white">Monthly Expense</Text>
              {expense.changePct !== null && (
                <View
                  className="flex-row items-center rounded-full px-2 py-[3px]"
                  style={{ backgroundColor: expense.changePct >= 0 ? "rgba(248,113,113,0.12)" : "rgba(74,222,128,0.12)" }}
                >
                  <Ionicons
                    name={expense.changePct >= 0 ? "trending-up" : "trending-down"}
                    size={10}
                    color={expense.changePct >= 0 ? "#f87171" : "#4ade80"}
                  />
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: expense.changePct >= 0 ? "#f87171" : "#4ade80" }}
                  >
                    {" "}{Math.abs(expense.changePct).toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 4 }}>
              {fmt(expense.thisMonth)}
            </Text>
            {expense.changePct !== null ? (
              <Text
                className="text-xs mb-4"
                style={{ color: expense.changePct >= 0 ? "#f87171" : "#4ade80" }}
              >
                {expense.changePct >= 0 ? "▲" : "▼"} {Math.abs(expense.changePct).toFixed(1)}% from last month
              </Text>
            ) : (
              <Text className="text-xs text-dim mb-4">No expenses recorded yet</Text>
            )}

            <View className="flex-row items-end gap-2" style={{ height: 108 }}>
              {expense.months.map((b, i) => {
                const last = i === expense.months.length - 1;
                const pct  = expense.max > 0 ? b.total / expense.max : 0;
                return (
                  <View key={b.key} className="flex-1 items-center gap-1.5">
                    {/* Selective direct label — only the current month, never every bar */}
                    <Text
                      className="text-[9px] font-bold"
                      style={{ color: "#a855f7", opacity: last && b.total > 0 ? 1 : 0 }}
                      numberOfLines={1}
                    >
                      {fmtShort(b.total)}
                    </Text>
                    {/* Track + fill: magnitude is the height; the bar is one hue,
                        with the current month solid to mark "now" (not magnitude). */}
                    <View
                      className="w-full justify-end overflow-hidden rounded-t-[6px]"
                      style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.05)" }}
                    >
                      <View
                        style={{
                          width: "100%",
                          height: `${Math.max(pct * 100, b.total > 0 ? 4 : 0)}%`,
                          borderTopLeftRadius: 6,
                          borderTopRightRadius: 6,
                          backgroundColor: last ? "#a855f7" : "rgba(168,85,247,0.28)",
                        }}
                      />
                    </View>
                    <Text
                      className="text-[9px] font-semibold"
                      style={{ color: last ? "#a855f7" : "#4b5563" }}
                    >
                      {b.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Recent Transactions */}
          <View
            className="rounded-[18px] border border-white/[0.08] p-[18px]"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <View className="flex-row justify-between items-center mb-[14px]">
              <Text className="text-xl font-bold text-white">Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push("/transactions")}><Text className="text-base text-accent-purple font-semibold">See All</Text></TouchableOpacity>
            </View>
            {recentTx.length > 0 ? (
              recentTx.map((tx) => (
                <TxRow
                  key={tx.id}
                  item={{
                    id:     tx.id,
                    icon:   "receipt-outline",
                    name:   tx.merchant,
                    cat:    tx.category,
                    amount: tx.type === "Expense" ? -tx.amount : tx.amount,
                    when:   new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
                  }}
                />
              ))
            ) : (
              <View className="items-center py-6 gap-2">
                <Ionicons name="receipt-outline" size={28} color="#4b5563" />
                <Text className="text-sm text-muted text-center">
                  No transactions yet. They&apos;ll appear here automatically from your bank alerts.
                </Text>
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
