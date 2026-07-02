/**
 * Analytics — spending insights derived from transactions: a period selector, a
 * spent/earned/saved summary, an income-vs-expense monthly chart (tap a month to
 * inspect it), a category breakdown (ranked magnitude bars), and top merchants.
 * Reached from the dashboard expense card and the More menu.
 */
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTransactionStore } from "@/store/transactionStore";
import { useAmountVisibilitySync } from "@/store/prefsStore";
import { fmt, fmtShort } from "@/utils/formatters";
import { CATEGORIES } from "@/constants/categories";
import {
  monthlySeries, categoryTotals, topMerchants, periodSummary, periodStart,
  type Period,
} from "@/utils/analytics";

const PERIODS: { key: Period; label: string }[] = [
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "6M", label: "6M" },
  { key: "ALL", label: "All" },
];

const INCOME = "#4ade80";
const EXPENSE = "#f87171";

// Category → icon lookup (falls back to a generic tag).
const CAT_ICON = new Map(
  [...CATEGORIES.Expense, ...CATEGORIES.Income].map((c) => [c.name, c.icon] as const),
);

export default function AnalyticsScreen() {
  useAmountVisibilitySync();
  const transactions = useTransactionStore((s) => s.transactions);
  const [period, setPeriod] = useState<Period>("3M");
  const [selMonth, setSelMonth] = useState<number | null>(null);

  const since = useMemo(() => periodStart(period), [period]);
  const summary = useMemo(() => periodSummary(transactions, since), [transactions, since]);
  const months = useMemo(() => monthlySeries(transactions, 6), [transactions]);
  const cats = useMemo(() => categoryTotals(transactions, "Expense", since), [transactions, since]);
  const merchants = useMemo(() => topMerchants(transactions, since, 5), [transactions, since]);

  const chartMax = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const catMax = Math.max(1, ...cats.map((c) => c.total));
  const catTotal = cats.reduce((s, c) => s + c.total, 0);
  const sel = selMonth != null ? months[selMonth] : null;

  const empty = transactions.length === 0;

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      {/* Header */}
      <View className="flex-row items-center px-xl pt-3 pb-[14px] gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white flex-1">Analytics</Text>
      </View>

      {empty ? (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Ionicons name="bar-chart-outline" size={30} color="#6b7280" />
          <Text className="text-sm text-muted text-center">
            No transactions yet. Add or capture a few and your spending analytics show up here.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}>
          {/* Period selector */}
          <View className="flex-row bg-white/[0.05] rounded-[12px] p-1 border border-white/[0.08] mb-4">
            {PERIODS.map((p) => {
              const on = period === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  className="flex-1 py-2 rounded-[9px] items-center"
                  style={on ? { backgroundColor: "rgba(168,85,247,0.9)" } : undefined}
                  activeOpacity={0.8}
                >
                  <Text className="text-[13px] font-bold" style={{ color: on ? "#fff" : "#6b7280" }}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Summary */}
          <View className="flex-row gap-3 mb-5">
            <Stat label="Spent" value={summary.expense} color={EXPENSE} />
            <Stat label="Earned" value={summary.income} color={INCOME} />
            <Stat label="Saved" value={summary.net} color={summary.net >= 0 ? INCOME : EXPENSE} signed />
          </View>

          {/* Income vs Expense (last 6 months) */}
          <Card>
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-base font-bold text-white">Income vs Expense</Text>
              {/* Legend (2 series → always shown) */}
              <View className="flex-row gap-3">
                <Legend color={INCOME} label="In" />
                <Legend color={EXPENSE} label="Out" />
              </View>
            </View>
            {/* Tap-to-inspect readout */}
            <Text className="text-xs text-dim mb-3">
              {sel
                ? `${sel.label}: ${fmt(sel.income)} in · ${fmt(sel.expense)} out`
                : "Tap a month to inspect it"}
            </Text>
            <View className="flex-row items-end justify-between" style={{ height: 120 }}>
              {months.map((m, i) => {
                const active = selMonth === i;
                return (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => setSelMonth(active ? null : i)}
                    activeOpacity={0.7}
                    className="flex-1 items-center gap-1.5"
                    style={active ? { backgroundColor: "rgba(168,85,247,0.08)", borderRadius: 8 } : undefined}
                  >
                    <View className="flex-row items-end gap-[3px]" style={{ height: 96 }}>
                      <Bar pct={m.income / chartMax} color={INCOME} dim={selMonth != null && !active} />
                      <Bar pct={m.expense / chartMax} color={EXPENSE} dim={selMonth != null && !active} />
                    </View>
                    <Text className="text-[10px] font-semibold" style={{ color: active ? "#a855f7" : "#4b5563" }}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Category breakdown — ranked magnitude bars */}
          <Card>
            <Text className="text-base font-bold text-white mb-3">Where it goes</Text>
            {cats.length === 0 ? (
              <Text className="text-sm text-dim">No spending in this period.</Text>
            ) : (
              <View className="gap-3">
                {cats.slice(0, 8).map((c) => {
                  const pctOfTotal = catTotal > 0 ? Math.round((c.total / catTotal) * 100) : 0;
                  return (
                    <View key={c.label}>
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center gap-2 flex-1 pr-2">
                          <Ionicons name={CAT_ICON.get(c.label) ?? "pricetag-outline"} size={14} color="#a855f7" />
                          <Text className="text-[13px] text-secondary font-medium flex-1" numberOfLines={1}>{c.label}</Text>
                        </View>
                        <Text className="text-[13px] font-bold text-white">{fmt(c.total)}</Text>
                        <Text className="text-[11px] text-dim ml-2" style={{ width: 34, textAlign: "right" }}>{pctOfTotal}%</Text>
                      </View>
                      <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                        <View style={{ width: `${Math.max((c.total / catMax) * 100, 2)}%`, height: "100%", borderRadius: 999, backgroundColor: "#a855f7" }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          {/* Top merchants */}
          {merchants.length > 0 && (
            <Card>
              <Text className="text-base font-bold text-white mb-3">Top merchants</Text>
              <View className="gap-2.5">
                {merchants.map((m, i) => (
                  <View key={m.label} className="flex-row items-center gap-3">
                    <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(168,85,247,0.15)" }}>
                      <Text className="text-[11px] font-bold text-accent-purple">{i + 1}</Text>
                    </View>
                    <Text className="flex-1 text-[14px] text-secondary" numberOfLines={1}>{m.label}</Text>
                    <Text className="text-[14px] font-bold text-white">{fmtShort(m.total)}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────
function Stat({ label, value, color, signed }: { label: string; value: number; color: string; signed?: boolean }) {
  return (
    <View className="flex-1 bg-white/[0.05] rounded-[14px] p-3 border border-white/[0.08]">
      <Text className="text-[11px] text-muted mb-1">{label}</Text>
      <Text className="text-[16px] font-extrabold" style={{ color }} numberOfLines={1} adjustsFontSizeToFit>
        {signed && value < 0 ? "−" : ""}{fmtShort(Math.abs(value))}
      </Text>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-[18px] border border-white/[0.08] p-[18px] mb-4" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
      {children}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <Text className="text-[11px] text-dim">{label}</Text>
    </View>
  );
}

function Bar({ pct, color, dim }: { pct: number; color: string; dim: boolean }) {
  return (
    <View
      style={{
        width: 9,
        height: `${Math.max(pct * 100, pct > 0 ? 3 : 0)}%`,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        backgroundColor: color,
        opacity: dim ? 0.35 : 1,
      }}
    />
  );
}
